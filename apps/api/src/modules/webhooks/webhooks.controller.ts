import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import {
  CreateWebhookSubscriptionInput,
  UpdateWebhookSubscriptionInput,
  InboundBounceInput,
  WebhookIdParam,
  TestWebhookInput,
} from './webhooks.schema.js';

export const createWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateWebhookSubscriptionInput;
    const scopedDomainId = req.domain ? req.domain.id : null;
    const subscription = await WebhooksService.createSubscription(input, scopedDomainId);

    sendSuccess(
      res,
      subscription,
      'Webhook subscription created successfully',
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create webhook';
    sendError(res, message, 400);
  }
};

export const listWebhooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const scopedDomainId = req.domain ? req.domain.id : null;
    const subscriptions = await WebhooksService.listSubscriptions(scopedDomainId);
    sendSuccess(res, subscriptions, 'Webhook subscriptions retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list webhooks';
    sendError(res, message, 500);
  }
};

export const getWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as WebhookIdParam;
    const scopedDomainId = req.domain ? req.domain.id : null;
    const subscription = await WebhooksService.getSubscription(id, scopedDomainId);

    if (!subscription) {
      sendError(res, `Webhook subscription with ID "${id}" not found`, 404);
      return;
    }

    sendSuccess(res, subscription, 'Webhook subscription retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve webhook';
    sendError(res, message, 500);
  }
};

export const updateWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as WebhookIdParam;
    const input = req.body as UpdateWebhookSubscriptionInput;
    const scopedDomainId = req.domain ? req.domain.id : null;
    const updated = await WebhooksService.updateSubscription(id, input, scopedDomainId);

    if (!updated) {
      sendError(res, `Webhook subscription with ID "${id}" not found`, 404);
      return;
    }

    sendSuccess(res, updated, 'Webhook subscription updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update webhook';
    sendError(res, message, message.includes('Access denied') ? 403 : 400);
  }
};

export const deleteWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as WebhookIdParam;
    const scopedDomainId = req.domain ? req.domain.id : null;
    const deleted = await WebhooksService.deleteSubscription(id, scopedDomainId);

    if (!deleted) {
      sendError(res, `Webhook subscription with ID "${id}" not found`, 404);
      return;
    }

    sendSuccess(
      res,
      { id: deleted.id, url: deleted.url },
      'Webhook subscription deleted successfully'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete webhook';
    sendError(res, message, message.includes('Access denied') ? 403 : 500);
  }
};

export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as WebhookIdParam;
    const body = (req.body || {}) as TestWebhookInput;
    const scopedDomainId = req.domain ? req.domain.id : null;
    const result = await WebhooksService.testSubscription(id, body.event, scopedDomainId);

    if (!result) {
      sendError(res, `Webhook subscription with ID "${id}" not found`, 404);
      return;
    }

    sendSuccess(res, result, 'Test webhook dispatched');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch test webhook';
    sendError(res, message, 500);
  }
};

export const listDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptionId = req.query.subscriptionId as string | undefined;
    const scopedDomainId = req.domain ? req.domain.id : null;
    const deliveries = await WebhooksService.listDeliveries(subscriptionId, scopedDomainId);
    sendSuccess(res, deliveries, 'Webhook deliveries retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list webhook deliveries';
    sendError(res, message, 500);
  }
};

export const inboundBounce = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as InboundBounceInput;
    const result = await WebhooksService.ingestInboundBounce(input);

    sendSuccess(
      res,
      result,
      'Inbound bounce notification ingested and processed successfully'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process inbound bounce';
    sendError(res, message, 400);
  }
};
