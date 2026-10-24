import { prisma } from './config/db.js';
import { env } from './config/env.js';
import { createEmailDeliveryWorker } from './workers/emailDelivery.worker.js';

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

  const deliveryWorker = createEmailDeliveryWorker();

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Gracefully stopping delivery worker...`);
    try {
      await deliveryWorker.close();
      console.log('✅ BullMQ worker closed.');
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
