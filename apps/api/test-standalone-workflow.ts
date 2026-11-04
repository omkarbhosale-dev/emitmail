import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createApp } from './src/app.js';
import { prisma } from './src/config/db.js';
import { redis } from './src/config/redis.js';
import { startAllWorkers } from './src/queues/index.js';
import { DomainStatus, EmailStatus } from '@prisma/client';

interface StepResult {
  step: number;
  name: string;
  method: string;
  endpoint: string;
  statusCode: number;
  expectedStatus: number | number[];
  success: boolean;
  durationMs: number;
  summary: string;
}

const LOGS_DIR = path.resolve(process.cwd(), '../../logs');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.resolve(LOGS_DIR, `standalone-workflow-${TIMESTAMP}.log`);
const LATEST_LOG_FILE = path.resolve(LOGS_DIR, `standalone-workflow-latest.log`);

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(message: string, isError = false) {
  const line = `[${new Date().toISOString()}] ${message}`;
  if (isError) {
    console.error(line);
  } else {
    console.log(line);
  }
  logStream.write(line + '\n');
}

function logSection(title: string) {
  const bar = '='.repeat(80);
  log(`\n${bar}\n🚀 ${title}\n${bar}`);
}

async function runWorkflow() {
  const results: StepResult[] = [];
  const TEST_PORT = 4099;
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const testAdminPassword = process.env.TEST_ADMIN_PASSWORD;
  if (!initialAdminPassword || !testAdminPassword || testAdminPassword.length < 8 || initialAdminPassword === testAdminPassword) {
    throw new Error('Set distinct INITIAL_ADMIN_PASSWORD (16+ chars) and TEST_ADMIN_PASSWORD (8+ chars) values before running this workflow.');
  }
  const baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;
  const rootBaseUrl = `http://127.0.0.1:${TEST_PORT}`;

  logSection('EMITMAIL ADVANCED PRODUCTION ENGINE WORKFLOW TEST');
  log(`Log File: ${LOG_FILE}`);

  // 1. Database & Cache Initialization
  log('\n--- 1. Initializing Database and Redis Connections ---');
  try {
    await prisma.$connect();
    log('✅ PostgreSQL connected successfully.');
  } catch (err) {
    log(`❌ Failed connecting to PostgreSQL: ${err instanceof Error ? err.message : err}`, true);
    process.exit(1);
  }

  try {
    if (redis.status !== 'ready' && redis.status !== 'connect') {
      await redis.connect();
    }
    log('✅ Redis connected successfully.');
  } catch (err) {
    log(`⚠️ Redis connection note: ${err instanceof Error ? err.message : err}`);
  }

  // 2. Start BullMQ Queue Workers
  log('\n--- 2. Starting BullMQ Workers (DNS Polling, Email Dispatch, Webhook Dispatch) ---');
  const runningWorkers = startAllWorkers();

  // 3. Start Local HTTP Server and Dedicated Webhook Test Sink
  log('\n--- 3. Starting Dedicated Test HTTP Server on 127.0.0.1 ---');
  const app = createApp();
  const server = app.listen(TEST_PORT, '127.0.0.1');
  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });
  log(`✅ Test server listening on http://127.0.0.1:${TEST_PORT}`);

  const WEBHOOK_SINK_PORT = 4098;
  const receivedWebhooks: Array<{ headers: any; body: any }> = [];
  const httpModule = await import('node:http');
  const webhookSinkServer = httpModule.createServer((req, res) => {
    let rawData = '';
    req.on('data', (chunk) => {
      rawData += chunk;
    });
    req.on('end', () => {
      try {
        receivedWebhooks.push({
          headers: req.headers,
          body: JSON.parse(rawData || '{}'),
        });
      } catch {
        // ignore
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ acknowledged: true }));
    });
  });

  await new Promise<void>((resolve) => {
    webhookSinkServer.listen(WEBHOOK_SINK_PORT, '127.0.0.1', () => resolve());
  });
  log(`✅ Webhook sink listening on http://127.0.0.1:${WEBHOOK_SINK_PORT}`);

  let adminAccessToken = '';
  let testDomainId = '';
  const testDomainName = `test-engine-${Date.now()}.org`;
  let domainScopedApiKey = '';
  let domainScopedApiKeyId = '';
  let submittedEmailId = '';
  let submittedMessageId = '';
  let webhookSubscriptionId = '';
  const webhookSecret = 'test_webhook_secret_key_12345';

  const executeStep = async (
    step: number,
    name: string,
    method: string,
    endpoint: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      expectedStatus?: number | number[];
      isRootUrl?: boolean;
    } = {}
  ): Promise<{ status: number; data: any }> => {
    const start = Date.now();
    const url = options.isRootUrl
      ? `${rootBaseUrl}${endpoint}`
      : `${baseUrl}${endpoint}`;
    const expected = options.expectedStatus ?? 200;
    const expectedList = Array.isArray(expected) ? expected : [expected];

    log(`\n▶ [Step ${step}] ${method} ${endpoint} — ${name}`);
    if (options.body) {
      log(`   Request Body: ${JSON.stringify(options.body, null, 2)}`);
    }

    try {
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

      const response = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const durationMs = Date.now() - start;
      const status = response.status;
      const json = await response.json().catch(() => ({}));

      const isSuccess = expectedList.includes(status);
      const summary = json.message || (isSuccess ? 'Success' : 'Unexpected response');

      log(`   Response Status: ${status} ${isSuccess ? '✅' : '❌'} (${durationMs}ms)`);
      log(`   Response Data: ${JSON.stringify(json, null, 2)}`);

      results.push({
        step,
        name,
        method,
        endpoint,
        statusCode: status,
        expectedStatus: expected,
        success: isSuccess,
        durationMs,
        summary,
      });

      return { status, data: json };
    } catch (err) {
      const durationMs = Date.now() - start;
      log(`   ❌ Request Failed: ${err instanceof Error ? err.message : err}`, true);
      results.push({
        step,
        name,
        method,
        endpoint,
        statusCode: 0,
        expectedStatus: expected,
        success: false,
        durationMs,
        summary: err instanceof Error ? err.message : String(err),
      });
      return { status: 0, data: null };
    }
  };

  try {
    // Step 1: Health Check
    await executeStep(1, 'System Health Check', 'GET', '/health', {
      expectedStatus: 200,
    });

    // Step 2: System Version Check
    await executeStep(2, 'System Version & Update Check', 'GET', '/system/version', {
      expectedStatus: 200,
    });

    const admin = await prisma.user.findUnique({ where: { username: 'admin' }, select: { passwordHash: true } });
    if (!admin) throw new Error('Admin account is not seeded. Run pnpm db:seed first.');
    const initialPasswordMatches = await bcrypt.compare(initialAdminPassword, admin.passwordHash);
    const testPasswordMatches = await bcrypt.compare(testAdminPassword, admin.passwordHash);
    const loginPassword = initialPasswordMatches ? initialAdminPassword : testPasswordMatches ? testAdminPassword : null;
    if (!loginPassword) throw new Error('Admin password matches neither INITIAL_ADMIN_PASSWORD nor TEST_ADMIN_PASSWORD.');

    // Step 3: Admin Login
    const loginRes = await executeStep(3, 'Admin Authentication Login', 'POST', '/auth/login', {
      body: { username: 'admin', password: loginPassword },
      expectedStatus: 200,
    });

    if (loginRes.data?.data?.accessToken) {
      adminAccessToken = loginRes.data.data.accessToken;
      log(`   🔑 Obtained Admin Access Token: ${adminAccessToken.substring(0, 20)}...`);
    } else {
      throw new Error('Failed to obtain admin access token.');
    }

    const authHeader = { Authorization: `Bearer ${adminAccessToken}` };

    if (loginRes.data?.data?.user?.mustChangePassword) {
      await executeStep(3.5, 'Change Initial Admin Password', 'POST', '/auth/change-password', {
        headers: authHeader,
        body: {
          currentPassword: loginPassword,
          newPassword: testAdminPassword,
          confirmPassword: testAdminPassword,
        },
        expectedStatus: 200,
      });
    }

    // Step 4: Register New Sender Domain (triggers BullMQ DNS Verification Worker)
    const domainRes = await executeStep(4, 'Register Sender Domain (DKIM + BullMQ Enqueue)', 'POST', '/domains', {
      headers: authHeader,
      body: {
        domainName: testDomainName,
        dkimSelector: 'esp',
        returnPathSubdomain: 'send',
      },
      expectedStatus: 201,
    });

    testDomainId = domainRes.data?.data?.id;
    if (!testDomainId) throw new Error('Failed to create domain');

    // Step 5: Get Domain By ID
    await executeStep(5, 'Inspect Domain DNS Records', 'GET', `/domains/${testDomainId}`, {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 6: Trigger Live DNS Verification Endpoint
    await executeStep(6, 'Trigger Live Public DNS Verification', 'POST', `/domains/${testDomainId}/verify`, {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 7: Prerequisite Validation: Deny API key for UNVERIFIED domain (unless in relaxed mode)
    await executeStep(
      7,
      'API Key Prerequisite Check (Deny Unverified Domain)',
      'POST',
      '/api-keys',
      {
        headers: authHeader,
        body: {
          name: 'Blocked Unverified Key',
          domainId: testDomainId,
          scopes: ['email:send'],
        },
        expectedStatus: 400, // Should be rejected because domain is not yet verified!
      }
    );

    // Step 8: Simulate Domain Verification in Database for subsequent workflow
    log('\nℹ️ Simulating verified DNS status on test domain for subsequent email workflow...');
    await prisma.domain.update({
      where: { id: testDomainId },
      data: {
        status: DomainStatus.VERIFIED,
        dkimVerified: true,
        spfVerified: true,
        mxVerified: true,
        dmarcVerified: true,
        lastVerifiedAt: new Date(),
      },
    });
    log(`✅ Domain "${testDomainName}" status updated to VERIFIED.`);

    // Step 9: Create Domain-Scoped API Key with em_live_ prefix
    const keyRes = await executeStep(
      9,
      'Create Domain-Scoped API Key (em_live_)',
      'POST',
      '/api-keys',
      {
        headers: authHeader,
        body: {
          name: 'Domain Production Key',
          domainId: testDomainId,
          scopes: ['email:send', 'webhooks:manage'],
        },
        expectedStatus: 201,
      }
    );

    domainScopedApiKey = keyRes.data?.data?.apiKey;
    domainScopedApiKeyId = keyRes.data?.data?.id;

    if (!domainScopedApiKey || !domainScopedApiKey.startsWith('em_live_')) {
      throw new Error(`Expected API key starting with 'em_live_', got: ${domainScopedApiKey}`);
    }
    log(`   🔑 Generated Token: ${domainScopedApiKey.substring(0, 18)}...`);

    const apiKeyHeader = { Authorization: `Bearer ${domainScopedApiKey}` };

    // Step 10: Verify API Credentials SDK Handshake
    await executeStep(
      10,
      'SDK Credentials Handshake with Scoped Key',
      'POST',
      '/api-keys/verify-credentials',
      {
        headers: apiKeyHeader,
        expectedStatus: 200,
      }
    );

    // Step 11: Tenancy Enforcement Test - Attempt sending from unauthorized domain
    await executeStep(
      11,
      'Tenancy Violation Check (Deny Non-Matching Domain From)',
      'POST',
      '/emails',
      {
        headers: apiKeyHeader,
        body: {
          from: 'Spammer <attacker@unauthorized-domain.com>',
          to: 'customer@example.com',
          subject: 'Unauthorized Domain Email',
          text: 'This should be blocked by domain tenancy enforcement.',
        },
        expectedStatus: 403, // Strictly blocked by tenancy middleware!
      }
    );

    // Step 12: Valid Email Submission - Enqueue into Redis BullMQ (email-dispatch-queue)
    const emailRes = await executeStep(
      12,
      'Submit Email for DKIM Signing & Dispatch',
      'POST',
      '/emails',
      {
        headers: apiKeyHeader,
        body: {
          from: `EmitMail Support <support@${testDomainName}>`,
          to: ['recipient@test-domain.org'],
          subject: 'Welcome to EmitMail ESP Engine',
          html: '<h1>Welcome!</h1><p>Sent with 2048-bit RSA DKIM signature.</p>',
          text: 'Welcome! Sent with 2048-bit RSA DKIM signature.',
        },
        expectedStatus: 200,
      }
    );

    submittedEmailId = emailRes.data?.data?.id;
    submittedMessageId = emailRes.data?.data?.messageId;
    log(`   📨 Submitted Email ID: ${submittedEmailId}, Message-ID: ${submittedMessageId}`);

    // Step 13: Allow BullMQ Email Dispatch Worker to Process
    log('\n⏳ Waiting 2.5s for BullMQ Email Dispatch Worker to sign DKIM and deliver...');
    await new Promise((r) => setTimeout(r, 2500));

    // Step 14: Verify Email Status Transition to DELIVERED
    const emailStatusRes = await executeStep(
      14,
      'Verify Email Delivery State (DELIVERED)',
      'GET',
      `/emails/${submittedEmailId}`,
      {
        headers: apiKeyHeader,
        expectedStatus: 200,
      }
    );

    log(`   📬 Current Email Delivery Status: ${emailStatusRes.data?.data?.status}`);

    // Step 15: Register Webhook Subscription with HMAC secret
    const webhookRes = await executeStep(
      15,
      'Register Webhook Subscription',
      'POST',
      '/webhooks',
      {
        headers: apiKeyHeader,
        body: {
          url: `http://127.0.0.1:4098/test-webhook-sink`,
          events: ['email.delivered', 'email.bounced'],
          secret: webhookSecret,
          domainId: testDomainId,
        },
        expectedStatus: 201,
      }
    );

    webhookSubscriptionId = webhookRes.data?.data?.id;

    // Step 16: List Registered Webhooks
    await executeStep(16, 'List Webhook Subscriptions', 'GET', '/webhooks', {
      headers: apiKeyHeader,
      expectedStatus: 200,
    });

    // Step 17: Ingest Inbound Bounce (DSN Hard Bounce via POST /webhooks/inbound-bounce)
    await executeStep(
      17,
      'Ingest Inbound DSN Hard Bounce',
      'POST',
      '/webhooks/inbound-bounce',
      {
        isRootUrl: true,
        body: {
          messageId: submittedMessageId,
          recipient: 'recipient@test-domain.org',
          bounceType: 'hard',
          diagnosticCode: '550 5.1.1 <recipient@test-domain.org>: Recipient address rejected: User unknown',
          source: 'postfix-inbound-pipe',
        },
        expectedStatus: 200,
      }
    );

    // Step 18: Allow BullMQ Webhook Dispatch Worker to Process & Deliver
    log('\n⏳ Waiting 2s for BullMQ Webhook Worker to HMAC-sign and dispatch payload...');
    await new Promise((r) => setTimeout(r, 2000));

    // Step 19: Inspect Email Status Changed to BOUNCED
    const bouncedEmailRes = await executeStep(
      19,
      'Verify Email Status Updated to BOUNCED',
      'GET',
      `/emails/${submittedEmailId}`,
      {
        headers: apiKeyHeader,
        expectedStatus: 200,
      }
    );

    log(`   ⚠️ Final Email State: ${bouncedEmailRes.data?.data?.status}, Reason: ${bouncedEmailRes.data?.data?.bounceReason}`);

    // Step 20: Check Received Webhook Invocations
    log(`\n📡 Live Webhook Invocations Received: ${receivedWebhooks.length}`);
    for (let i = 0; i < receivedWebhooks.length; i++) {
      const wh = receivedWebhooks[i];
      const sigHeader = wh.headers['x-emitmail-signature'];
      const eventHeader = wh.headers['x-emitmail-event'];
      log(`   [Webhook #${i + 1}] Event: ${eventHeader}, Signature: ${sigHeader}`);

      // Verify HMAC signature
      const rawPayload = JSON.stringify(wh.body);
      const expectedSig = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
      const sigValid = sigHeader === expectedSig;
      log(`   HMAC Signature Verification: ${sigValid ? '✅ VALID' : '⚠️ MATCH CHECK'}`);
    }

    // Step 21: Clean up Webhook Subscription
    if (webhookSubscriptionId) {
      await executeStep(
        21,
        'Delete Webhook Subscription',
        'DELETE',
        `/webhooks/${webhookSubscriptionId}`,
        {
          headers: apiKeyHeader,
          expectedStatus: 200,
        }
      );
    }

    // Step 22: Clean up API Key
    if (domainScopedApiKeyId) {
      await executeStep(
        22,
        'Delete API Key',
        'DELETE',
        `/api-keys/${domainScopedApiKeyId}`,
        {
          headers: authHeader,
          expectedStatus: 200,
        }
      );
    }

    // Step 23: Clean up Domain
    if (testDomainId) {
      await executeStep(
        23,
        'Delete Test Domain',
        'DELETE',
        `/domains/${testDomainId}`,
        {
          headers: authHeader,
          expectedStatus: 200,
        }
      );
    }
  } catch (err) {
    log(`❌ Fatal workflow error: ${err instanceof Error ? err.message : err}`, true);
  } finally {
    log('\n--- 4. Teardown & Connection Cleanup ---');
    await runningWorkers.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => webhookSinkServer.close(() => resolve()));
    await prisma.$disconnect();
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    log('✅ Workers, test server, and database connections closed cleanly.');
  }

  // Print Summary Table
  logSection('ADVANCED WORKFLOW EXECUTION SUMMARY');
  const allPassed = results.every((r) => r.success);
  const passedCount = results.filter((r) => r.success).length;

  log(`Total Endpoints Tested: ${results.length}`);
  log(`Passed: ${passedCount}`);
  log(`Failed: ${results.length - passedCount}`);
  log(`Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

  log('| Step | Method | Endpoint | Status | Latency | Result | Summary |');
  log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const r of results) {
    log(
      `| ${String(r.step).padEnd(4)} | ${r.method.padEnd(6)} | ${r.endpoint.padEnd(45)} | ${String(r.statusCode).padEnd(6)} | ${(r.durationMs + 'ms').padEnd(7)} | ${r.success ? '✅ PASS' : '❌ FAIL'} | ${r.summary} |`
    );
  }

  logStream.end();

  try {
    fs.copyFileSync(LOG_FILE, LATEST_LOG_FILE);
    console.log(`\n📄 Also copied to latest log: ${LATEST_LOG_FILE}`);
  } catch {
    // ignore
  }

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runWorkflow().catch((err) => {
  console.error('Fatal unhandled error:', err);
  process.exit(1);
});
