import { Worker, Job } from 'bullmq';
import { bullmqRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { signHmacSha256 } from '../utils/crypto.js';
import {
  WEBHOOK_DISPATCH_QUEUE_NAME,
  WebhookDispatchJobData,
} from './webhookDispatch.queue.js';
import crypto from 'node:crypto';

export const processWebhookDispatchJob = async (
  job: Job<WebhookDispatchJobData>
): Promise<void> => {
  const { event, domainId, payload } = job.data;

  // Find matching active webhook subscriptions (matching domainId or global subscriptions where domainId is null)
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      isActive: true,
      events: {
        has: event,
      },
      OR: [
        { domainId: null },
        ...(domainId ? [{ domainId }] : []),
      ],
    },
  });

  if (subscriptions.length === 0) {
    return;
  }

  const deliveryTimestamp = new Date().toISOString();
  const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`;

  const envelope = {
    id: eventId,
    event,
    timestamp: deliveryTimestamp,
    data: payload,
  };

  const rawBody = JSON.stringify(envelope);

  // Dispatch to each matching endpoint
  for (const subscription of subscriptions) {
    const signature = `sha256=${signHmacSha256(rawBody, subscription.secret)}`;

    let statusCode: number | null = null;
    let responseBody = '';
    let isSuccess = false;
    let lastError: string | null = null;

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EmitMail-Webhook-Dispatcher/1.0',
          'X-EmitMail-Signature': signature,
          'X-EmitMail-Event': event,
          'X-EmitMail-Delivery': eventId,
        },
        body: rawBody,
        signal: AbortSignal.timeout(10000), // 10-second request timeout
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
      isSuccess = response.ok;

      if (!response.ok) {
        lastError = `Target endpoint responded with HTTP status ${response.status}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    // Record delivery attempt in database
    await prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscription.id,
        event,
        payload: envelope as any,
        statusCode,
        responseBody: responseBody.slice(0, 2000), // store up to 2KB response
        attempts: job.attemptsMade + 1,
        success: isSuccess,
        lastError,
      },
    });

    if (!isSuccess) {
      throw new Error(
        `Webhook delivery to ${subscription.url} failed: ${lastError} (HTTP ${statusCode})`
      );
    }
  }
};

export const createWebhookDispatchWorker = (): Worker<WebhookDispatchJobData> => {
  const worker = new Worker<WebhookDispatchJobData>(
    WEBHOOK_DISPATCH_QUEUE_NAME,
    processWebhookDispatchJob,
    {
      connection: bullmqRedisConnection,
      concurrency: 10,
    }
  );

  worker.on('failed', (job, err) => {
    console.warn(
      `⚠️ [WebhookDispatchWorker] Delivery job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}): ${err.message}`
    );
  });

  return worker;
};
