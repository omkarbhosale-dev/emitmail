import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const candidateEnvPaths = [
  path.resolve(currentDir, '../../../../.env'),
  path.resolve(currentDir, '../../../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
];

const resolvedEnvPath = candidateEnvPaths.find((p) => fs.existsSync(p));
if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://emitmail:emitmail_pass@localhost:5432/emitmail?schema=public'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .regex(/^[0-9a-fA-F]{64}$/)
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  EMAIL_QUEUE_NAME: z.string().default('email-delivery-queue'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(false),
  DIRECT_MX_FALLBACK: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(true),
  SMTP_EHLO_HOSTNAME: z.string().default('mail.example.com'),
  MAIL_SERVER_HOSTNAME: z.string().default('mail.example.com'),
  SENDING_SERVER_IP: z.string().default('0.0.0.0'),
  RETURN_PATH_SUBDOMAIN: z.string().default('send'),
  INBOUND_EMAIL_QUEUE_NAME: z.string().default('inbound-email'),
});

const parseEnv = () => {
  const rawEnv = {
    ...process.env,
    ENCRYPTION_KEY:
      process.env.ENCRYPTION_KEY && (process.env.NODE_ENV === 'production' || process.env.ENCRYPTION_KEY !== 'changeme')
        ? process.env.ENCRYPTION_KEY
        : '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    SMTP_HOST: process.env.SMTP_HOST || process.env.SMTP_RELAY_HOST,
    SMTP_PORT: process.env.SMTP_PORT || process.env.SMTP_RELAY_PORT,
    SMTP_USER: process.env.SMTP_USER || process.env.SMTP_RELAY_USER,
    SMTP_PASS: process.env.SMTP_PASS || process.env.SMTP_RELAY_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE || process.env.SMTP_RELAY_SECURE,
    SMTP_EHLO_HOSTNAME:
      process.env.SMTP_EHLO_HOSTNAME ||
      process.env.MAIL_SERVER_HOSTNAME ||
      'mail.example.com',
    MAIL_SERVER_HOSTNAME:
      process.env.MAIL_SERVER_HOSTNAME ||
      process.env.SMTP_EHLO_HOSTNAME ||
      'mail.example.com',
    SENDING_SERVER_IP: process.env.SENDING_SERVER_IP || process.env.VPS_PUBLIC_IPV4 || '0.0.0.0',
    RETURN_PATH_SUBDOMAIN: process.env.RETURN_PATH_SUBDOMAIN || 'send',
  };

  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    console.error('❌ [Worker] Invalid environment variables configuration:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  if (result.data.NODE_ENV === 'production' && result.data.ENCRYPTION_KEY === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
    console.error('❌ [Worker] Production requires a unique ENCRYPTION_KEY.');
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
