import { Request, Response } from 'express';
import { InboxService } from './inbox.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import {
  CreateMailboxInput,
  UpdateMailboxInput,
  ListMailboxesQuery,
  ListMessagesQuery,
  UpdateMessageInput,
  SendMailboxEmailInput,
  ReplyMessageInput,
  SimulateInboundInput,
} from './inbox.schema.js';

export const listInboundDomains = async (req: Request, res: Response): Promise<void> => {
  try {
    const domains = await InboxService.listInboundDomains();
    sendSuccess(res, domains, 'Inbound-ready verified domains retrieved');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve inbound domains';
    sendError(res, message, 500);
  }
};

export const verifyDomainInboundMx = async (req: Request, res: Response): Promise<void> => {
  try {
    const { domainId } = req.params;
    const result = await InboxService.verifyDomainInboundMx(domainId);
    sendSuccess(
      res,
      result,
      result.verified
        ? 'Inbound MX verification successful'
        : 'Inbound MX verification pending or mismatch'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify inbound MX';
    sendError(res, message, 400);
  }
};

export const createMailbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateMailboxInput;
    const userId = req.user?.id;
    const result = await InboxService.createMailbox(userId, input);
    sendSuccess(res, result, 'Mailbox created successfully', 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create mailbox';
    if (message.includes('already exists')) {
      sendError(res, message, 409);
      return;
    }
    sendError(res, message, 400);
  }
};

export const listMailboxes = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query as unknown as ListMailboxesQuery;
    const userId = req.user?.id;
    const mailboxes = await InboxService.listMailboxes(query, userId);
    sendSuccess(res, mailboxes, 'Mailboxes retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list mailboxes';
    sendError(res, message, 500);
  }
};

export const getMailboxById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mailboxId } = req.params;
    const mailbox = await InboxService.getMailboxById(mailboxId);
    if (!mailbox) {
      sendError(res, 'Mailbox not found', 404);
      return;
    }
    sendSuccess(res, mailbox, 'Mailbox retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve mailbox';
    sendError(res, message, 500);
  }
};

export const updateMailbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mailboxId } = req.params;
    const input = req.body as UpdateMailboxInput;
    const updated = await InboxService.updateMailbox(mailboxId, input);
    sendSuccess(res, updated, 'Mailbox updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update mailbox';
    sendError(res, message, 400);
  }
};

export const deleteMailbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mailboxId } = req.params;
    await InboxService.deleteMailbox(mailboxId);
    sendSuccess(res, { deleted: true }, 'Mailbox deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete mailbox';
    sendError(res, message, 500);
  }
};

export const listMailboxMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mailboxId } = req.params;
    const query = req.query as unknown as ListMessagesQuery;
    const result = await InboxService.listMailboxMessages(mailboxId, query);
    sendSuccess(res, result, 'Messages retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve messages';
    sendError(res, message, 400);
  }
};

export const getMessageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const result = await InboxService.getMessageById(messageId);
    sendSuccess(res, result, 'Message retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve message';
    sendError(res, message, 404);
  }
};

export const updateMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const input = req.body as UpdateMessageInput;
    const updated = await InboxService.updateMessage(messageId, input);
    sendSuccess(res, updated, 'Message updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update message';
    sendError(res, message, 400);
  }
};

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    await InboxService.deleteMessage(messageId);
    sendSuccess(res, { deleted: true }, 'Message permanently deleted');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete message';
    sendError(res, message, 500);
  }
};

export const sendFromMailbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mailboxId } = req.params;
    const input = req.body as SendMailboxEmailInput;
    const result = await InboxService.sendFromMailbox(mailboxId, input);
    sendSuccess(res, result, 'Email dispatched from mailbox', 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch email';
    sendError(res, message, 400);
  }
};

export const replyToMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const input = req.body as ReplyMessageInput;
    const result = await InboxService.replyToMessage(messageId, input);
    sendSuccess(res, result, 'Reply dispatched and attached to thread', 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch reply';
    sendError(res, message, 400);
  }
};

export const simulateInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as SimulateInboundInput;
    const result = await InboxService.simulateInbound(input);
    sendSuccess(res, result, 'Inbound message simulated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to simulate inbound message';
    sendError(res, message, 400);
  }
};
