import { createDomainVerificationWorker } from './domainVerification.worker.js';
import { createEmailDispatchWorker } from './emailDispatch.worker.js';
import { createWebhookDispatchWorker } from './webhookDispatch.worker.js';

export * from './domainVerification.queue.js';
export * from './domainVerification.worker.js';
export * from './emailDispatch.queue.js';
export * from './emailDispatch.worker.js';
export * from './webhookDispatch.queue.js';
export * from './webhookDispatch.worker.js';

export interface RunningWorkers {
  domainVerificationWorker: ReturnType<typeof createDomainVerificationWorker>;
  emailDispatchWorker: ReturnType<typeof createEmailDispatchWorker>;
  webhookDispatchWorker: ReturnType<typeof createWebhookDispatchWorker>;
  closeAll: () => Promise<void>;
}

/**
 * Initializes and starts all background queue workers.
 */
export const startAllWorkers = (): RunningWorkers => {
  console.log('🚀 [Workers] Initializing BullMQ background queue workers...');

  const domainVerificationWorker = createDomainVerificationWorker();
  const emailDispatchWorker = createEmailDispatchWorker();
  const webhookDispatchWorker = createWebhookDispatchWorker();

  console.log('✅ [Workers] Domain Verification, Email Dispatch, and Webhook workers running.');

  const closeAll = async (): Promise<void> => {
    console.log('🛑 [Workers] Closing BullMQ workers...');
    await Promise.allSettled([
      domainVerificationWorker.close(),
      emailDispatchWorker.close(),
      webhookDispatchWorker.close(),
    ]);
    console.log('✅ [Workers] All BullMQ workers closed.');
  };

  return {
    domainVerificationWorker,
    emailDispatchWorker,
    webhookDispatchWorker,
    closeAll,
  };
};
