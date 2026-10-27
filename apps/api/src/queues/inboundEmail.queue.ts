import { Queue, Job } from 'bullmq';
import { bullmqRedisConnection } from '../config/redis.js';
import { env } from '../config/env.js';

export const INBOUND_EMAIL_QUEUE_NAME = env.INBOUND_EMAIL_QUEUE_NAME || 'inbound-email';

export interface InboundEmailJobData {
  rawMimeBase64: string;
  envelopeFrom: string;
  envelopeTo: string[];
  remoteAddress?: string;
  receivedAt: string;
}

export const inboundEmailQueue = new Queue<InboundEmailJobData>(
  INBOUND_EMAIL_QUEUE_NAME,
  {
    connection: bullmqRedisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 500,
      removeOnFail: 2000,
    },
  }
);

/**
 * Enqueues a raw incoming MIME payload for asynchronous processing and indexing.
 */
export const enqueueInboundEmail = async (
  data: InboundEmailJobData
): Promise<Job<InboundEmailJobData>> => {
  return await inboundEmailQueue.add('process-inbound-email', data, {
    jobId: `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  });
};
