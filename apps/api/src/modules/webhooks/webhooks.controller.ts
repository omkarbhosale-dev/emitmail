import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import {
  CreateWebhookSubscriptionInput,
  InboundBounceInput,
  WebhookIdParam,
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
