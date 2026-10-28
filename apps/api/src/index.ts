import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';
import bcrypt from 'bcryptjs';

/**
 * Ensures the default administrator account exists in the database.
 * Auto-bootstrapped on server startup if not already seeded.
 */
export async function ensureDefaultAdminExists(): Promise<void> {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { username: 'admin' },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('emitmail', 12);

      await prisma.user.create({
        data: {
          username: 'admin',
          fullName: 'EmitMail Administrator',
          passwordHash,
          mustChangePassword: true,
          timezone: 'UTC',
        },
      });

      console.log('✅ [Bootstrap] Default admin account initialized.');
    }
  } catch (error) {
    console.error('❌ [Bootstrap] Failed to verify or seed default admin:', error);
  }
}

/**
 * Ensures the singleton master ServerConfig exists in the database.
 * Automatically initializes from the root .env configuration.
 */
export async function ensureServerConfigExists(): Promise<void> {
  try {
    const { ServerConfigService } = await import('./modules/server-config/serverConfig.service.js');
    await ServerConfigService.getActiveConfig();
  } catch (error) {
    console.error('❌ [Bootstrap] Failed to verify or seed ServerConfig:', error);
  }
}

async function startServer(): Promise<void> {
  // 1. Verify PostgreSQL Connection
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
  }

  // 2. Verify Redis Connection
  try {
    await redis.connect();
  } catch {
    // Redis client will retry connection in background
  }

  // 3. Ensure Default Admin & Master ServerConfig Exist
  await ensureDefaultAdminExists();
  await ensureServerConfigExists();

  // Run Pre-Flight Deliverability Check for 10/10 deliverability
  try {
    const { runPreflightDeliverabilityCheck } = await import('./utils/deliverabilityCheck.js');
    const isPlaceholder = (h?: string | null) =>
      !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h === 'localhost';
    const serverConfig = await prisma.serverConfig.findUnique({ where: { id: 'master' } }).catch(() => null);
    const activeEhloHostname =
      (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholder(process.env.SMTP_EHLO_HOSTNAME))
        ? process.env.SMTP_EHLO_HOSTNAME
        : (env.SMTP_EHLO_HOSTNAME && !isPlaceholder(env.SMTP_EHLO_HOSTNAME))
          ? env.SMTP_EHLO_HOSTNAME
          : (!isPlaceholder(serverConfig?.mailServerHostname)
              ? serverConfig!.mailServerHostname
              : env.MAIL_SERVER_HOSTNAME);
    const activeSendingIp =
      process.env.SENDING_SERVER_IP ||
      (env.SENDING_SERVER_IP && env.SENDING_SERVER_IP !== '0.0.0.0' ? env.SENDING_SERVER_IP : '') ||
      (serverConfig?.vpsPublicIpv4 && serverConfig.vpsPublicIpv4 !== '0.0.0.0' ? serverConfig.vpsPublicIpv4 : '0.0.0.0');

    if (!isPlaceholder(activeEhloHostname) && activeSendingIp && activeSendingIp !== '0.0.0.0') {
      await runPreflightDeliverabilityCheck(activeEhloHostname, activeSendingIp).catch(() => {});
    }
  } catch {
    // ignore
  }

  // 4. Start BullMQ Queue Workers (Decoupled: only starts in-process if env.START_WORKERS is enabled)
  let runningWorkers: { closeAll: () => Promise<void> } | null = null;
  if (env.START_WORKERS) {
    const { startAllWorkers } = await import('./queues/index.js');
    runningWorkers = startAllWorkers();
    console.log('⚡ [Workers] In-process BullMQ workers started (single-node mode).');
  } else {
    console.log('ℹ️ [Workers] Running in decoupled API mode. Background queues dispatched to Redis.');
  }

  // 5. Start Inbound SMTP Receiver (if enabled)
  if (env.INBOUND_SMTP_ENABLED) {
    try {
      const { startInboundSmtpServer } = await import('./inbound/smtp-receiver.js');
      await startInboundSmtpServer(env.INBOUND_SMTP_PORT, env.INBOUND_SMTP_HOST);
    } catch (smtpErr) {
      console.error('⚠️ [Inbound SMTP] Could not start Inbound SMTP server:', smtpErr);
    }
  }

  // 6. Start HTTP Server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✨ EmitMail API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down EmitMail API...`);
    server.close(async () => {
      try {
        if (env.INBOUND_SMTP_ENABLED) {
          const { stopInboundSmtpServer } = await import('./inbound/smtp-receiver.js');
          await stopInboundSmtpServer().catch(() => {});
        }
        if (runningWorkers) {
          await runningWorkers.closeAll();
        }
        await prisma.$disconnect();
        await redis.quit();
      } catch (err) {
        console.error('Error during shutdown:', err);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
