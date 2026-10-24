import { Queue } from 'bullmq';
import { bullmqRedisConnection } from '../config/redis.js';

export const WEBHOOK_DISPATCH_QUEUE_NAME = 'webhook-dispatch-queue';

export interface WebhookDispatchJobData {
  event: string; // e.g. 'email.delivered', 'email.bounced', 'email.complaint'
  domainId?: string | null;
  payload: Record<string, unknown>;
}

export const webhookDispatchQueue = new Queue<WebhookDispatchJobData>(
  WEBHOOK_DISPATCH_QUEUE_NAME,
  {
    connection: bullmqRedisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 200,
      removeOnFail: 1000,
    },
  }
);

/**
 * Enqueues a webhook event notification job.
 */
export const enqueueWebhookDispatch = async (
  event: string,
  payload: Record<string, unknown>,
  domainId?: string | null
): Promise<void> => {
  await webhookDispatchQueue.add(
    'dispatch-webhook',
    { event, domainId, payload },
    {
      jobId: `webhook-${event}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }
  );
};
