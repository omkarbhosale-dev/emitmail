import { prisma } from '../apps/api/src/config/db.js';
import { redis } from '../apps/api/src/config/redis.js';
import { startInboundSmtpServer, stopInboundSmtpServer } from '../apps/api/src/inbound/smtp-receiver.js';
import { processInboundEmailJob } from '../apps/api/src/queues/inboundEmail.worker.js';
import { InboxService } from '../apps/api/src/modules/inbox/inbox.service.js';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';

async function runInboundTest() {
  console.log('🧪 Starting EmitMail Inbound Mailbox & SMTP Receiver End-to-End Test');
  console.log('==================================================================');

  await prisma.$connect();
  await redis.connect().catch(() => {});

  const testDomainName = `test-inbox-${Date.now()}.com`;

  // 1. Create a verified domain
  console.log(`\n1️⃣ Creating test verified domain: ${testDomainName}`);
  const domain = await prisma.domain.create({
    data: {
      domainName: testDomainName,
      status: 'VERIFIED',
      dkimPublicKey: 'dummy_pub_key',
      dkimPrivateKeyEnc: 'dummy_enc_key',
      dnsRecords: [],
      dkimVerified: true,
      spfVerified: true,
      mxVerified: true,
      inboundEnabled: false,
      inboundMxVerified: false,
    },
  });
  console.log(`✅ Domain created: ${domain.id}`);

  // 2. Test MX verification service logic
  console.log('\n2️⃣ Testing Inbound MX Verification endpoint logic');
  const mxCheck = await InboxService.verifyDomainInboundMx(domain.id);
  console.log(`ℹ️ MX verification result for test domain: verified = ${mxCheck.verified} (${mxCheck.message})`);

  // 3. Create Mailboxes (support@ and catch-all)
  console.log('\n3️⃣ Creating Mailboxes (support@ and catch-all)');
  const mailboxRes = await InboxService.createMailbox(undefined, {
    domainId: domain.id,
    localPart: 'support',
    displayName: 'Customer Support',
    isCatchAll: false,
  });
  const mailbox = mailboxRes.mailbox;
  console.log(`✅ Mailbox created: ${mailbox.emailAddress} (ID: ${mailbox.id})`);

  const catchAllRes = await InboxService.createMailbox(undefined, {
    domainId: domain.id,
    localPart: '*',
    displayName: 'All Inbound',
    isCatchAll: true,
  });
  const catchAllMailbox = catchAllRes.mailbox;
  console.log(`✅ Catch-all Mailbox created: ${catchAllMailbox.emailAddress} (ID: ${catchAllMailbox.id})`);

  // 4. Start Inbound SMTP Server on test port 2525
  const testPort = 2525;
  console.log(`\n4️⃣ Starting Inbound SMTP Receiver on port ${testPort}`);
  await startInboundSmtpServer(testPort, '127.0.0.1');

  // 5. Connect SMTP client and test recipient validation
  console.log('\n5️⃣ Testing SMTP delivery to support@' + testDomainName);
  const client = nodemailer.createTransport({
    host: '127.0.0.1',
    port: testPort,
    secure: false,
    tls: { rejectUnauthorized: false },
  });

  const testMessageId = `<test-client-${Date.now()}@customer.com>`;
  const sendResult = await client.sendMail({
    from: '"Alice Customer" <alice@customer.com>',
    to: `support@${testDomainName}`,
    subject: 'Need help with order #4912',
    text: 'Hello EmitMail team,\n\nI need an update on order #4912 please.\n\nThanks,\nAlice',
    html: '<p>Hello EmitMail team,</p><p>I need an update on order <strong>#4912</strong> please.</p><p>Thanks,<br>Alice</p>',
    messageId: testMessageId,
  });

  console.log(`✅ Inbound SMTP accepted email: ${sendResult.response}`);

  // 6. Test Recipient Rejection (Recipient Address Rejected for non-existent domain / non-catchall)
  console.log('\n6️⃣ Testing Recipient Validation (Rejecting unknown domain)');
  let rejected = false;
  try {
    await client.sendMail({
      from: 'spammer@evil.com',
      to: 'nobody@unregistered-nonexistent-domain.xyz',
      subject: 'Spam payload',
      text: 'Buy pills',
    });
  } catch (err: any) {
    rejected = true;
    console.log(`✅ SMTP Server properly rejected invalid recipient: ${err.message}`);
  }

  if (!rejected) {
    throw new Error('Expected unknown recipient to be rejected by SMTP server!');
  }

  // 7. Test Inbound Worker Processing directly
  console.log('\n7️⃣ Testing BullMQ Inbound Worker MIME parsing and thread resolution');
  const rawMime1 = [
    `From: "Alice Customer" <alice@customer.com>`,
    `To: support@${testDomainName}`,
    `Subject: Need help with order #4912`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${testMessageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<p>Hello EmitMail team,</p><p>I need an update on order <strong>#4912</strong> please.</p>`,
  ].join('\r\n');

  // Process job 1
  await processInboundEmailJob({
    data: {
      rawMimeBase64: Buffer.from(rawMime1).toString('base64'),
      envelopeFrom: 'alice@customer.com',
      envelopeTo: [`support@${testDomainName}`],
      receivedAt: new Date().toISOString(),
    },
  } as any);

  // Verify email 1 in database
  const stored1 = await prisma.inboundEmail.findFirst({
    where: { messageId: testMessageId },
  });
  if (!stored1) {
    throw new Error('Message 1 was not stored in database!');
  }
  console.log(`✅ Message 1 stored: ID ${stored1.id}, Thread ID: ${stored1.threadId}, Unread: ${!stored1.isRead}`);

  // 8. Test Inbound Reply (Conversation Threading)
  console.log('\n8️⃣ Testing Conversation Threading (In-Reply-To follow-up)');
  const replyMessageId = `<alice-reply-${Date.now()}@customer.com>`;
  const rawMime2 = [
    `From: "Alice Customer" <alice@customer.com>`,
    `To: support@${testDomainName}`,
    `Subject: Re: Need help with order #4912`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${replyMessageId}`,
    `In-Reply-To: ${testMessageId}`,
    `References: ${testMessageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<p>Just following up to make sure you got my previous email!</p>`,
  ].join('\r\n');

  await processInboundEmailJob({
    data: {
      rawMimeBase64: Buffer.from(rawMime2).toString('base64'),
      envelopeFrom: 'alice@customer.com',
      envelopeTo: [`support@${testDomainName}`],
      receivedAt: new Date().toISOString(),
    },
  } as any);

  const stored2 = await prisma.inboundEmail.findFirst({
    where: { messageId: replyMessageId },
  });
  if (!stored2) {
    throw new Error('Message 2 was not stored in database!');
  }
  console.log(`✅ Message 2 stored: ID ${stored2.id}, Thread ID: ${stored2.threadId}`);

  if (stored1.threadId !== stored2.threadId) {
    throw new Error(`Thread IDs do not match! Message 1: ${stored1.threadId}, Message 2: ${stored2.threadId}`);
  }
  console.log(`🎉 SUCCESS: Both emails matched the same threadId: ${stored1.threadId}`);

  // 9. Test Message Inspection & Auto Read
  console.log('\n9️⃣ Testing Message Details & Auto-Read decrement');
  const details = await InboxService.getMessageById(stored1.id);
  console.log(`✅ Auto-marked read: isRead=${details.message.isRead}, Thread message count: ${details.thread.length}`);

  // 10. Test Outbound Reply from Mailbox
  console.log('\n🔟 Testing Outbound Reply via support@' + testDomainName);
  const replyRes = await InboxService.replyToMessage(stored1.id, {
    html: '<p>Hi Alice, your order has shipped! Tracking number is 1Z9999999.</p>',
    text: 'Hi Alice, your order has shipped! Tracking number is 1Z9999999.',
  });
  console.log(`✅ Sent reply from mailbox. Thread ID: ${replyRes.reply.threadId}, Direction: ${replyRes.reply.direction}`);

  if (replyRes.reply.threadId !== stored1.threadId) {
    throw new Error('Outbound reply threadId mismatch!');
  }

  // 11. Test Simulation Endpoint
  console.log('\n1️⃣1️⃣ Testing Inbound Simulator logic');
  const simRes = await InboxService.simulateInbound({
    to: `billing@${testDomainName}`, // hit catch-all
    from: 'Bob Vendor <bob@vendor.org>',
    subject: 'Monthly invoice #INV-902',
    html: '<p>Attached is your monthly invoice.</p>',
  });
  console.log(`✅ Simulator enqueued job: ${simRes.jobId}`);

  // 12. Cleanup
  console.log('\n🧹 Cleaning up test data & stopping server');
  await stopInboundSmtpServer();
  await prisma.domain.delete({ where: { id: domain.id } });
  await prisma.$disconnect();
  await redis.quit();

  console.log('\n==================================================================');
  console.log('🎉 ALL INBOUND MAILBOX & SMTP TESTS PASSED WITH 100% SUCCESS!');
  console.log('==================================================================');
  process.exit(0);
}

runInboundTest().catch((err) => {
  console.error('❌ Inbound Test Failed:', err);
  process.exit(1);
});
