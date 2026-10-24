import { Worker, Job } from 'bullmq';
import { bullmqRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { ServerConfigService } from '../modules/server-config/serverConfig.service.js';
import { verifyDomainDns, DnsRecordDefinition } from '../utils/dnsResolver.js';
import {
  DOMAIN_VERIFICATION_QUEUE_NAME,
  DomainVerificationJobData,
  enqueueDomainVerification,
} from './domainVerification.queue.js';
import { DomainStatus, Prisma } from '@prisma/client';

// Backoff retry schedule: 1m, 5m, 15m, 30m, 1h (in seconds)
export const VERIFICATION_BACKOFF_SECONDS = [60, 300, 900, 1800, 3600];

export const processDomainVerificationJob = async (
  job: Job<DomainVerificationJobData>
): Promise<void> => {
  const { domainId, attempt } = job.data;

  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    console.warn(`[DomainVerificationWorker] Domain ${domainId} not found. Skipping.`);
    return;
  }

  // If already verified, do not re-verify unless triggered manually
  if (domain.status === DomainStatus.VERIFIED && attempt > 1) {
    return;
  }

  // Transition state to VERIFYING
  if (domain.status !== DomainStatus.VERIFYING) {
    await prisma.domain.update({
      where: { id: domainId },
      data: { status: DomainStatus.VERIFYING },
    });
  }

  const serverConfig = await ServerConfigService.getActiveConfig();
  const existingRecords = domain.dnsRecords as unknown as DnsRecordDefinition[];

  // Execute DNS verification against Cloudflare (1.1.1.1) and Google (8.8.8.8)
  const result = await verifyDomainDns({
    domainName: domain.domainName,
    dkimSelector: domain.dkimSelector,
    dkimPublicKey: domain.dkimPublicKey,
    returnPathSubdomain: domain.returnPathSubdomain,
    mailServerHostname: serverConfig.mailServerHostname,
    spfIncludeDomain: serverConfig.spfIncludeDomain,
    existingDnsRecords: existingRecords,
  });

  if (result.isAllRequiredVerified) {
    // Succeeded: Mark VERIFIED and clear verification errors
    await prisma.domain.update({
      where: { id: domainId },
      data: {
        status: DomainStatus.VERIFIED,
        dkimVerified: result.dkimVerified,
        spfVerified: result.spfVerified,
        mxVerified: result.mxVerified,
        dmarcVerified: result.dmarcVerified,
        lastVerifiedAt: new Date(),
        verificationErrors: Prisma.DbNull,
        dnsRecords: result.updatedRecords as unknown as any,
      },
    });

    console.log(`✅ [DomainVerificationWorker] Domain ${domain.domainName} (${domainId}) is now VERIFIED.`);
    return;
  }

  // If not all verified, extract failure reasons per DNS record
  const failureReasons: Record<string, string> = {};
  for (const record of result.updatedRecords) {
    if (record.status !== 'VERIFIED') {
      failureReasons[`${record.type}_${record.host}`] =
        record.reason || 'Record not matched or pending propagation';
    }
  }

  if (attempt <= VERIFICATION_BACKOFF_SECONDS.length) {
    const delaySec = VERIFICATION_BACKOFF_SECONDS[attempt - 1];
    const delayMs = delaySec * 1000;

    await prisma.domain.update({
      where: { id: domainId },
      data: {
        status: DomainStatus.VERIFYING,
        dkimVerified: result.dkimVerified,
        spfVerified: result.spfVerified,
        mxVerified: result.mxVerified,
        dmarcVerified: result.dmarcVerified,
        verificationRetries: attempt,
        verificationErrors: failureReasons,
        dnsRecords: result.updatedRecords as unknown as any,
      },
    });

    console.log(
      `⏳ [DomainVerificationWorker] Domain ${domain.domainName} unverified (attempt ${attempt}/${VERIFICATION_BACKOFF_SECONDS.length}). Scheduling retry in ${delaySec}s.`
    );

    await enqueueDomainVerification(domainId, delayMs, attempt + 1);
  } else {
    // Max attempts exhausted: park in FAILED state
    await prisma.domain.update({
      where: { id: domainId },
      data: {
        status: DomainStatus.FAILED,
        dkimVerified: result.dkimVerified,
        spfVerified: result.spfVerified,
        mxVerified: result.mxVerified,
        dmarcVerified: result.dmarcVerified,
        verificationRetries: attempt,
        verificationErrors: failureReasons,
        dnsRecords: result.updatedRecords as unknown as any,
      },
    });

    console.warn(
      `❌ [DomainVerificationWorker] Domain ${domain.domainName} failed verification after ${attempt} attempts. Marked as FAILED.`
    );
  }
};

export const createDomainVerificationWorker = (): Worker<DomainVerificationJobData> => {
  const worker = new Worker<DomainVerificationJobData>(
    DOMAIN_VERIFICATION_QUEUE_NAME,
    processDomainVerificationJob,
    {
      connection: bullmqRedisConnection,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(
      `❌ [DomainVerificationWorker] Job ${job?.id} failed with error:`,
      err
    );
  });

  return worker;
};
