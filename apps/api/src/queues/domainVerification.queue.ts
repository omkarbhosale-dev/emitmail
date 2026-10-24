import { Queue } from 'bullmq';
import { bullmqRedisConnection } from '../config/redis.js';

export const DOMAIN_VERIFICATION_QUEUE_NAME = 'domain-dns-verification-queue';

export interface DomainVerificationJobData {
  domainId: string;
  attempt: number;
}

export const domainVerificationQueue = new Queue<DomainVerificationJobData>(
  DOMAIN_VERIFICATION_QUEUE_NAME,
  {
    connection: bullmqRedisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }
);

/**
 * Enqueues a domain DNS verification job with optional scheduling delay.
 */
export const enqueueDomainVerification = async (
  domainId: string,
  delayMs = 0,
  attempt = 1
): Promise<void> => {
  await domainVerificationQueue.add(
    'verify-domain',
    { domainId, attempt },
    {
      delay: delayMs,
      jobId: `domain-verify-${domainId}-${attempt}-${Date.now()}`,
    }
  );
};
