import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { enqueueEmailDispatch } from '../../queues/emailDispatch.queue.js';
import { SendEmailInput } from './emails.schema.js';
import { SuppressionsService } from '../suppressions/suppressions.service.js';
import { generateUnsubscribeToken } from '../../utils/crypto.js';
import { formatFromHeader } from '../../utils/formatFrom.js';
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
    const rawToRecipients = Array.isArray(input.to) ? input.to : [input.to];
    const rawCcRecipients = Array.isArray(input.cc) ? input.cc : (input.cc ? [input.cc] : []);
    const rawBccRecipients = Array.isArray(input.bcc) ? input.bcc : (input.bcc ? [input.bcc] : []);
    const rawReplyTo = (input as any).reply_to || input.replyTo;
    const replyTo = Array.isArray(rawReplyTo) ? rawReplyTo[0] : rawReplyTo || null;

    // 4. Suppression List Pre-Flight Interceptor (Global + Domain-scoped)
    const allRecipients = [...rawToRecipients, ...rawCcRecipients, ...rawBccRecipients];
    const suppressedMatches = await SuppressionsService.findSuppressedRecipients(
      allRecipients,
      targetDomain.id
    );

    const suppressedEmailsSet = new Set(suppressedMatches.map((s) => s.email.toLowerCase().trim()));
    const activeToRecipients = rawToRecipients.filter((e) => !suppressedEmailsSet.has(e.toLowerCase().trim()));
    const activeCcRecipients = rawCcRecipients.filter((e) => !suppressedEmailsSet.has(e.toLowerCase().trim()));
    const activeBccRecipients = rawBccRecipients.filter((e) => !suppressedEmailsSet.has(e.toLowerCase().trim()));

    const isCompletelySuppressed = activeToRecipients.length === 0;
    const suppressionDetails = suppressedMatches
      .map((s) => `${s.email} (${s.reason})`)
      .join(', ');
    const suppressionReason = suppressedMatches.length > 0
      ? `Suppressed recipient(s): ${suppressionDetails}`
      : null;

    // 5. RFC 8058 One-Click Unsubscribe Header Generation
    const rawListUnsub = (input as any).list_unsubscribe || input.listUnsubscribe;
    const unsubMode = (input as any).unsubscribe_mode || input.unsubscribeMode;
    let listUnsubscribeMetadata: any = undefined;
    const mergedHeaders: Record<string, string> = { ...((input.headers as Record<string, string>) || {}) };

    // Strip bot fingerprints or internal headers if caller passed them
    for (const key of Object.keys(mergedHeaders)) {
      const lower = key.toLowerCase();
      if (lower === 'x-mailer' || lower === 'x-priority') {
        delete mergedHeaders[key];
      }
    }

    let unsubHttpsUrl: string | null = null;
    let unsubMailto: string | null = null;

    if (rawListUnsub) {
      if (typeof rawListUnsub === 'string' && rawListUnsub.startsWith('https://')) {
        unsubHttpsUrl = rawListUnsub;
      } else if (typeof rawListUnsub === 'object' && rawListUnsub !== null) {
        if (typeof rawListUnsub.url === 'string' && rawListUnsub.url.startsWith('https://')) {
          unsubHttpsUrl = rawListUnsub.url;
        }
        if (typeof rawListUnsub.email === 'string' && rawListUnsub.email.includes('@')) {
          unsubMailto = rawListUnsub.email;
        }
      }
    }

    if (!unsubHttpsUrl && unsubMode === 'one-click') {
      const primaryRecipient = activeToRecipients[0] || rawToRecipients[0];
      const unsubToken = generateUnsubscribeToken({
        domainId: targetDomain.id,
        email: primaryRecipient,
        messageId,
      });

      const apiBase = env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
      unsubHttpsUrl = `${apiBase}/api/v1/unsubscribe/one-click/${unsubToken}`;
      unsubMailto = `unsubscribe@${targetDomain.domainName}`;
    }

    if (unsubHttpsUrl) {
      const mailtoTarget = unsubMailto || `unsubscribe@${targetDomain.domainName}`;
      mergedHeaders['List-Unsubscribe'] = `<${unsubHttpsUrl}>, <mailto:${mailtoTarget}?subject=unsubscribe>`;
      mergedHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';

      listUnsubscribeMetadata = {
        url: unsubHttpsUrl,
        email: mailtoTarget,
        mode: unsubMode || 'one-click',
      } as Prisma.InputJsonObject;
    } else {
      // For standard transactional emails without explicit https unsubscribe URL, do not include unsubscribe headers
      delete mergedHeaders['List-Unsubscribe'];
      delete mergedHeaders['list-unsubscribe'];
      delete mergedHeaders['List-Unsubscribe-Post'];
      delete mergedHeaders['list-unsubscribe-post'];
    }

    // Ensure "From" header always includes an RFC-5322 display name
    const rawFromName = (input as any).fromName || (input as any).from_name || (input as any).name;
    const formattedFrom = formatFromHeader(input.from, rawFromName);

    // 6. Create Email record in database
    const emailStatus = isCompletelySuppressed ? EmailStatus.SUPPRESSED : EmailStatus.QUEUED;

    const email = await prisma.email.create({
      data: {
        id: generatedId,
        domainId: targetDomain.id,
        from: formattedFrom,
        to: isCompletelySuppressed ? rawToRecipients : activeToRecipients,
        subject: input.subject,
        htmlContent: input.html || null,
        textContent: input.text || null,
        replyTo,
        cc: isCompletelySuppressed ? rawCcRecipients : activeCcRecipients,
        bcc: isCompletelySuppressed ? rawBccRecipients : activeBccRecipients,
        headers: Object.keys(mergedHeaders).length ? (mergedHeaders as Prisma.InputJsonValue) : Prisma.DbNull,
        attachments: input.attachments ? (input.attachments as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        listUnsubscribe: listUnsubscribeMetadata,
        status: emailStatus,
        messageId,
        suppressionReason,
      },
      select: {
        id: true,
        from: true,
        to: true,
        subject: true,
        status: true,
        messageId: true,
        suppressionReason: true,
        createdAt: true,
      },
    });

    // 7. Push to Redis Delivery Queue ONLY if not suppressed
    if (!isCompletelySuppressed) {
      await enqueueEmailDispatch(email.id, {
        emailId: email.id,
        domainId: targetDomain.id,
        from: email.from,
        to: activeToRecipients,
        subject: email.subject,
        messageId,
      });
    } else {
      console.log(`🛑 [EmailsService] Email ${email.id} suppressed before queueing: ${suppressionReason}`);
    }

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
          domain: {
            select: {
              id: true,
              domainName: true,
            },
          },
          deliveryAttempts: true,
          lastError: true,
          suppressionReason: true,
          htmlContent: true,
          textContent: true,
        },
      }),
      prisma.email.count({ where }),
    ]);

    return { emails, total, limit: take, offset: skip };
  }
}
