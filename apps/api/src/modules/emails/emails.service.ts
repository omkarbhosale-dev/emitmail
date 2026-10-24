import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { enqueueEmailDispatch } from '../../queues/emailDispatch.queue.js';
import { SendEmailInput } from './emails.schema.js';
import { Domain, DomainStatus, EmailStatus, Prisma } from '@prisma/client';
import crypto from 'node:crypto';

export class EmailsService {
  /**
   * Helper to parse email address from strings like 'Acme Support <support@acme.com>' or 'support@acme.com'.
   */
  static extractEmailAddress(rawFrom: string): string {
    const match = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (!match) {
      throw new Error(`Invalid "from" email address format: "${rawFrom}"`);
    }
    return match[1].toLowerCase().trim();
  }

  /**
   * Submits an email for asynchronous DKIM signing and delivery.
   * Enforces domain-level tenancy: sender address domain must match the scoped API key domain.
   */
  static async submitEmail(input: SendEmailInput, authenticatedDomain: Domain | null) {
    const senderEmail = this.extractEmailAddress(input.from);
    const senderDomainName = senderEmail.split('@')[1]?.toLowerCase();

    if (!senderDomainName) {
      throw new Error(`Unable to determine domain from sender address: "${input.from}"`);
    }

    let targetDomain: Domain;

    // 1. Domain-Level Tenancy Enforcement
    if (authenticatedDomain) {
      const scopedDomainName = authenticatedDomain.domainName.toLowerCase();
      const isExactOrSubdomain =
        senderDomainName === scopedDomainName ||
        senderDomainName.endsWith(`.${scopedDomainName}`);

      if (!isExactOrSubdomain) {
        throw new Error(
          `Tenancy violation: Sender domain "${senderDomainName}" does not match assigned API key domain "${authenticatedDomain.domainName}"`
        );
      }

      targetDomain = authenticatedDomain;
    } else {
      // Account-wide key: verify the sender domain is registered
      const domainRecord = await prisma.domain.findUnique({
        where: { domainName: senderDomainName },
      });

      if (!domainRecord) {
        throw new Error(
          `Domain "${senderDomainName}" is not registered in EmitMail. Please register and verify the domain first.`
        );
      }

      targetDomain = domainRecord;
    }

    // 2. Verification Prerequisite Enforcement
    if (!env.ALLOW_PENDING_DOMAIN_API_KEYS && targetDomain.status !== DomainStatus.VERIFIED) {
      throw new Error(
        `Cannot send from domain "${targetDomain.domainName}". Domain status is ${targetDomain.status}. Only VERIFIED domains can dispatch emails.`
      );
    }

    // 3. Format Standard Message ID & RFC 5322 Message-ID
    const generatedId = `em_${crypto.randomUUID().replace(/-/g, '')}`;
    const uniqueToken = crypto.randomBytes(16).toString('hex');
    const messageId = `<${generatedId}-${uniqueToken}@${targetDomain.domainName}>`;

    // Normalize recipients, cc, bcc, and reply-to
    const toRecipients = Array.isArray(input.to) ? input.to : [input.to];
    const rawReplyTo = (input as any).reply_to || input.replyTo;
    const replyTo = Array.isArray(rawReplyTo) ? rawReplyTo[0] : rawReplyTo || null;
    const ccRecipients = Array.isArray(input.cc) ? input.cc : (input.cc ? [input.cc] : []);
    const bccRecipients = Array.isArray(input.bcc) ? input.bcc : (input.bcc ? [input.bcc] : []);

    // 4. Create Email record in database with status: QUEUED
    const email = await prisma.email.create({
      data: {
        id: generatedId,
        domainId: targetDomain.id,
        from: input.from,
        to: toRecipients,
        subject: input.subject,
        htmlContent: input.html || null,
        textContent: input.text || null,
        replyTo,
        cc: ccRecipients,
        bcc: bccRecipients,
        headers: input.headers ? (input.headers as Prisma.InputJsonValue) : Prisma.DbNull,
        attachments: input.attachments ? (input.attachments as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        status: EmailStatus.QUEUED,
        messageId,
      },
      select: {
        id: true,
        from: true,
        to: true,
        subject: true,
        status: true,
        messageId: true,
        createdAt: true,
      },
    });

    // 5. Push to Redis BullMQ Delivery Queue (Fast Non-blocking Ingestion)
    await enqueueEmailDispatch(email.id, {
      emailId: email.id,
      domainId: targetDomain.id,
      from: email.from,
      to: toRecipients,
      subject: email.subject,
      messageId,
    });

    return email;
  }

  /**
   * Retrieves an email by ID, respecting domain tenancy.
   */
  static async getEmailById(id: string, authenticatedDomain: Domain | null) {
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            status: true,
          },
        },
      },
    });

    if (!email) {
      return null;
    }

    if (authenticatedDomain && email.domainId !== authenticatedDomain.id) {
      throw new Error('Access denied: Email does not belong to the scoped domain');
    }

    return email;
  }

  /**
   * Lists emails with tenancy filtering.
   */
  static async listEmails(
    query: { status?: EmailStatus; limit?: number; offset?: number },
    authenticatedDomain: Domain | null
  ) {
    const where: Prisma.EmailWhereInput = {};

    if (authenticatedDomain) {
      where.domainId = authenticatedDomain.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const take = Math.min(query.limit || 20, 100);
    const skip = query.offset || 0;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          status: true,
          messageId: true,
          sentAt: true,
          bouncedAt: true,
          bounceType: true,
          bounceReason: true,
          createdAt: true,
        },
      }),
      prisma.email.count({ where }),
    ]);

    return { emails, total, limit: take, offset: skip };
  }
}
