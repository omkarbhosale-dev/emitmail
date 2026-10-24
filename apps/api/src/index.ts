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

  // 4. Start HTTP Server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✨ EmitMail API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down EmitMail API...`);
    server.close(async () => {
      try {
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
