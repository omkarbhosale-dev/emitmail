import { prisma } from '../../config/db.js';
import { generateWebhookSecret, signHmacSha256 } from '../../utils/crypto.js';
import { enqueueWebhookDispatch } from '../../queues/webhookDispatch.queue.js';
import {
  CreateWebhookSubscriptionInput,
  UpdateWebhookSubscriptionInput,
  InboundBounceInput,
} from './webhooks.schema.js';
import { EmailStatus, SuppressionReason } from '@prisma/client';
import { SuppressionsService } from '../suppressions/suppressions.service.js';
import crypto from 'node:crypto';

export class WebhooksService {
  /**
   * Registers a target webhook endpoint.
   */
  static async createSubscription(
    input: CreateWebhookSubscriptionInput,
    scopedDomainId?: string | null
  ) {
    const secret = input.secret || generateWebhookSecret();
    const domainId = scopedDomainId || input.domainId || null;

    if (domainId) {
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
      });
      if (!domain) {
        throw new Error(`Domain with ID "${domainId}" not found`);
      }
    }

    const subscription = await prisma.webhookSubscription.create({
      data: {
        url: input.url,
        events: input.events,
        secret,
        domainId,
        isActive: true,
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
          },
        },
      },
    });

    return subscription;
  }

  /**
   * Lists webhook subscriptions.
   */
  static async listSubscriptions(scopedDomainId?: string | null) {
    const where: any = {};
    if (scopedDomainId) {
      where.OR = [{ domainId: scopedDomainId }, { domainId: null }];
    }

    const subscriptions = await prisma.webhookSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    return subscriptions;
  }

  /**
   * Retrieves a single webhook subscription.
   */
  static async getSubscription(id: string, scopedDomainId?: string | null) {
    const subscription = await prisma.webhookSubscription.findUnique({
      where: { id },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!subscription) return null;

    if (scopedDomainId && subscription.domainId && subscription.domainId !== scopedDomainId) {
      throw new Error('Access denied: Webhook does not belong to the scoped domain');
    }

    return subscription;
  }

  /**
   * Updates an existing webhook subscription (e.g. toggle events or active status).
   */
  static async updateSubscription(
    id: string,
    input: UpdateWebhookSubscriptionInput,
    scopedDomainId?: string | null
  ) {
    const existing = await prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    if (scopedDomainId && existing.domainId && existing.domainId !== scopedDomainId) {
      throw new Error('Access denied: Webhook does not belong to the scoped domain');
    }

    const updated = await prisma.webhookSubscription.update({
      where: { id },
      data: {
        ...(input.events ? { events: input.events } : {}),
        ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
        ...(input.url ? { url: input.url } : {}),
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Deletes a webhook subscription.
   */
  static async deleteSubscription(id: string, scopedDomainId?: string | null) {
    const existing = await prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    if (scopedDomainId && existing.domainId && existing.domainId !== scopedDomainId) {
      throw new Error('Access denied: Webhook does not belong to the scoped domain');
    }

    await prisma.webhookSubscription.delete({
      where: { id },
    });

    return existing;
  }

  /**
   * Live test dispatch to a target webhook endpoint.
   */
  static async testSubscription(
    id: string,
    event = 'email.delivered',
    scopedDomainId?: string | null
  ) {
    const subscription = await this.getSubscription(id, scopedDomainId);
    if (!subscription) {
      return null;
    }

    const eventId = `evt_test_${crypto.randomBytes(12).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const domainName = subscription.domain?.domainName || 'emitmail.local';

    const envelope = {
      id: eventId,
      event,
      timestamp,
      data: {
        test: true,
        messageId: `msg_test_${crypto.randomBytes(8).toString('hex')}`,
        recipient: `test-receiver@${domainName}`,
        domain: domainName,
        status: 'delivered',
        timestamp,
      },
    };

    const rawBody = JSON.stringify(envelope);
    const signature = `sha256=${signHmacSha256(rawBody, subscription.secret)}`;

    let statusCode: number | null = null;
    let statusText = '';
    let responseBody = '';
    let isSuccess = false;
    let lastError: string | null = null;
    const startMs = Date.now();
    let latencyMs = 0;

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

      latencyMs = Date.now() - startMs;
      statusCode = response.status;
      statusText = response.statusText || (response.ok ? 'OK' : 'Error');
      responseBody = await response.text().catch(() => '');
      isSuccess = response.ok;

      if (!response.ok) {
        lastError = `Target endpoint responded with HTTP ${response.status}: ${responseBody.slice(0, 200)}`;
      }
    } catch (err) {
      latencyMs = Date.now() - startMs;
      lastError = err instanceof Error ? err.message : String(err);
      statusText = 'Connection Failed';
    }

    // Save test delivery record in database
    const delivery = await prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscription.id,
        event,
        payload: envelope as any,
        statusCode,
        responseBody: responseBody.slice(0, 2000),
        attempts: 1,
        success: isSuccess,
        lastError,
      },
    });

    return {
      deliveryId: delivery.id,
      url: subscription.url,
      event,
      success: isSuccess,
      statusCode: statusCode || 0,
      statusText,
      latencyMs,
      payload: envelope,
      responseBody: responseBody.slice(0, 1000),
      lastError,
      timestamp,
    };
  }

  /**
   * Lists delivery logs for subscriptions.
   */
  static async listDeliveries(subscriptionId?: string, scopedDomainId?: string | null) {
    const where: any = {};
    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }
    if (scopedDomainId) {
      where.subscription = {
        OR: [{ domainId: scopedDomainId }, { domainId: null }],
      };
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        subscription: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    return deliveries;
  }

  /**
   * Ingests delivery status notification (DSN) bounce reports from Postfix, Haraka, or inbound pipes.
   */
  static async ingestInboundBounce(input: InboundBounceInput) {
    let cleanMessageId = input.messageId?.trim();
    if (cleanMessageId) {
      cleanMessageId = cleanMessageId.replace(/^<|>$/g, '');
    }

    let email = null;

    if (input.emailId) {
      email = await prisma.email.findUnique({
        where: { id: input.emailId },
        include: { domain: true },
      });
    }

    if (!email && cleanMessageId) {
      email = await prisma.email.findFirst({
        where: {
          OR: [
            { messageId: cleanMessageId },
            { messageId: `<${cleanMessageId}>` },
            { id: cleanMessageId },
          ],
        },
        include: { domain: true },
      });
    }

    // Check if hard bounce (5.x.x or hard) or complaint for auto-suppression
    const isComplaint =
      input.bounceType === 'complaint' ||
      input.bounceType === 'abuse' ||
      /complaint|abuse|feedback loop|spam/i.test(input.diagnosticCode);

    const isHardBounce =
      input.bounceType === 'hard' ||
      /\b5\.\d+\.\d+\b|\b55\d\b|user unknown|mailbox unavailable|does not exist/i.test(
        input.diagnosticCode
      );

    let suppressionRecord = null;
    if (isComplaint || isHardBounce) {
      const reason = isComplaint ? SuppressionReason.COMPLAINT : SuppressionReason.HARD_BOUNCE;
      try {
        suppressionRecord = await SuppressionsService.createSuppression({
          domainId: email?.domainId || null,
          email: input.recipient,
          reason,
          details: input.diagnosticCode || `Inbound bounce DSN: ${input.bounceType}`,
        });
      } catch (err) {
        console.warn(`⚠️ [InboundBounce] Suppression insertion failed for ${input.recipient}:`, err);
      }
    }

    if (!email) {
      // If email record cannot be located, we still queue a generic bounce/complaint event
      console.warn(
        `⚠️ [InboundBounce] Received bounce for unknown messageId "${cleanMessageId}" / recipient "${input.recipient}"`
      );

      const eventType = isComplaint ? 'email.complaint' : 'email.bounced';
      await enqueueWebhookDispatch(
        eventType as any,
        {
          messageId: cleanMessageId || null,
          recipient: input.recipient,
          bounceType: input.bounceType,
          diagnosticCode: input.diagnosticCode,
          source: input.source,
          suppressed: !!suppressionRecord,
          bouncedAt: new Date().toISOString(),
        },
        null
      );

      return {
        acknowledged: true,
        matched: false,
        recipient: input.recipient,
        bounceType: input.bounceType,
        suppressed: !!suppressionRecord,
      };
    }

    // Update Email record
    const updated = await prisma.email.update({
      where: { id: email.id },
      data: {
        status: EmailStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason: input.diagnosticCode,
        bounceType: input.bounceType,
      },
    });

    // Enqueue webhook notification
    const eventType = isComplaint ? 'email.complaint' : 'email.bounced';
    await enqueueWebhookDispatch(
      eventType as any,
      {
        emailId: email.id,
        messageId: email.messageId,
        to: email.to,
        from: email.from,
        domainId: email.domainId,
        domain: email.domain.domainName,
        recipient: input.recipient,
        bounceType: input.bounceType,
        diagnosticCode: input.diagnosticCode,
        source: input.source,
        suppressed: !!suppressionRecord,
        bouncedAt: updated.bouncedAt?.toISOString() || new Date().toISOString(),
      },
      email.domainId
    );

    return {
      acknowledged: true,
      matched: true,
      emailId: email.id,
      messageId: email.messageId,
      status: EmailStatus.BOUNCED,
      bounceType: input.bounceType,
      suppressed: !!suppressionRecord,
    };
  }
}
