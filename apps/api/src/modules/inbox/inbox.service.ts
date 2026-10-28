import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
  CreateMailboxInput,
  UpdateMailboxInput,
  ListMailboxesQuery,
  ListMessagesQuery,
  UpdateMessageInput,
  SendMailboxEmailInput,
  ReplyMessageInput,
  SimulateInboundInput,
} from './inbox.schema.js';
import { enqueueInboundEmail } from '../../queues/inboundEmail.queue.js';
import { enqueueEmailDispatch } from '../../queues/emailDispatch.queue.js';
import { InboundEmailDirection, EmailStatus } from '@prisma/client';

export class InboxService {
  /**
   * Helper to resolve the configured mail server exchange hostname.
   */
  private static getExpectedExchange(): string {
    return (
      process.env.SMTP_EHLO_HOSTNAME ||
      env.SMTP_EHLO_HOSTNAME ||
      env.MAIL_SERVER_HOSTNAME
    ).toLowerCase().replace(/\.$/, '');
  }

  /**
   * List all verified domains ready for inbound MX configuration.
   */
  static async listInboundDomains() {
    const domains = await prisma.domain.findMany({
      where: {
        status: 'VERIFIED',
      },
      select: {
        id: true,
        domainName: true,
        inboundEnabled: true,
        inboundMxVerified: true,
        createdAt: true,
      },
      orderBy: { domainName: 'asc' },
    });

    const expectedExchange = this.getExpectedExchange();

    return domains.map((d) => ({
      ...d,
      requiredMxRecord: {
        type: 'MX',
        host: '@',
        value: expectedExchange,
        priority: 10,
        ttl: 'Auto',
        status: d.inboundMxVerified ? 'VERIFIED' : 'PENDING',
      },
    }));
  }

  /**
   * Verifies the root domain's Inbound MX record against DNS.
   */
  static async verifyDomainInboundMx(domainId: string) {
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new Error('Domain not found');
    }

    if (domain.status !== 'VERIFIED') {
      throw new Error('Domain must be verified before configuring Inbound MX records');
    }

    const expectedExchange = this.getExpectedExchange();
    let mxRecords: Awaited<ReturnType<typeof dns.resolveMx>> = [];
    let isMatched = false;
    let matchedExchange = '';
    let matchedPriority = 10;

    try {
      mxRecords = await dns.resolveMx(domain.domainName);
      for (const rec of mxRecords) {
        const cleanExchange = rec.exchange.toLowerCase().replace(/\.$/, '');
        if (cleanExchange === expectedExchange) {
          isMatched = true;
          matchedExchange = rec.exchange;
          matchedPriority = rec.priority;
          break;
        }
      }
    } catch (dnsErr: unknown) {
      const errMsg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
      console.warn(`[Inbound DNS] DNS lookup for ${domain.domainName} MX failed:`, errMsg);
    }

    if (isMatched) {
      const updated = await prisma.domain.update({
        where: { id: domainId },
        data: {
          inboundMxVerified: true,
          inboundEnabled: true,
        },
      });

      return {
        verified: true,
        expectedExchange,
        exchange: matchedExchange,
        priority: matchedPriority,
        domain: updated,
        message: `Inbound MX record confirmed for ${domain.domainName}. Ready to receive emails.`,
      };
    } else {
      return {
        verified: false,
        expectedExchange,
        foundRecords: mxRecords,
        domain,
        message: `MX record for ${domain.domainName} not pointing to ${expectedExchange}. Please add an MX record: Host "@", Value "${expectedExchange}", Priority 10.`,
      };
    }
  }

  /**
   * Creates a new Mailbox (alias) for a verified domain.
   */
  static async createMailbox(userId: string | undefined, input: CreateMailboxInput) {
    const domain = await prisma.domain.findUnique({
      where: { id: input.domainId },
    });

    if (!domain) {
      throw new Error('Target domain does not exist');
    }

    if (domain.status !== 'VERIFIED') {
      throw new Error('Domain must be verified before creating mailboxes');
    }

    const isCatchAll = Boolean(input.isCatchAll || input.localPart === '*');
    const localPart = isCatchAll ? '*' : input.localPart.toLowerCase().trim();
    const emailAddress = isCatchAll
      ? `*@${domain.domainName.toLowerCase()}`
      : `${localPart}@${domain.domainName.toLowerCase()}`;

    // Check for existing mailbox conflict
    const existing = await prisma.mailbox.findFirst({
      where: {
        OR: [
          { emailAddress },
          { domainId: domain.id, localPart },
        ],
      },
    });

    if (existing) {
      throw new Error(`Mailbox "${emailAddress}" already exists on this domain`);
    }

    const mailbox = await prisma.mailbox.create({
      data: {
        userId: userId || null,
        domainId: domain.id,
        localPart,
        emailAddress,
        displayName: input.displayName || null,
        isCatchAll,
        isActive: true,
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            inboundMxVerified: true,
            inboundEnabled: true,
          },
        },
      },
    });

    const expectedExchange = this.getExpectedExchange();

    return {
      mailbox,
      inboundDnsInstructions: {
        mxVerified: domain.inboundMxVerified,
        record: {
          type: 'MX',
          host: '@',
          value: expectedExchange,
          priority: 10,
        },
      },
    };
  }

  /**
   * Lists all mailboxes with domain details and statistics.
   */
  static async listMailboxes(query: ListMailboxesQuery, _userId?: string) {
    const where: any = {};

    if (query.domainId) {
      where.domainId = query.domainId;
    }

    if (query.search) {
      where.OR = [
        { emailAddress: { contains: query.search, mode: 'insensitive' } },
        { localPart: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.mailbox.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            inboundMxVerified: true,
            inboundEnabled: true,
            status: true,
          },
        },
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Fetches mailbox by ID.
   */
  static async getMailboxById(mailboxId: string) {
    return await prisma.mailbox.findUnique({
      where: { id: mailboxId },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            inboundMxVerified: true,
            inboundEnabled: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Updates mailbox attributes (displayName, isActive).
   */
  static async updateMailbox(mailboxId: string, input: UpdateMailboxInput) {
    return await prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        domain: true,
      },
    });
  }

  /**
   * Deletes a mailbox and its associated emails.
   */
  static async deleteMailbox(mailboxId: string) {
    return await prisma.mailbox.delete({
      where: { id: mailboxId },
    });
  }

  /**
   * Lists messages in a mailbox with pagination, filter, and search.
   */
  static async listMailboxMessages(mailboxId: string, query: ListMessagesQuery) {
    const mailbox = await prisma.mailbox.findUnique({
      where: { id: mailboxId },
      select: { id: true, emailAddress: true, unreadCount: true, totalMessages: true },
    });

    if (!mailbox) {
      throw new Error('Mailbox not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      mailboxId,
    };

    // Filters
    if (query.filter === 'unread') {
      where.isRead = false;
      where.isTrash = false;
      where.isArchived = false;
    } else if (query.filter === 'starred') {
      where.isStarred = true;
      where.isTrash = false;
    } else if (query.filter === 'archived') {
      where.isArchived = true;
      where.isTrash = false;
    } else if (query.filter === 'trash') {
      where.isTrash = true;
    } else {
      // 'all' inbox view hides trash and archived
      where.isTrash = false;
      where.isArchived = false;
    }

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { fromAddress: { contains: query.search, mode: 'insensitive' } },
        { fromName: { contains: query.search, mode: 'insensitive' } },
        { snippet: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, messages] = await Promise.all([
      prisma.inboundEmail.count({ where }),
      prisma.inboundEmail.findMany({
        where,
        select: {
          id: true,
          mailboxId: true,
          domainId: true,
          threadId: true,
          messageId: true,
          inReplyTo: true,
          fromAddress: true,
          fromName: true,
          toAddresses: true,
          ccAddresses: true,
          replyTo: true,
          subject: true,
          snippet: true,
          sizeBytes: true,
          isRead: true,
          isStarred: true,
          isArchived: true,
          isTrash: true,
          direction: true,
          receivedAt: true,
          createdAt: true,
        },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      mailbox,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      messages,
    };
  }

  /**
   * Gets a single message in full detail and automatically marks as read.
   * Also fetches all other messages in the same conversation thread.
   */
  static async getMessageById(messageId: string) {
    const message = await prisma.inboundEmail.findUnique({
      where: { id: messageId },
      include: {
        mailbox: true,
        domain: {
          select: { id: true, domainName: true },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Auto mark as read if currently unread
    if (!message.isRead) {
      await prisma.$transaction([
        prisma.inboundEmail.update({
          where: { id: messageId },
          data: { isRead: true },
        }),
        prisma.mailbox.update({
          where: { id: message.mailboxId },
          data: {
            unreadCount: { decrement: 1 },
          },
        }),
      ]);
      message.isRead = true;
    }

    // Fetch entire conversation thread ordered chronologically
    const thread = await prisma.inboundEmail.findMany({
      where: {
        mailboxId: message.mailboxId,
        threadId: message.threadId,
      },
      orderBy: { receivedAt: 'asc' },
    });

    return {
      message,
      thread,
    };
  }

  /**
   * Updates message flags (isRead, isStarred, isArchived, isTrash).
   * Accurately keeps mailbox unreadCount in sync.
   */
  static async updateMessage(messageId: string, input: UpdateMessageInput) {
    const existing = await prisma.inboundEmail.findUnique({
      where: { id: messageId },
    });

    if (!existing) {
      throw new Error('Message not found');
    }

    // Sync unreadCount if isRead flag is toggled
    if (input.isRead !== undefined && input.isRead !== existing.isRead) {
      if (input.isRead === true) {
        // Unread -> Read: decrement unreadCount
        await prisma.mailbox.update({
          where: { id: existing.mailboxId },
          data: { unreadCount: { decrement: 1 } },
        });
      } else {
        // Read -> Unread: increment unreadCount
        await prisma.mailbox.update({
          where: { id: existing.mailboxId },
          data: { unreadCount: { increment: 1 } },
        });
      }
    }

    return await prisma.inboundEmail.update({
      where: { id: messageId },
      data: {
        ...(input.isRead !== undefined ? { isRead: input.isRead } : {}),
        ...(input.isStarred !== undefined ? { isStarred: input.isStarred } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
        ...(input.isTrash !== undefined ? { isTrash: input.isTrash } : {}),
      },
    });
  }

  /**
   * Permanently deletes a message.
   */
  static async deleteMessage(messageId: string) {
    const existing = await prisma.inboundEmail.findUnique({
      where: { id: messageId },
    });

    if (!existing) {
      throw new Error('Message not found');
    }

    if (!existing.isRead) {
      await prisma.mailbox.update({
        where: { id: existing.mailboxId },
        data: {
          unreadCount: { decrement: 1 },
          totalMessages: { decrement: 1 },
        },
      }).catch(() => {});
    } else {
      await prisma.mailbox.update({
        where: { id: existing.mailboxId },
        data: {
          totalMessages: { decrement: 1 },
        },
      }).catch(() => {});
    }

    return await prisma.inboundEmail.delete({
      where: { id: messageId },
    });
  }

  /**
   * Sends a new email outbound from a Mailbox identity.
   */
  static async sendFromMailbox(mailboxId: string, input: SendMailboxEmailInput) {
    const mailbox = await prisma.mailbox.findUnique({
      where: { id: mailboxId },
      include: { domain: true },
    });

    if (!mailbox) {
      throw new Error('Mailbox not found');
    }

    if (!mailbox.isActive) {
      throw new Error('Mailbox is currently disabled');
    }

    const senderHeader = mailbox.displayName
      ? `${mailbox.displayName} <${mailbox.emailAddress}>`
      : mailbox.emailAddress;

    const outgoingMessageId = `<outbound-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@${mailbox.domain.domainName}>`;
    const threadId = crypto.randomUUID();

    // 1. Create standard outbound Email record for DKIM signing & dispatch
    const email = await prisma.email.create({
      data: {
        domainId: mailbox.domainId,
        from: senderHeader,
        to: input.to,
        subject: input.subject,
        htmlContent: input.html || null,
        textContent: input.text || null,
        cc: input.cc || [],
        bcc: input.bcc || [],
        replyTo: input.replyTo || mailbox.emailAddress,
        status: EmailStatus.QUEUED,
        messageId: outgoingMessageId,
      },
    });

    // 2. Enqueue outbound job into existing email-delivery-queue
    await enqueueEmailDispatch(email.id, {
      domainId: mailbox.domainId,
      from: senderHeader,
      to: input.to,
      subject: input.subject,
      messageId: outgoingMessageId,
    });

    // 3. Mirror into InboundEmail table with direction: OUTBOUND_REPLY for inbox view
    const plainSnippet = (
      input.text ||
      (input.html ? input.html.replace(/<[^>]*>/g, '') : '')
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    const [outboundInboxRecord] = await prisma.$transaction([
      prisma.inboundEmail.create({
        data: {
          mailboxId: mailbox.id,
          domainId: mailbox.domainId,
          threadId,
          messageId: outgoingMessageId,
          fromAddress: mailbox.emailAddress,
          fromName: mailbox.displayName || null,
          toAddresses: input.to.map((addr) => ({ address: addr })),
          ccAddresses: (input.cc || []).map((addr) => ({ address: addr })),
          replyTo: input.replyTo || mailbox.emailAddress,
          subject: input.subject,
          snippet: plainSnippet,
          textBody: input.text || null,
          htmlBody: input.html || null,
          isRead: true,
          direction: InboundEmailDirection.OUTBOUND_REPLY,
          receivedAt: new Date(),
        },
      }),
      prisma.mailbox.update({
        where: { id: mailbox.id },
        data: {
          totalMessages: { increment: 1 },
          lastMessageAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Email dispatched successfully from mailbox',
      emailId: email.id,
      inboundEmail: outboundInboxRecord,
    };
  }

  /**
   * Replies directly to an inbound message, preserving threadId and conversation headers.
   */
  static async replyToMessage(messageId: string, input: ReplyMessageInput) {
    const original = await prisma.inboundEmail.findUnique({
      where: { id: messageId },
      include: {
        mailbox: true,
        domain: true,
      },
    });

    if (!original) {
      throw new Error('Original message to reply to was not found');
    }

    const { mailbox, domain } = original;

    const senderHeader = mailbox.displayName
      ? `${mailbox.displayName} <${mailbox.emailAddress}>`
      : mailbox.emailAddress;

    const replySubject = original.subject.toLowerCase().startsWith('re:')
      ? original.subject
      : `Re: ${original.subject}`;

    const outgoingMessageId = `<reply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@${domain.domainName}>`;
    const references = [...(original.references || []), original.messageId];

    // 1. Create standard outbound Email record
    const email = await prisma.email.create({
      data: {
        domainId: domain.id,
        from: senderHeader,
        to: [original.fromAddress],
        subject: replySubject,
        htmlContent: input.html || null,
        textContent: input.text || null,
        cc: input.cc || [],
        bcc: input.bcc || [],
        replyTo: mailbox.emailAddress,
        headers: {
          'In-Reply-To': original.messageId,
          References: references.join(' '),
        },
        status: EmailStatus.QUEUED,
        messageId: outgoingMessageId,
      },
    });

    // 2. Enqueue into outbound queue
    await enqueueEmailDispatch(email.id, {
      domainId: domain.id,
      from: senderHeader,
      to: [original.fromAddress],
      subject: replySubject,
      messageId: outgoingMessageId,
    });

    // 3. Mirror reply into InboundEmail table sharing the same threadId
    const plainSnippet = (
      input.text ||
      (input.html ? input.html.replace(/<[^>]*>/g, '') : '')
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    const [replyRecord] = await prisma.$transaction([
      prisma.inboundEmail.create({
        data: {
          mailboxId: mailbox.id,
          domainId: domain.id,
          threadId: original.threadId, // Thread continuation
          messageId: outgoingMessageId,
          inReplyTo: original.messageId,
          references,
          fromAddress: mailbox.emailAddress,
          fromName: mailbox.displayName || null,
          toAddresses: [{ address: original.fromAddress, name: original.fromName || undefined }],
          ccAddresses: (input.cc || []).map((addr) => ({ address: addr })),
          replyTo: mailbox.emailAddress,
          subject: replySubject,
          snippet: plainSnippet,
          textBody: input.text || null,
          htmlBody: input.html || null,
          isRead: true,
          direction: InboundEmailDirection.OUTBOUND_REPLY,
          receivedAt: new Date(),
        },
      }),
      prisma.mailbox.update({
        where: { id: mailbox.id },
        data: {
          totalMessages: { increment: 1 },
          lastMessageAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Reply dispatched and added to thread',
      emailId: email.id,
      reply: replyRecord,
    };
  }

  /**
   * Simulates an incoming email for testing in development.
   */
  static async simulateInbound(input: SimulateInboundInput) {
    const rawMimeLines = [
      `From: ${input.from}`,
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@simulator.local>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      input.html || `<p>${input.text || input.subject}</p>`,
    ];

    const rawMime = rawMimeLines.join('\r\n');
    const envelopeFromMatch = input.from.match(/<([^>]+)>/);
    const envelopeFrom = envelopeFromMatch ? envelopeFromMatch[1] : input.from.trim();

    const job = await enqueueInboundEmail({
      rawMimeBase64: Buffer.from(rawMime).toString('base64'),
      envelopeFrom,
      envelopeTo: [input.to.toLowerCase().trim()],
      remoteAddress: '127.0.0.1 (Simulator)',
      receivedAt: new Date().toISOString(),
    });

    return {
      enqueued: true,
      jobId: job.id,
      message: `Inbound email to <${input.to}> enqueued into BullMQ for worker processing.`,
    };
  }
}
