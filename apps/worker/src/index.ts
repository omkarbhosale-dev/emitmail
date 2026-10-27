import { prisma } from './config/db.js';
import { env } from './config/env.js';
import { createEmailDeliveryWorker } from './workers/emailDelivery.worker.js';
import { runPreflightDeliverabilityCheck } from './utils/deliverabilityCheck.js';

async function startWorker(): Promise<void> {
  console.log('====================================================');
  console.log('🚀 EmitMail Decoupled Background Delivery Worker');
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`📬 Queue: ${env.EMAIL_QUEUE_NAME}`);
  console.log(`⚙️ Concurrency: ${env.WORKER_CONCURRENCY}`);
  console.log(`🔌 Redis URL: ${env.REDIS_URL}`);
  console.log(`📨 SMTP Relay: ${env.SMTP_HOST ? `${env.SMTP_HOST}:${env.SMTP_PORT}` : 'Direct MX / JSON fallback'}`);
  console.log('====================================================');

  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database.');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }

  // Pre-Flight Deliverability Check for 10/10 inbox placement
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
            : 'mail.example.com');
  const activeSendingIp =
    process.env.SENDING_SERVER_IP ||
    (env.SENDING_SERVER_IP && env.SENDING_SERVER_IP !== '0.0.0.0' ? env.SENDING_SERVER_IP : '') ||
    (serverConfig?.vpsPublicIpv4 && serverConfig.vpsPublicIpv4 !== '0.0.0.0' ? serverConfig.vpsPublicIpv4 : '0.0.0.0');

  if (!isPlaceholder(activeEhloHostname) && activeSendingIp && activeSendingIp !== '0.0.0.0') {
    await runPreflightDeliverabilityCheck(activeEhloHostname, activeSendingIp).catch((err) => {
      console.warn('⚠️ Could not complete preflight deliverability check:', err.message);
    });
  }

  const deliveryWorker = createEmailDeliveryWorker();
  const inboundWorker = (await import('./workers/inboundEmail.worker.js')).createInboundEmailWorker();
  console.log('✅ BullMQ Inbound Email worker started.');

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Gracefully stopping workers...`);
    try {
      await Promise.allSettled([deliveryWorker.close(), inboundWorker.close()]);
      console.log('✅ BullMQ workers closed.');
      await prisma.$disconnect();
      console.log('✅ Database disconnected.');
    } catch (err) {
      console.error('Error during worker shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorker().catch((error) => {
  console.error('❌ Fatal error in worker bootstrap:', error);
  process.exit(1);
});
