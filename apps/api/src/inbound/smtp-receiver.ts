import { SMTPServer, SMTPServerSession, SMTPServerAddress } from 'smtp-server';
import fs from 'node:fs';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { enqueueInboundEmail } from '../queues/inboundEmail.queue.js';

export interface ExtendedSmtpSession extends SMTPServerSession {
  matchedMailbox?: {
    id: string;
    domainId: string;
    emailAddress: string;
  };
}

let smtpServerInstance: SMTPServer | null = null;

/**
 * Creates and configures the Inbound SMTP Receiver instance.
 */
export function createInboundSmtpServer(): SMTPServer {
  const hostname =
    process.env.SMTP_EHLO_HOSTNAME ||
    env.SMTP_EHLO_HOSTNAME ||
    'mail.omkarbhosale.dev';

  let tlsOptions: { key?: Buffer; cert?: Buffer } = {};
  if (
    env.INBOUND_TLS_KEY_PATH &&
    env.INBOUND_TLS_CERT_PATH &&
    fs.existsSync(env.INBOUND_TLS_KEY_PATH) &&
    fs.existsSync(env.INBOUND_TLS_CERT_PATH)
  ) {
    try {
      tlsOptions = {
        key: fs.readFileSync(env.INBOUND_TLS_KEY_PATH),
        cert: fs.readFileSync(env.INBOUND_TLS_CERT_PATH),
      };
      console.log('🔒 [Inbound SMTP] TLS certificates loaded for opportunistic STARTTLS.');
    } catch (err) {
      console.warn('⚠️ [Inbound SMTP] Failed to load TLS certificates, running unencrypted:', err);
    }
  }

  const server = new SMTPServer({
    name: hostname,
    banner: 'EmitMail Inbound ESMTP Service Ready',
    disabledCommands: ['AUTH'], // Port 25 MX-to-MX delivery does not use SMTP AUTH
    size: env.INBOUND_MAX_BYTES || 25 * 1024 * 1024,
    allowInsecureAuth: false,
    authOptional: true,
    ...tlsOptions,

    // Step 1: Validate recipient mailbox before accepting message body
    async onRcptTo(
      address: SMTPServerAddress,
      session: SMTPServerSession,
      callback: (err?: Error | null) => void
    ) {
      try {
        const recipient = address.address.toLowerCase().trim();
        const atIdx = recipient.lastIndexOf('@');
        if (atIdx === -1) {
          return callback(new Error(`550 5.1.1 <${recipient}>: Invalid recipient address syntax`));
        }

        const domainName = recipient.slice(atIdx + 1);

        // Find active mailbox: exact match first, then fallback to catch-all
        let mailbox = await prisma.mailbox.findFirst({
          where: {
            emailAddress: recipient,
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
                domainName: { equals: domainName, mode: 'insensitive' },
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

        if (!mailbox) {
          console.warn(`🛑 [Inbound SMTP] Rejected recipient: <${recipient}> (User unknown)`);
          return callback(
            new Error(`550 5.1.1 <${recipient}>: Recipient address rejected: Mailbox does not exist`)
          );
        }

        // Attach matched mailbox metadata to session for worker context
        (session as ExtendedSmtpSession).matchedMailbox = {
          id: mailbox.id,
          domainId: mailbox.domainId,
          emailAddress: mailbox.emailAddress,
        };

        console.log(`📥 [Inbound SMTP] Accepted recipient <${recipient}> -> Mailbox: ${mailbox.emailAddress}`);
        return callback();
      } catch (error) {
        console.error('❌ [Inbound SMTP] Error in onRcptTo validation:', error);
        return callback(new Error('451 4.3.0 Internal database error during recipient lookup'));
      }
    },

    // Step 2: Stream incoming MIME and push immediately to BullMQ queue
    onData(
      stream,
      session: SMTPServerSession,
      callback: (err?: Error | null, message?: string) => void
    ) {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
      });

      stream.on('end', async () => {
        if (stream.sizeExceeded) {
          return callback(new Error('552 5.3.4 Message size exceeds fixed maximum message size'));
        }

        try {
          const rawBuffer = Buffer.concat(chunks, totalBytes);
          const rawMimeBase64 = rawBuffer.toString('base64');
          const envelopeFrom = session.envelope.mailFrom ? session.envelope.mailFrom.address.toLowerCase() : '';
          const envelopeTo = session.envelope.rcptTo.map((r) => r.address.toLowerCase());

          const job = await enqueueInboundEmail({
            rawMimeBase64,
            envelopeFrom,
            envelopeTo,
            remoteAddress: session.remoteAddress,
            receivedAt: new Date().toISOString(),
          });

          console.log(`⚡ [Inbound SMTP] Enqueued message job #${job.id} (${(totalBytes / 1024).toFixed(1)} KB)`);
          return callback(null, `250 2.0.0 OK: Queued as ${job.id}`);
        } catch (error) {
          console.error('❌ [Inbound SMTP] Failed to enqueue inbound message job:', error);
          return callback(new Error('451 4.4.0 Failed to queue message into BullMQ'));
        }
      });

      stream.on('error', (err: Error) => {
        console.error('❌ [Inbound SMTP] Stream error occurred:', err);
        return callback(err);
      });
    },
  });

  server.on('error', (err: Error) => {
    console.error('❌ [Inbound SMTP] SMTPServer encountered an error:', err);
  });

  return server;
}

/**
 * Starts the Inbound SMTP service listening on the configured port.
 */
export async function startInboundSmtpServer(
  port = env.INBOUND_SMTP_PORT,
  host = env.INBOUND_SMTP_HOST
): Promise<SMTPServer> {
  if (smtpServerInstance) {
    return smtpServerInstance;
  }

  const server = createInboundSmtpServer();

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      smtpServerInstance = server;
      console.log(`📨 [Inbound SMTP] Listening on ${host}:${port} (EHLO: ${process.env.SMTP_EHLO_HOSTNAME || env.SMTP_EHLO_HOSTNAME})`);
      resolve(server);
    });

    server.once('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Gracefully terminates the running Inbound SMTP server.
 */
export async function stopInboundSmtpServer(): Promise<void> {
  if (!smtpServerInstance) return;

  const server = smtpServerInstance;
  smtpServerInstance = null;

  return new Promise((resolve) => {
    server.close(() => {
      console.log('🛑 [Inbound SMTP] Inbound receiver server stopped.');
      resolve();
    });
  });
}
