import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import { bullmqRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { decryptAes256Gcm } from '../utils/crypto.js';
import { EmailStatus } from '@prisma/client';
import { MtaStsService } from '../services/mtaSts.service.js';

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
    console.warn(`⚠️ [DeliveryWorker] Email record "${emailId}" not found in database. Skipping.`);
    return;
  }

  if (email.status === EmailStatus.DELIVERED) {
    console.log(`ℹ️ [DeliveryWorker] Email "${emailId}" already marked as DELIVERED.`);
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
    // 2. Decrypt Domain's 2048-bit RSA DKIM Private Key
    const dkimPrivateKey = decryptAes256Gcm(
      email.domain.dkimPrivateKeyEnc,
      env.ENCRYPTION_KEY
    );

    // 3. Prepare DKIM signature options (including RFC 8058 one-click unsubscribe headers)
    const dkimOptions = {
      domainName: email.domain.domainName,
      keySelector: email.domain.dkimSelector,
      privateKey: dkimPrivateKey,
      headerFieldNames:
        'from:to:cc:subject:date:message-id:list-unsubscribe:list-unsubscribe-post:mime-version',
    };

    // 4. Configure Transporter: Upstream SMTP Relay or Direct MX Delivery with MTA-STS & TLS Policies
    let transporter: any;

    const tlsCiphers = 'HIGH:!aNULL:!MD5:!3DES:!CAMELLIA';
    const minTlsVersion = 'TLSv1.2';

    if (env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        requireTLS: true,
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
        } catch {
          // Fallback to loopback or simulated delivery in test/dev
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

      if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development' || targetHost === '127.0.0.1') {
        transporter = nodemailer.createTransport({
          jsonTransport: true,
          dkim: dkimOptions,
        } as any);
      } else {
        transporter = nodemailer.createTransport({
          host: targetHost,
          port: targetPort,
          secure: false,
          ignoreTLS: false,
          requireTLS: requireTls,
          tls: {
            ciphers: tlsCiphers,
            minVersion: minTlsVersion,
            rejectUnauthorized,
          },
          dkim: dkimOptions,
        } as any);
      }
    }

    // 5. Construct RFC 5322 Payload
    const mailOptions: any = {
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.htmlContent || undefined,
      text: email.textContent || undefined,
      replyTo: email.replyTo || undefined,
      cc: email.cc?.length ? email.cc : undefined,
      bcc: email.bcc?.length ? email.bcc : undefined,
      messageId: email.messageId || undefined,
      headers: (email.headers as Record<string, string>) || undefined,
      attachments: (email.attachments as any[]) || undefined,
    };

    const sendResult = await transporter.sendMail(mailOptions);
    const finalMessageId = sendResult.messageId || email.messageId;

    // 6. Transition status: sending -> delivered
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
