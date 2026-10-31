import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import { bullmqRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { decryptAes256Gcm } from '../utils/crypto.js';
import { EmailStatus } from '@prisma/client';
import { MtaStsService } from '../services/mtaSts.service.js';
import { formatFromHeader } from '../utils/formatFrom.js';

export interface EmailDeliveryJobData {
  emailId: string;
  domainId?: string;
  from?: string;
  to?: string[];
  subject?: string;
  messageId?: string;
}

export const processEmailDeliveryJob = async (
  job: Job<EmailDeliveryJobData>
): Promise<void> => {
  const { emailId } = job.data;

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      domain: true,
    },
  });

  if (!email) {
    console.warn(`[DeliveryWorker] Email ${emailId} not found in database. Skipping job.`);
    return;
  }

  if (email.status === EmailStatus.DELIVERED) {
    console.log(`[DeliveryWorker] Email ${emailId} already marked DELIVERED. Skipping.`);
    return;
  }

  // 1. Transition status: queued -> sending
  await prisma.email.update({
    where: { id: emailId },
    data: {
      status: EmailStatus.SENDING,
      deliveryAttempts: { increment: 1 },
    },
  });

  console.log(`🔄 [DeliveryWorker] Processing email "${emailId}" (Attempt ${email.deliveryAttempts + 1}/${job.opts.attempts || 3})`);

  try {
    // 2. Format sender "From" header with RFC 5322 display name
    const formattedFrom = formatFromHeader(email.from);

    // 3. Construct HTML5 document wrapper (if needed) & clean plain-text fallback
    let formattedHtml: string | undefined = undefined;
    if (email.htmlContent && email.htmlContent.trim()) {
      const trimmedHtml = email.htmlContent.trim();
      if (!/<html/i.test(trimmedHtml) && !/<body/i.test(trimmedHtml)) {
        formattedHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">
  ${trimmedHtml}
</body>
</html>`;
      } else {
        formattedHtml = trimmedHtml;
      }
    }

    const plainTextFallback =
      email.textContent && email.textContent.trim()
        ? email.textContent
        : (email.htmlContent
            ? email.htmlContent
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/&quot;/gi, '"')
                .replace(/&#39;/gi, "'")
                .replace(/\s+/g, ' ')
                .trim()
            : undefined);

    // 4. Envelope Return-Path and Deterministic RFC-5322 Message-ID
    const returnPathSub =
      email.domain.returnPathSubdomain ||
      process.env.RETURN_PATH_SUBDOMAIN ||
      env.RETURN_PATH_SUBDOMAIN ||
      'send';
    const returnPathDomain =
      returnPathSub === '@' || returnPathSub === ''
        ? email.domain.domainName
        : `${returnPathSub}.${email.domain.domainName}`;
    const bounceAddress = `bounces@${returnPathDomain}`;

    const deterministicMessageId =
      email.messageId && email.messageId.includes('@')
        ? email.messageId.startsWith('<') && email.messageId.endsWith('>')
          ? email.messageId
          : `<${email.messageId}>`
        : `<${emailId || crypto.randomUUID().replace(/-/g, '')}@${email.domain.domainName}>`;

    // 5. Build MIME Headers (exclude bot fingerprints X-Mailer & X-Priority; strictly validate List-Unsubscribe)
    const existingHeaders = (email.headers as Record<string, any>) || {};
    const mergedHeaders: Record<string, string> = {
      'Message-ID': deterministicMessageId,
      'Feedback-ID': existingHeaders['Feedback-ID']
        ? String(existingHeaders['Feedback-ID'])
        : `${email.id}:${email.domain.id}:transactional:EmitMail`,
    };

    for (const [k, v] of Object.entries(existingHeaders)) {
      const lower = k.toLowerCase();
      if (
        lower === 'x-mailer' ||
        lower === 'x-priority' ||
        lower === 'list-unsubscribe' ||
        lower === 'list-unsubscribe-post' ||
        lower === 'message-id'
      ) {
        continue;
      }
      if (v !== undefined && v !== null && typeof v !== 'object') {
        mergedHeaders[k] = String(v);
      }
    }

    // Extract valid unsubscribe URL
    let validUnsubUrl: string | null = null;
    let unsubMailto: string | null = null;

    if (email.listUnsubscribe) {
      if (typeof email.listUnsubscribe === 'string' && email.listUnsubscribe.startsWith('https://')) {
        validUnsubUrl = email.listUnsubscribe;
      } else if (typeof email.listUnsubscribe === 'object' && email.listUnsubscribe !== null) {
        const meta = email.listUnsubscribe as any;
        if (typeof meta.url === 'string' && meta.url.startsWith('https://')) {
          validUnsubUrl = meta.url;
        }
        if (typeof meta.email === 'string' && meta.email.includes('@')) {
          unsubMailto = meta.email;
        }
      }
    }

    const rawHeaderUnsub = existingHeaders['List-Unsubscribe'] || existingHeaders['list-unsubscribe'];
    if (!validUnsubUrl && typeof rawHeaderUnsub === 'string') {
      const unsubStr = rawHeaderUnsub.trim();
      if (!unsubStr.includes('[object') && unsubStr.includes('https://')) {
        const match = unsubStr.match(/https:\/\/[^\s>,]+/);
        if (match) {
          validUnsubUrl = match[0];
        }
      }
    }

    // Include List-Unsubscribe if and ONLY IF a valid https:// URL is confirmed
    const hasListUnsubscribe = Boolean(validUnsubUrl);
    if (validUnsubUrl) {
      const mailtoTarget = unsubMailto || `unsubscribe@${email.domain.domainName}`;
      mergedHeaders['List-Unsubscribe'] = `<${validUnsubUrl}>, <mailto:${mailtoTarget}?subject=unsubscribe>`;
      mergedHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    // 6. Decrypt Domain's 2048-bit RSA DKIM Private Key and Prepare DKIM Options
    const dkimPrivateKey = decryptAes256Gcm(
      email.domain.dkimPrivateKeyEnc,
      env.ENCRYPTION_KEY
    );

    const dkimHeaderFields = [
      'from',
      'to',
      'cc',
      'subject',
      'date',
      'message-id',
      'feedback-id',
      ...(hasListUnsubscribe ? ['list-unsubscribe', 'list-unsubscribe-post'] : []),
      'mime-version',
      'content-type',
    ];

    const dkimOptions = {
      domainName: email.domain.domainName,
      keySelector: email.domain.dkimSelector || 'esp',
      privateKey: dkimPrivateKey,
      headerFieldNames: dkimHeaderFields.join(':'),
      cacheDir: false,
      hashAlgo: 'sha256',
      canonicalization: 'relaxed/relaxed',
      c: 'relaxed/relaxed',
    };

    // 7. Configure Transporter: Upstream SMTP Relay or Direct MX Delivery with MTA-STS & TLS Policies
    let transporter: any;

    const tlsCiphers = 'HIGH:!aNULL:!MD5:!3DES:!CAMELLIA';
    const minTlsVersion = 'TLSv1.2';

    // Retrieve master server configuration for proper FQDN HELO/EHLO handshake (never placeholder)
    const isPlaceholder = (h?: string | null) =>
      !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h === 'localhost';
    const serverConfig = await prisma.serverConfig.findUnique({ where: { id: 'master' } });
    const mailServerHostname =
      (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholder(process.env.SMTP_EHLO_HOSTNAME))
        ? process.env.SMTP_EHLO_HOSTNAME
        : (env.SMTP_EHLO_HOSTNAME && !isPlaceholder(env.SMTP_EHLO_HOSTNAME))
          ? env.SMTP_EHLO_HOSTNAME
          : (!isPlaceholder(serverConfig?.mailServerHostname)
              ? serverConfig!.mailServerHostname
              : (!isPlaceholder(env.MAIL_SERVER_HOSTNAME)
                  ? env.MAIL_SERVER_HOSTNAME
                  : `mail.${email.domain.domainName}`));

    if (env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        name: mailServerHostname,
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        requireTLS: true,
        xMailer: false,
        tls: {
          ciphers: tlsCiphers,
          minVersion: minTlsVersion,
          rejectUnauthorized: true,
        },
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
        dkim: dkimOptions,
      } as any);
    } else {
      const firstRecipient = email.to[0];
      const recipientDomain = firstRecipient ? firstRecipient.split('@')[1] : '';

      let targetHost = '127.0.0.1';
      let targetPort = 25;

      if (recipientDomain) {
        try {
          const mxList = await dns.resolveMx(recipientDomain);
          if (mxList && mxList.length > 0) {
            const sorted = mxList.sort((a, b) => a.priority - b.priority);
            targetHost = sorted[0].exchange;
          }
        } catch (dnsErr) {
          console.warn(`[DeliveryWorker] MX resolution failed for ${recipientDomain}, fallback to 127.0.0.1`);
        }
      }

      // MTA-STS (RFC 8461) Resolution and Policy Enforcement
      let requireTls = true;
      let rejectUnauthorized = true;

      if (recipientDomain) {
        try {
          const mtaStsPolicy = await MtaStsService.resolvePolicy(recipientDomain);
          if (mtaStsPolicy && mtaStsPolicy.mode === 'enforce') {
            const isMxMatch = mtaStsPolicy.mx.some((pattern) =>
              MtaStsService.matchMxHost(targetHost, pattern)
            );
            if (!isMxMatch) {
              throw new Error(
                `MTA_STS_POLICY_VIOLATION: Destination MX "${targetHost}" does not match MTA-STS policy for "${recipientDomain}"`
              );
            }
            requireTls = true;
            rejectUnauthorized = true;
          } else if (mtaStsPolicy && mtaStsPolicy.mode === 'testing') {
            requireTls = true;
            rejectUnauthorized = false;
          } else {
            // Mode is 'none' or unconfigured: fallback to domain's tlsPolicy
            const isDomainEnforced = email.domain.tlsPolicy === 'enforce';
            requireTls = isDomainEnforced;
            rejectUnauthorized = isDomainEnforced;
          }
        } catch (policyErr) {
          if (policyErr instanceof Error && policyErr.message.includes('MTA_STS_POLICY_VIOLATION')) {
            throw policyErr;
          }
          console.warn(`[DeliveryWorker] MTA-STS check warning for ${recipientDomain}:`, policyErr);
        }
      }

      const shouldUseJsonTransport =
        (env.NODE_ENV === 'test' && !env.DIRECT_MX_FALLBACK) ||
        (targetHost === '127.0.0.1' && !env.SMTP_HOST);

      if (shouldUseJsonTransport) {
        transporter = nodemailer.createTransport({
          jsonTransport: true,
          xMailer: false,
          dkim: dkimOptions,
        } as any);
      } else {
        transporter = nodemailer.createTransport({
          name: mailServerHostname,
          host: targetHost,
          port: targetPort,
          secure: false,
          ignoreTLS: false,
          requireTLS: requireTls,
          xMailer: false,
          tls: {
            ciphers: tlsCiphers,
            minVersion: minTlsVersion,
            rejectUnauthorized,
          },
          dkim: dkimOptions,
        } as any);
      }
    }

    const mailOptions: any = {
      from: formattedFrom,
      to: email.to,
      subject: email.subject,
      html: formattedHtml,
      text: plainTextFallback,
      replyTo: email.replyTo || undefined,
      cc: email.cc?.length ? email.cc : undefined,
      bcc: email.bcc?.length ? email.bcc : undefined,
      messageId: deterministicMessageId,
      date: email.createdAt || new Date(),
      headers: mergedHeaders,
      xMailer: false,
      envelope: {
        from: bounceAddress,
        to: Array.isArray(email.to) ? email.to : [email.to],
      },
      attachments: (email.attachments as any[]) || undefined,
    };

    console.log(
      `🚀 [DeliveryWorker] Dispatching email "${emailId}" via SMTP | HELO: ${mailServerHostname} | MAIL FROM: <${bounceAddress}> | From: ${formattedFrom} | Message-ID: ${deterministicMessageId} | DKIM: d=${email.domain.domainName}`
    );

    const sendResult = await transporter.sendMail(mailOptions);
    const finalMessageId = sendResult.messageId || deterministicMessageId || email.messageId;

    // 8. Transition status: sending -> delivered
    const deliveredAt = new Date();
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.DELIVERED,
        sentAt: deliveredAt,
        messageId: finalMessageId,
        lastError: null,
      },
    });

    console.log(`✅ [DeliveryWorker] Email "${emailId}" DELIVERED successfully via DKIM to ${email.to.join(', ')}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isHardBounce =
      errorMessage.includes('550') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('User unknown') ||
      errorMessage.includes('rejected');

    const isLastAttempt = (job.attemptsMade + 1) >= (job.opts.attempts || 3);
    const finalStatus = isHardBounce ? EmailStatus.BOUNCED : (isLastAttempt ? EmailStatus.FAILED : EmailStatus.SENDING);

    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: finalStatus,
        lastError: errorMessage,
        bouncedAt: isHardBounce ? new Date() : undefined,
        bounceReason: isHardBounce ? errorMessage : undefined,
        bounceType: isHardBounce ? 'hard' : 'soft',
      },
    });

    console.error(`❌ [DeliveryWorker] Failed delivering email "${emailId}" (Attempt ${job.attemptsMade + 1}):`, errorMessage);
    throw err;
  }
};

export const createEmailDeliveryWorker = (): Worker<EmailDeliveryJobData> => {
  const queueName = env.EMAIL_QUEUE_NAME;
  console.log(`🚀 [DeliveryWorker] Subscribing to Redis queue "${queueName}" (Concurrency: ${env.WORKER_CONCURRENCY})...`);

  const worker = new Worker<EmailDeliveryJobData>(
    queueName,
    processEmailDeliveryJob,
    {
      connection: bullmqRedisConnection,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('ready', () => {
    console.log(`⚡ [DeliveryWorker] Worker ready and listening on queue "${queueName}".`);
  });

  worker.on('completed', (job) => {
    console.log(`✨ [DeliveryWorker] Job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [DeliveryWorker] Job ${job?.id} failed with error:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`❌ [DeliveryWorker] Worker encountered error:`, err.message);
  });

  return worker;
};
