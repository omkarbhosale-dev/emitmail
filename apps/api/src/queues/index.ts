import { createDomainVerificationWorker } from './domainVerification.worker.js';
import { createEmailDispatchWorker } from './emailDispatch.worker.js';
import { createWebhookDispatchWorker } from './webhookDispatch.worker.js';
import { createInboundEmailWorker } from './inboundEmail.worker.js';

export * from './domainVerification.queue.js';
export * from './domainVerification.worker.js';
export * from './emailDispatch.queue.js';
export * from './emailDispatch.worker.js';
export * from './webhookDispatch.queue.js';
export * from './webhookDispatch.worker.js';
export * from './inboundEmail.queue.js';
export * from './inboundEmail.worker.js';

export interface RunningWorkers {
  domainVerificationWorker: ReturnType<typeof createDomainVerificationWorker>;
  emailDispatchWorker: ReturnType<typeof createEmailDispatchWorker>;
  webhookDispatchWorker: ReturnType<typeof createWebhookDispatchWorker>;
  inboundEmailWorker: ReturnType<typeof createInboundEmailWorker>;
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
  const inboundEmailWorker = createInboundEmailWorker();

  console.log('✅ [Workers] Domain Verification, Email Dispatch, Webhook, and Inbound Email workers running.');

  const closeAll = async (): Promise<void> => {
    console.log('🛑 [Workers] Closing BullMQ workers...');
    await Promise.allSettled([
      domainVerificationWorker.close(),
      emailDispatchWorker.close(),
      webhookDispatchWorker.close(),
      inboundEmailWorker.close(),
    ]);
    console.log('✅ [Workers] All BullMQ workers closed.');
  };

  return {
    domainVerificationWorker,
    emailDispatchWorker,
    webhookDispatchWorker,
    inboundEmailWorker,
    closeAll,
  };
};
