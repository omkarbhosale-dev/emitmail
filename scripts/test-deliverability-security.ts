import { prisma } from '../apps/api/src/config/db.js';
import { redis } from '../apps/api/src/config/redis.js';
import { createApp } from '../apps/api/src/app.js';
import { generateDomainScopedApiKey, generateUnsubscribeToken } from '../apps/api/src/utils/crypto.js';
import { MtaStsService } from '../apps/worker/src/services/mtaSts.service.js';
import { SuppressionReason, EmailStatus } from '@prisma/client';
import http from 'http';

const TEST_PORT = 4085;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n🚀 Starting Deliverability & Outbound Security Verification Suite...\n');

  // Start API server on isolated test port
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`📡 Test API server listening on ${BASE_URL}`);

  try {
    // 0. Setup Test Domain & API Key
    const testDomainName = `deliverability-test-${Date.now()}.org`;
    const domain = await prisma.domain.create({
      data: {
        domainName: testDomainName,
        status: 'VERIFIED',
        dkimSelector: 'em',
        dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...',
        dkimPrivateKeyEnc: 'encrypted-key-sample',
        dnsRecords: [],
        tlsPolicy: 'enforce',
      },
    });

    const { rawToken, keyPrefix, keyHash } = generateDomainScopedApiKey('em_live_');
    await prisma.apiKey.create({
      data: {
        domainId: domain.id,
        name: 'Deliverability Test Key',
        keyPrefix,
        keyHash,
        scopes: ['email:send'],
        isActive: true,
      },
    });

    const authHeaders = {
      Authorization: `Bearer ${rawToken}`,
      'Content-Type': 'application/json',
    };

    console.log(`\n--- Test 1: Suppression Management API Endpoints ---`);
    // 1.1 POST /suppressions (Manual addition)
    const manualEmail = `suppressed-manual-${Date.now()}@victim.org`;
    const createRes = await fetch(`${BASE_URL}/suppressions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: manualEmail,
        reason: 'MANUAL',
        details: 'Admin requested block',
      }),
    });
    const createJson = (await createRes.json()) as any;
    assert(createRes.status === 201, 'POST /suppressions returns 201 Created');
    assert(createJson.data.email === manualEmail.toLowerCase(), 'Suppression email normalized and saved');
    assert(createJson.data.reason === 'MANUAL', 'Suppression reason is MANUAL');
    const suppressionId = createJson.data.id;

    // 1.2 GET /suppressions (Pagination and domain scoping)
    const listRes = await fetch(`${BASE_URL}/suppressions?search=${manualEmail}`, {
      headers: authHeaders,
    });
    const listJson = (await listRes.json()) as any;
    assert(listRes.status === 200, 'GET /suppressions returns 200 OK');
    assert(listJson.data.suppressions.length === 1, 'Found created suppression via search query');
    assert(listJson.data.pagination.total >= 1, 'Pagination total count matches');

    // 1.3 DELETE /suppressions/:id (Unsuppress)
    const deleteRes = await fetch(`${BASE_URL}/suppressions/${suppressionId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(deleteRes.status === 200, 'DELETE /suppressions/:id returns 200 OK');

    const verifyDeleteRes = await fetch(`${BASE_URL}/suppressions?search=${manualEmail}`, {
      headers: authHeaders,
    });
    const verifyDeleteJson = (await verifyDeleteRes.json()) as any;
    assert(verifyDeleteJson.data.suppressions.length === 0, 'Suppression was successfully deleted');

    console.log(`\n--- Test 2: Ingestion & Verification Interceptor (Pre-Flight Filter) ---`);
    // Create a new suppression for recipient
    const blockedRecipient = `blocked-${Date.now()}@target.com`;
    await prisma.suppression.create({
      data: {
        domainId: domain.id,
        email: blockedRecipient,
        reason: SuppressionReason.HARD_BOUNCE,
        details: '550 5.1.1 User Unknown',
      },
    });

    // 2.1 Send email to completely suppressed recipient list
    const sendBlockedRes = await fetch(`${BASE_URL}/emails`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        from: `alerts@${testDomainName}`,
        to: [blockedRecipient],
        subject: 'Delivery Guardrail Test',
        html: '<p>Should be suppressed immediately</p>',
      }),
    });
    const sendBlockedJson = (await sendBlockedRes.json()) as any;
    assert(sendBlockedRes.status === 200, 'POST /emails returns 200 acknowledgment');
    assert(sendBlockedJson.status === 'suppressed', 'Response status is "suppressed"');
    assert(sendBlockedJson.suppressed === true, 'Response suppressed flag is true');
    assert(sendBlockedJson.suppressionReason.includes('HARD_BOUNCE'), 'Suppression reason is detailed');

    // Verify DB status is SUPPRESSED
    const dbEmail = await prisma.email.findUnique({
      where: { id: sendBlockedJson.id },
    });
    assert(dbEmail?.status === EmailStatus.SUPPRESSED, 'Email status in DB is SUPPRESSED');

    // 2.2 Partial suppression: mix of suppressed and active recipients
    const activeRecipient = `active-user-${Date.now()}@target.com`;
    const sendPartialRes = await fetch(`${BASE_URL}/emails`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        from: `alerts@${testDomainName}`,
        to: [blockedRecipient, activeRecipient],
        subject: 'Partial Delivery Guardrail Test',
        html: '<p>Only active recipient should receive</p>',
      }),
    });
    const sendPartialJson = (await sendPartialRes.json()) as any;
    assert(sendPartialRes.status === 200, 'Partial email send returns 200 OK');
    assert(sendPartialJson.status === 'queued', 'Partial send with active recipients is queued');
    const partialDbEmail = await prisma.email.findUnique({
      where: { id: sendPartialJson.id },
    });
    assert(partialDbEmail?.to.length === 1 && partialDbEmail.to[0] === activeRecipient, 'Filtered out blocked recipient from queue');

    console.log(`\n--- Test 3: Inbound Bounce DSN Auto-Suppression ---`);
    // 3.1 Hard bounce DSN webhook
    const hardBounceRecipient = `hardbounce-${Date.now()}@external.net`;
    const bounceWebhookRes = await fetch(`${BASE_URL}/webhooks/inbound-bounce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: hardBounceRecipient,
        bounceType: 'hard',
        diagnosticCode: '550 5.1.1 User Unknown: Mailbox does not exist',
      }),
    });
    const bounceWebhookJson = (await bounceWebhookRes.json()) as any;
    assert(bounceWebhookRes.status === 200, 'Inbound bounce webhook returns 200 OK');
    assert(bounceWebhookJson.data.suppressed === true, 'Inbound bounce marked as suppressed');

    // Check suppression table
    const hardBounceRecord = await prisma.suppression.findFirst({
      where: { email: hardBounceRecipient },
    });
    assert(hardBounceRecord !== null, 'Recipient automatically inserted into suppressions table');
    assert(hardBounceRecord?.reason === 'HARD_BOUNCE', 'Reason recorded as HARD_BOUNCE');

    // 3.2 Complaint DSN webhook
    const complaintRecipient = `complaint-${Date.now()}@external.net`;
    const complaintWebhookRes = await fetch(`${BASE_URL}/webhooks/inbound-bounce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: complaintRecipient,
        bounceType: 'complaint',
        diagnosticCode: 'Feedback Loop: Spam complaint reported by user',
      }),
    });
    const complaintWebhookJson = (await complaintWebhookRes.json()) as any;
    assert(complaintWebhookRes.status === 200, 'Inbound complaint webhook returns 200 OK');
    assert(complaintWebhookJson.data.suppressed === true, 'Inbound complaint marked as suppressed');

    const complaintRecord = await prisma.suppression.findFirst({
      where: { email: complaintRecipient },
    });
    assert(complaintRecord?.reason === 'COMPLAINT', 'Reason recorded as COMPLAINT');

    console.log(`\n--- Test 4: RFC 8058 One-Click Unsubscribe Headers & Handlers ---`);
    // 4.1 Email submission with List-Unsubscribe headers
    const unsubRecipient = `subscriber-${Date.now()}@client.org`;
    const unsubEmailRes = await fetch(`${BASE_URL}/emails`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        from: `newsletter@${testDomainName}`,
        to: [unsubRecipient],
        subject: 'Weekly Digest',
        html: '<p>Weekly news update</p>',
        listUnsubscribe: {
          url: 'https://example.com/custom-unsub',
          email: 'custom-unsub@example.com',
        },
        unsubscribeMode: 'one-click',
      }),
    });
    const unsubEmailJson = (await unsubEmailRes.json()) as any;
    const unsubDbEmail = await prisma.email.findUnique({
      where: { id: unsubEmailJson.id },
    });
    const headers = unsubDbEmail?.headers as Record<string, string>;
    assert(headers['List-Unsubscribe']?.includes('https://example.com/custom-unsub'), 'List-Unsubscribe header contains URL');
    assert(headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click', 'List-Unsubscribe-Post header is set');

    // 4.2 RFC 8058 Direct Unsubscribe Handler (Sub-500ms POST)
    const tokenRecipient = `oneclick-${Date.now()}@subscriber.org`;
    const unsubToken = generateUnsubscribeToken({
      domainId: domain.id,
      email: tokenRecipient,
      messageId: '<test-message-123@emitmail>',
    });

    const startTime = Date.now();
    const oneClickPostRes = await fetch(`${BASE_URL}/api/v1/unsubscribe/one-click/${unsubToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    const duration = Date.now() - startTime;
    assert(oneClickPostRes.status === 200, 'POST /api/v1/unsubscribe/one-click/:token returns 200 OK');
    assert(duration < 500, `One-click POST resolved in ${duration}ms (< 500ms SLA)`);

    const autoUnsubRecord = await prisma.suppression.findFirst({
      where: { email: tokenRecipient, domainId: domain.id },
    });
    assert(autoUnsubRecord?.reason === 'UNSUBSCRIBE', 'Auto-suppressed address with reason UNSUBSCRIBE');

    // 4.3 GET fallback for human users
    const oneClickGetRes = await fetch(`${BASE_URL}/api/v1/unsubscribe/one-click/${unsubToken}`);
    const htmlBody = await oneClickGetRes.text();
    assert(oneClickGetRes.status === 200, 'GET /api/v1/unsubscribe/one-click/:token returns 200 OK');
    assert(htmlBody.includes('Unsubscribe Confirmation'), 'Fallback HTML confirmation page served');

    console.log(`\n--- Test 5: MTA-STS Policy Resolution Engine & Caching ---`);
    // 5.1 Policy Parser test
    const rawPolicyText = `version: STSv1\nmode: enforce\nmx: *.google.com\nmx: aspmx.l.google.com\nmax_age: 604800\n`;
    const parsedPolicy = MtaStsService.parsePolicy(rawPolicyText);
    assert(parsedPolicy !== null, 'Policy parsed successfully');
    assert(parsedPolicy?.version === 'STSv1', 'Version is STSv1');
    assert(parsedPolicy?.mode === 'enforce', 'Mode is enforce');
    assert(parsedPolicy?.mx.length === 2, 'Parsed 2 MX patterns');
    assert(parsedPolicy?.max_age === 604800, 'Max age parsed correctly');

    // 5.2 MX Host pattern matcher
    assert(MtaStsService.matchMxHost('aspmx.l.google.com', 'aspmx.l.google.com'), 'Exact MX match succeeds');
    assert(MtaStsService.matchMxHost('smtp.google.com', '*.google.com'), 'Wildcard MX pattern match succeeds');
    assert(!MtaStsService.matchMxHost('mail.attacker.com', '*.google.com'), 'Non-matching MX pattern correctly rejected');

    // 5.3 Live or cached MTA-STS resolution
    const gmailPolicy = await MtaStsService.resolvePolicy('gmail.com');
    assert(gmailPolicy !== null, 'Resolved MTA-STS policy for gmail.com');
    assert(gmailPolicy?.version === 'STSv1', 'gmail.com has valid STSv1 policy');

    // Check Redis cache key
    const cachedPolicyStr = await redis.get('emitmail:mta-sts:gmail.com');
    assert(cachedPolicyStr !== null, 'MTA-STS policy is cached in Redis (emitmail:mta-sts:gmail.com)');

    // Clean up test data
    await prisma.apiKey.deleteMany({ where: { domainId: domain.id } });
    await prisma.suppression.deleteMany({ where: { domainId: domain.id } });
    await prisma.email.deleteMany({ where: { domainId: domain.id } });
    await prisma.domain.delete({ where: { id: domain.id } });

    console.log('\n🎉 ALL DELIVERABILITY & SECURITY TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
