import { Worker, Job } from 'bullmq';
import { simpleParser, AddressObject, EmailAddress } from 'mailparser';
import crypto from 'node:crypto';
import { bullmqRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { InboundEmailJobData, INBOUND_EMAIL_QUEUE_NAME } from './inboundEmail.queue.js';
import { enqueueWebhookDispatch } from './webhookDispatch.queue.js';
import { InboundEmailDirection } from '@prisma/client';

export const processInboundEmailJob = async (job: Job<InboundEmailJobData>): Promise<void> => {
  const { rawMimeBase64, envelopeFrom, envelopeTo } = job.data;
  const rawBuffer = Buffer.from(rawMimeBase64, 'base64');

  // 1. Parse raw MIME with mailparser
  const parsed = await simpleParser(rawBuffer);

  // 2. Extract and format fields
  const fromName = parsed.from?.value?.[0]?.name || '';
  const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || envelopeFrom || 'unknown@sender.com';

  const formatAddresses = (
    addrOrAddrs: AddressObject | AddressObject[] | undefined
  ): Array<{ name?: string; address: string }> => {
    if (!addrOrAddrs) return [];
    const list = Array.isArray(addrOrAddrs) ? addrOrAddrs : [addrOrAddrs];
    return list.flatMap((obj) =>
      (obj.value || []).map((v: EmailAddress) => ({
        name: v.name || undefined,
        address: (v.address || '').toLowerCase().trim(),
      }))
    );
  };

  const toAddresses = formatAddresses(parsed.to);
  const ccAddresses = formatAddresses(parsed.cc);
  const replyTo = parsed.replyTo?.value?.[0]?.address?.toLowerCase() || null;
  const subject = parsed.subject || '(No Subject)';
  const textBody = parsed.text || '';
  const htmlBody = typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml || '');
  const snippet = (textBody || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const messageId = parsed.messageId || `<inbound-${crypto.randomUUID()}@emitmail>`;
  const inReplyTo = parsed.inReplyTo || null;
  const references = Array.isArray(parsed.references)
    ? parsed.references
    : parsed.references
      ? [parsed.references]
      : [];

  // 3. Serialize raw headers into a key-value record
  const rawHeaders: Record<string, string> = {};
  if (parsed.headers) {
    for (const [key, value] of parsed.headers.entries()) {
      if (typeof value === 'string') {
        rawHeaders[key] = value;
      } else if (value && typeof value === 'object' && 'value' in value) {
        rawHeaders[key] = String((value as { value: unknown }).value);
      } else {
        rawHeaders[key] = JSON.stringify(value);
      }
    }
  }

  // 4. Attachment serialization (under 5MB base64 encoded for instant dashboard downloads)
  const attachments = (parsed.attachments || []).map((att) => ({
    filename: att.filename || 'attachment',
    contentType: att.contentType || 'application/octet-stream',
    size: att.size || att.content.length,
    contentId: att.cid || undefined,
    contentBase64:
      att.content.length <= 5 * 1024 * 1024 ? att.content.toString('base64') : undefined,
  }));

  // 5. Match Mailbox target
  // We check envelope recipients first, then To: addresses
  const candidateRecipients = [
    ...envelopeTo.map((e) => e.toLowerCase().trim()),
    ...toAddresses.map((t) => t.address.toLowerCase().trim()),
  ];

  let targetMailbox = null;

  for (const rcpt of candidateRecipients) {
    if (!rcpt || !rcpt.includes('@')) continue;
    const domainPart = rcpt.slice(rcpt.lastIndexOf('@') + 1);

    let mailbox = await prisma.mailbox.findFirst({
      where: {
        emailAddress: rcpt,
        isActive: true,
      },
      include: {
        domain: true,
      },
    });

    if (!mailbox) {
      mailbox = await prisma.mailbox.findFirst({
        where: {
          domain: {
            domainName: { equals: domainPart, mode: 'insensitive' },
            status: 'VERIFIED',
          },
          isCatchAll: true,
          isActive: true,
        },
        include: {
          domain: true,
        },
      });
    }

    if (mailbox) {
      targetMailbox = mailbox;
      break;
    }
  }

  if (!targetMailbox) {
    console.warn(`⚠️ [InboundWorker] No active mailbox found for recipients: ${candidateRecipients.join(', ')}. Dropping message.`);
    return;
  }

  // 6. Thread Resolution: Check if this email is part of an existing conversation
  let threadId: string = crypto.randomUUID();
  let parentEmail = null;

  const searchMessageIds: string[] = [];
  if (inReplyTo) searchMessageIds.push(inReplyTo);
  if (references.length > 0) searchMessageIds.push(...references);

  if (searchMessageIds.length > 0) {
    parentEmail = await prisma.inboundEmail.findFirst({
      where: {
        mailboxId: targetMailbox.id,
        messageId: { in: searchMessageIds },
      },
      orderBy: { receivedAt: 'desc' },
    });

    if (parentEmail) {
      threadId = parentEmail.threadId;

      // If parent thread was archived, unarchive it so new replies pop back to top of Inbox
      if (parentEmail.isArchived) {
        await prisma.inboundEmail.updateMany({
          where: { threadId },
          data: { isArchived: false },
        });
      }
    }
  }

  // 7. Store in InboundEmail and update parent Mailbox statistics in a transaction
  const [createdEmail] = await prisma.$transaction([
    prisma.inboundEmail.create({
      data: {
        mailboxId: targetMailbox.id,
        domainId: targetMailbox.domainId,
        threadId,
        messageId,
        inReplyTo,
        references,
        fromAddress,
        fromName: fromName || null,
        toAddresses: toAddresses as any,
        ccAddresses: ccAddresses as any,
        replyTo,
        subject,
        snippet,
        textBody: textBody || null,
        htmlBody: htmlBody || null,
        rawHeaders: rawHeaders as any,
        attachments: attachments as any,
        sizeBytes: rawBuffer.length,
        isRead: false,
        isStarred: false,
        isArchived: false,
        isTrash: false,
        direction: InboundEmailDirection.INBOUND,
        receivedAt: new Date(),
      },
    }),
    prisma.mailbox.update({
      where: { id: targetMailbox.id },
      data: {
        unreadCount: { increment: 1 },
        totalMessages: { increment: 1 },
        lastMessageAt: new Date(),
      },
    }),
  ]);

  console.log(`✅ [InboundWorker] Stored InboundEmail ${createdEmail.id} in Mailbox ${targetMailbox.emailAddress} (Thread: ${threadId})`);

  // 8. Trigger Webhook Event if subscribed
  try {
    await enqueueWebhookDispatch(
      'inbound.email.received',
      {
        id: createdEmail.id,
        mailboxId: targetMailbox.id,
        emailAddress: targetMailbox.emailAddress,
        threadId,
        messageId,
        from: { name: fromName, address: fromAddress },
        to: toAddresses,
        subject,
        snippet,
        hasAttachments: attachments.length > 0,
        receivedAt: createdEmail.receivedAt.toISOString(),
      },
      targetMailbox.domainId
    );
  } catch (webhookErr) {
    console.warn('⚠️ [InboundWorker] Could not enqueue inbound webhook event:', webhookErr);
  }
};

/**
 * Initializes and starts the Inbound Email BullMQ worker.
 */
export const createInboundEmailWorker = (): Worker<InboundEmailJobData> => {
  const worker = new Worker<InboundEmailJobData>(
    INBOUND_EMAIL_QUEUE_NAME,
    async (job: Job<InboundEmailJobData>) => {
      await processInboundEmailJob(job);
    },
    {
      connection: bullmqRedisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job: Job<InboundEmailJobData>) => {
    console.log(`🎉 [InboundWorker] Job #${job.id} processed successfully.`);
  });

  worker.on('failed', (job: Job<InboundEmailJobData> | undefined, err: Error) => {
    console.error(`❌ [InboundWorker] Job #${job?.id || 'unknown'} failed:`, err);
  });

  return worker;
};
