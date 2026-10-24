import { Queue } from 'bullmq';
import { bullmqRedisConnection } from '../config/redis.js';
import { env } from '../config/env.js';

export const EMAIL_DELIVERY_QUEUE_NAME = env.EMAIL_QUEUE_NAME || 'email-delivery-queue';
export const EMAIL_DISPATCH_QUEUE_NAME = EMAIL_DELIVERY_QUEUE_NAME;

export interface EmailDeliveryJobData {
  emailId: string;
  domainId?: string;
  from?: string;
  to?: string[];
  subject?: string;
  messageId?: string;
}

export type EmailDispatchJobData = EmailDeliveryJobData;

export const emailDispatchQueue = new Queue<EmailDeliveryJobData>(
  EMAIL_DELIVERY_QUEUE_NAME,
  {
    connection: bullmqRedisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 200,
      removeOnFail: 1000,
    },
  }
);

/**
 * Enqueues an email envelope and metadata into Redis email-delivery-queue.
 */
export const enqueueEmailDispatch = async (
  emailId: string,
  metadata?: Partial<EmailDeliveryJobData>
): Promise<void> => {
  await emailDispatchQueue.add(
    'dispatch-email',
    {
      emailId,
      ...metadata,
    },
    {
      jobId: `email-${emailId}`,
    }
  );
};

export const enqueueEmailDelivery = enqueueEmailDispatch;

