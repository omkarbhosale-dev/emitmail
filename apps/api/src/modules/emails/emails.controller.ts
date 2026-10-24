import { Request, Response } from 'express';
import { EmailsService } from './emails.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { SendEmailInput, EmailIdParam } from './emails.schema.js';

export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as SendEmailInput;
    const email = await EmailsService.submitEmail(input, req.domain || null);

    const isSuppressed = email.status === 'SUPPRESSED';

    // Fast Non-blocking Resend SDK + EmitMail dual compliant response (<50ms)
    res.status(200).json({
      id: email.id,
      from: email.from,
      to: email.to,
      created_at: email.createdAt.toISOString(),
      status: isSuppressed ? 'suppressed' : 'queued',
      message: isSuppressed
        ? `Email blocked by suppression list: ${email.suppressionReason || 'Recipient is suppressed'}`
        : 'Email successfully accepted and queued for delivery',
      suppressed: isSuppressed,
      suppressionReason: email.suppressionReason || null,
      success: true,
      data: {
        id: email.id,
        from: email.from,
        to: email.to,
        status: email.status,
        messageId: email.messageId,
        suppressionReason: email.suppressionReason || null,
        createdAt: email.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit email';
    const isTenancyError = message.includes('Tenancy') || message.includes('Cannot send from');
    const statusCode = isTenancyError ? 403 : 400;

    res.status(statusCode).json({
      name: isTenancyError ? 'validation_error' : 'application_error',
      message,
      statusCode,
      success: false,
      error: message,
    });
  }
};

export const getEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as EmailIdParam;
    const email = await EmailsService.getEmailById(id, req.domain || null);

    if (!email) {
      sendError(res, `Email with ID "${id}" not found`, 404);
      return;
    }

    sendSuccess(res, email, 'Email details retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve email';
    sendError(res, message, message.includes('Access denied') ? 403 : 500);
  }
};

export const listEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await EmailsService.listEmails(req.query as any, req.domain || null);
    sendSuccess(res, data, 'Emails retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list emails';
    sendError(res, message, 500);
  }
};
