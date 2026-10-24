import { prisma } from '../../config/db.js';
import { generateWebhookSecret } from '../../utils/crypto.js';
import { enqueueWebhookDispatch } from '../../queues/webhookDispatch.queue.js';
import {
  CreateWebhookSubscriptionInput,
  InboundBounceInput,
} from './webhooks.schema.js';
import { EmailStatus, SuppressionReason } from '@prisma/client';
import { SuppressionsService } from '../suppressions/suppressions.service.js';

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
