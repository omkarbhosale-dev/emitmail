import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createApp } from './src/app.js';
import { prisma } from './src/config/db.js';
import { redis } from './src/config/redis.js';

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

// Ensure logs directory exists
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
  const baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;

  logSection('EMITMAIL STANDALONE END-TO-END WORKFLOW TEST SUITE');
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

  // 2. Start Dedicated Local Test Server on 127.0.0.1
  log('\n--- 2. Starting Dedicated Test HTTP Server ---');
  const app = createApp();
  const server = app.listen(TEST_PORT, '127.0.0.1');
  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });
  log(`✅ Dedicated test server listening on http://127.0.0.1:${TEST_PORT}`);

  let accessToken = '';
  let createdDomainId = '';
  let createdDomainName = `test-${Date.now()}.org`;
  let createdApiKeyId = '';
  let rawApiKey = '';
  let rawApiSecret = '';

  const executeStep = async (
    step: number,
    name: string,
    method: string,
    endpoint: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      expectedStatus?: number | number[];
    } = {}
  ): Promise<{ status: number; data: any }> => {
    const start = Date.now();
    const url = `${baseUrl}${endpoint}`;
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

    // Step 2: System Version & Update Check
    await executeStep(2, 'System Version Check (Cached/Default)', 'GET', '/system/version', {
      expectedStatus: 200,
    });

    // Step 3: System Version Check (Forced GitHub Refresh)
    await executeStep(3, 'System Version Check (Force Refresh)', 'GET', '/system/version?force=true', {
      expectedStatus: 200,
    });

    // Step 4: Login as Default Admin
    const loginRes = await executeStep(4, 'Admin Authentication Login', 'POST', '/auth/login', {
      body: {
        username: 'admin',
        password: 'emitmail',
      },
      expectedStatus: 200,
    });

    if (loginRes.data?.data?.accessToken) {
      accessToken = loginRes.data.data.accessToken;
      log(`   🔑 Obtained Admin Access Token: ${accessToken.substring(0, 20)}...`);
    } else {
      throw new Error('Failed to obtain accessToken from login response.');
    }

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Step 5: Get Current Admin Profile (Me)
    await executeStep(5, 'Get Current Admin Profile', 'GET', '/auth/me', {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 6: Get Master Server Configuration & DNS Checklist
    await executeStep(6, 'Get Master Server Config & DNS Checklist', 'GET', '/server-config', {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 7: Update Master Server Configuration
    await executeStep(7, 'Update Master Server Configuration', 'PATCH', '/server-config', {
      headers: authHeader,
      body: {
        mailServerHostname: 'mail.workflow-test.com',
        spfIncludeDomain: '_spf.workflow-test.com',
        vpsPublicIpv4: '198.51.100.25',
      },
      expectedStatus: 200,
    });

    // Step 8: Get User Settings
    await executeStep(8, 'Get User Settings', 'GET', '/users/settings', {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 9: Update User Settings
    await executeStep(9, 'Update User Settings', 'PATCH', '/users/settings', {
      headers: authHeader,
      body: {
        fullName: 'EmitMail Lead Architect',
        email: 'architect@emitmail.dev',
        timezone: 'Asia/Kolkata',
      },
      expectedStatus: 200,
    });

    // Step 10: Register New Sender Domain
    const domainRes = await executeStep(10, 'Register New Sender Domain', 'POST', '/domains', {
      headers: authHeader,
      body: {
        domainName: createdDomainName,
        dkimSelector: 'esp',
        returnPathSubdomain: 'send',
      },
      expectedStatus: 201,
    });

    if (domainRes.data?.data?.id) {
      createdDomainId = domainRes.data.data.id;
      log(`   🌐 Created Domain ID: ${createdDomainId}`);
    } else {
      throw new Error('Failed to obtain created domain ID.');
    }

    // Step 11: Get Domain By ID (Inspect 4 DNS records: DKIM, SPF, MX, DMARC)
    await executeStep(11, 'Get Domain By ID', 'GET', `/domains/${createdDomainId}`, {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 12: List All Registered Domains
    await executeStep(12, 'List Registered Domains', 'GET', '/domains', {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 13: Live DNS Verification Engine
    // For a random test domain, this queries Cloudflare/Google public DNS and accurately marks missing records
    await executeStep(13, 'Run Live DNS Verification Engine', 'POST', `/domains/${createdDomainId}/verify`, {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 14: Generate High-Entropy API Key & Secret
    const apiKeyRes = await executeStep(14, 'Generate Scoped API Key & Secret', 'POST', '/api-keys', {
      headers: authHeader,
      body: {
        name: 'Workflow Integration Key',
        domainId: null, // all verified domains
        expiresAt: null,
      },
      expectedStatus: 201,
    });

    if (apiKeyRes.data?.data?.apiKey && apiKeyRes.data?.data?.apiSecret) {
      createdApiKeyId = apiKeyRes.data.data.id;
      rawApiKey = apiKeyRes.data.data.apiKey;
      rawApiSecret = apiKeyRes.data.data.apiSecret;
      log(`   🔐 Created Key ID: ${createdApiKeyId}`);
      log(`   🔑 Raw API Key: ${rawApiKey.substring(0, 16)}...`);
      log(`   🔒 Raw API Secret: ${rawApiSecret.substring(0, 16)}...`);
    } else {
      throw new Error('Failed to obtain raw API Key and Secret.');
    }

    // Step 15: List All API Keys (Hashes stored, raw secret hidden)
    await executeStep(15, 'List All API Keys', 'GET', '/api-keys', {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 16: Public SDK Handshake Test using x-api-key and x-api-secret headers
    await executeStep(
      16,
      'SDK Handshake (Verify API Credentials)',
      'POST',
      '/api-keys/verify-credentials',
      {
        headers: {
          'x-api-key': rawApiKey,
          'x-api-secret': rawApiSecret,
        },
        expectedStatus: 200,
      }
    );

    // Step 17: Toggle API Key Active/Paused Status
    await executeStep(17, 'Toggle API Key Status', 'PATCH', `/api-keys/${createdApiKeyId}/toggle`, {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 18: Delete Test API Key
    await executeStep(18, 'Delete API Key', 'DELETE', `/api-keys/${createdApiKeyId}`, {
      headers: authHeader,
      expectedStatus: 200,
    });

    // Step 19: Delete Test Domain
    await executeStep(19, 'Delete Test Domain', 'DELETE', `/domains/${createdDomainId}`, {
      headers: authHeader,
      expectedStatus: 200,
    });

  } catch (err) {
    log(`❌ Fatal workflow error: ${err instanceof Error ? err.message : err}`, true);
  } finally {
    // Close Test Server & Connections
    log('\n--- 4. Teardown & Connection Cleanup ---');
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    log('✅ Workflow execution and test teardown complete.');
  }

  // Print Summary Table
  logSection('WORKFLOW EXECUTION SUMMARY');
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
      `| ${String(r.step).padEnd(4)} | ${r.method.padEnd(6)} | ${r.endpoint.padEnd(35)} | ${String(r.statusCode).padEnd(6)} | ${(r.durationMs + 'ms').padEnd(7)} | ${r.success ? '✅ PASS' : '❌ FAIL'} | ${r.summary} |`
    );
  }

  logStream.end();

  // Also copy to latest log for easy reference
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
