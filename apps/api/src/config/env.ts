export const OFFICIAL_GITHUB_REPO = 'omkarbhosale-dev/emitmail' as const;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import semver from 'semver';

// Resolve directory name safely for CommonJS runtime
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// Candidate paths to locate the single root .env file
const candidateEnvPaths = [
  path.resolve(currentDir, '../../../../.env'), // from dist/config/ or src/config/ to repo root
  path.resolve(currentDir, '../../../.env'),
  path.resolve(process.cwd(), '../../.env'), // if running from inside apps/api
  path.resolve(process.cwd(), '.env'), // if running from monorepo root
];

const resolvedEnvPath = candidateEnvPaths.find((envPath) => fs.existsSync(envPath));

if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath });
} else {
  dotenv.config(); // fallback to default
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PORT: z.coerce.number().int().positive().optional(),
  DASHBOARD_PORT: z.coerce.number().int().positive().default(3000),
  DOCS_PORT: z.coerce.number().int().positive().default(3001),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000/api/v1'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://emitmail:emitmail_pass@localhost:5432/emitmail?schema=public'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, { message: 'JWT_SECRET must be at least 32 characters long' })
    .default('emitmail_super_secret_jwt_key_change_in_prod_2026'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, { message: 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)' })
    .regex(/^[0-9a-fA-F]{64}$/, { message: 'ENCRYPTION_KEY must be a valid hex string' })
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  MAIL_SERVER_HOSTNAME: z.string().min(1).default('mail.yourdomain.com'),
  SPF_INCLUDE_DOMAIN: z.string().min(1).default('_spf.yourdomain.com'),
  VPS_PUBLIC_IPV4: z.string().default('0.0.0.0'),
  CURRENT_VERSION: z.string().default('1.0.0'),
  APP_VERSION: z.string().optional(),
  GITHUB_REPO: z.string().default('omkarbhosale-dev/emitmail'),
  GITHUB_TOKEN: z.string().optional(),
  UPDATER_SECRET: z.string().default('changeme'),
  UPDATER_URL: z.string().default('http://updater:9999/trigger-update'),
  ALLOW_PENDING_DOMAIN_API_KEYS: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(false),
  SMTP_RELAY_HOST: z.string().optional(),
  SMTP_RELAY_PORT: z.coerce.number().int().positive().default(587),
  SMTP_RELAY_USER: z.string().optional(),
  SMTP_RELAY_PASS: z.string().optional(),
  SMTP_RELAY_SECURE: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(false),
  DIRECT_MX_FALLBACK: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(true),
  EMAIL_QUEUE_NAME: z.string().default('email-delivery-queue'),
  START_WORKERS: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(false),
  SMTP_EHLO_HOSTNAME: z.string().default('mail.example.com'),
  SENDING_SERVER_IP: z.string().default('0.0.0.0'),
  RETURN_PATH_SUBDOMAIN: z.string().default('send'),
  INBOUND_SMTP_ENABLED: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(true),
  INBOUND_SMTP_PORT: z.coerce.number().int().positive().default(2525),
  INBOUND_SMTP_HOST: z.string().default('0.0.0.0'),
  INBOUND_MAX_BYTES: z.coerce.number().int().positive().default(26214400),
  INBOUND_EMAIL_QUEUE_NAME: z.string().default('inbound-email'),
  INBOUND_TLS_KEY_PATH: z.string().optional(),
  INBOUND_TLS_CERT_PATH: z.string().optional(),
});

const parseEnv = () => {
  // Read package.json version if available
  let packageJsonVersion: string | undefined;
  try {
    const candidatePkgPaths = [
      path.resolve(currentDir, '../../package.json'), // from src/config or dist/config
      path.resolve(process.cwd(), 'package.json'),
      path.resolve(process.cwd(), 'apps/api/package.json'),
    ];
    for (const pkgPath of candidatePkgPaths) {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (typeof pkg.version === 'string' && pkg.version.length > 0) {
          packageJsonVersion = pkg.version;
          break;
        }
      }
    }
  } catch {
    // ignore
  }

  // If APP_VERSION is 'latest' or omitted, use the image's baked package.json release version
  const rawAppVersion = process.env.APP_VERSION?.trim();
  const isExplicitVersion =
    Boolean(rawAppVersion) &&
    rawAppVersion?.toLowerCase() !== 'latest' &&
    Boolean(semver.valid(semver.coerce(rawAppVersion)));

  const resolvedCurrentVersion = isExplicitVersion && rawAppVersion
    ? rawAppVersion
    : (packageJsonVersion || '1.0.0');

  // Support both PORT and API_PORT, and fallback to package.json for CURRENT_VERSION
  const rawEnv = {
    ...process.env,
    PORT: process.env.API_PORT || process.env.PORT || '4000',
    APP_VERSION: process.env.APP_VERSION,
    CURRENT_VERSION: resolvedCurrentVersion,
    GITHUB_REPO: process.env.GITHUB_REPO || OFFICIAL_GITHUB_REPO,
    UPDATER_SECRET: process.env.UPDATER_SECRET || 'changeme',
    UPDATER_URL: process.env.UPDATER_URL || 'http://updater:9999/trigger-update',
    SMTP_EHLO_HOSTNAME:
      process.env.SMTP_EHLO_HOSTNAME ||
      process.env.MAIL_SERVER_HOSTNAME ||
      'mail.example.com',
    SENDING_SERVER_IP: process.env.SENDING_SERVER_IP || process.env.VPS_PUBLIC_IPV4 || '0.0.0.0',
    RETURN_PATH_SUBDOMAIN: process.env.RETURN_PATH_SUBDOMAIN || 'send',
  };

  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
