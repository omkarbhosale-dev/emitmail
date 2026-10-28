import { Worker, Job } from 'bullmq';
import { simpleParser, AddressObject, EmailAddress } from 'mailparser';
import crypto from 'node:crypto';
import { bullmqRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { InboundEmailDirection } from '@prisma/client';

export interface InboundEmailJobData {
  rawMimeBase64: string;
  envelopeFrom: string;
  envelopeTo: string[];
  remoteAddress?: string;
  receivedAt: string;
}

export const processInboundEmailJob = async (job: Job<InboundEmailJobData>): Promise<void> => {
  const { rawMimeBase64, envelopeFrom, envelopeTo } = job.data;
  const rawBuffer = Buffer.from(rawMimeBase64, 'base64');

  const parsed = await simpleParser(rawBuffer);

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

  const attachments = (parsed.attachments || []).map((att) => ({
    filename: att.filename || 'attachment',
    contentType: att.contentType || 'application/octet-stream',
    size: att.size || att.content.length,
    contentId: att.cid || undefined,
    contentBase64:
      att.content.length <= 5 * 1024 * 1024 ? att.content.toString('base64') : undefined,
  }));

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

  let threadId: string = crypto.randomUUID();
  const searchMessageIds: string[] = [];
  if (inReplyTo) searchMessageIds.push(inReplyTo);
  if (references.length > 0) searchMessageIds.push(...references);

  if (searchMessageIds.length > 0) {
    const parentEmail = await prisma.inboundEmail.findFirst({
      where: {
        mailboxId: targetMailbox.id,
        messageId: { in: searchMessageIds },
      },
      orderBy: { receivedAt: 'desc' },
    });

    if (parentEmail) {
      threadId = parentEmail.threadId;
      if (parentEmail.isArchived) {
        await prisma.inboundEmail.updateMany({
          where: { threadId },
          data: { isArchived: false },
        });
      }
    }
  }

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

  console.log(`✅ [Worker] InboundEmail ${createdEmail.id} saved in Mailbox ${targetMailbox.emailAddress}`);
};

export const createInboundEmailWorker = (): Worker<InboundEmailJobData> => {
  const queueName = env.INBOUND_EMAIL_QUEUE_NAME || 'inbound-email';
  const worker = new Worker<InboundEmailJobData>(
    queueName,
    async (job: Job<InboundEmailJobData>) => {
      await processInboundEmailJob(job);
    },
    {
      connection: bullmqRedisConnection,
      concurrency: 5,
    }
  );

  return worker;
};
