import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function ensureDefaultAdminExists(): Promise<void> {
  const existingAdmin = await prisma.user.findFirst({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('emitmail', 12);

    await prisma.user.create({
      data: {
        username: 'admin',
        fullName: 'EmitMail Administrator',
        role: 'ADMIN',
        passwordHash,
        mustChangePassword: true,
        timezone: 'UTC',
      },
    });

    console.log('✅ Default admin account seeded successfully.');
  } else {
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN' },
      });
      console.log('✅ Updated existing administrator account to ADMIN role.');
    } else {
      console.log('ℹ️ Default administrator account already exists.');
    }
  }
}

export async function ensureServerConfigExists(): Promise<void> {
  const existingConfig = await prisma.serverConfig.findUnique({
    where: { id: 'master' },
  });

    const isPlaceholder = (h?: string | null) =>
      !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h === 'localhost';
    const mailServerHostname =
      (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholder(process.env.SMTP_EHLO_HOSTNAME))
        ? process.env.SMTP_EHLO_HOSTNAME
        : (!isPlaceholder(process.env.MAIL_SERVER_HOSTNAME)
            ? process.env.MAIL_SERVER_HOSTNAME!
            : 'mail.yourdomain.com');
    const spfIncludeDomain = process.env.SPF_INCLUDE_DOMAIN || '_spf.yourdomain.com';
    const vpsPublicIpv4 = process.env.SENDING_SERVER_IP || process.env.VPS_PUBLIC_IPV4 || '0.0.0.0';
    const isConfigured = !isPlaceholder(mailServerHostname) && mailServerHostname.includes('.');

    await prisma.serverConfig.create({
      data: {
        id: 'master',
        mailServerHostname,
        spfIncludeDomain,
        vpsPublicIpv4,
        isConfigured,
      },
    });

    console.log('✅ Master ServerConfig seeded successfully.');
  } else if (
    (existingConfig.mailServerHostname === 'mail.yourdomain.com' ||
      existingConfig.mailServerHostname === 'mail.example.com' ||
      existingConfig.mailServerHostname === 'localhost') &&
    process.env.SMTP_EHLO_HOSTNAME
  ) {
    const isPlaceholder = (h?: string | null) =>
      !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h === 'localhost';
    const activeHost =
      (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholder(process.env.SMTP_EHLO_HOSTNAME))
        ? process.env.SMTP_EHLO_HOSTNAME
        : (process.env.MAIL_SERVER_HOSTNAME || 'mail.yourdomain.com');
    await prisma.serverConfig.update({
      where: { id: 'master' },
      data: {
        mailServerHostname: activeHost,
        vpsPublicIpv4: process.env.SENDING_SERVER_IP || process.env.VPS_PUBLIC_IPV4 || existingConfig.vpsPublicIpv4,
        isConfigured: true,
      },
    });
    console.log(`🔧 Master ServerConfig updated from placeholder to "${activeHost}".`);
  } else {
    console.log('ℹ️ Master ServerConfig already exists.');
  }
}

async function main() {
  try {
    await ensureDefaultAdminExists();
    await ensureServerConfigExists();
  } catch (error) {
    console.error('❌ Error during Prisma seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run directly if called as a script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  main();
}
