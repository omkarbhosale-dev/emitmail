import { Request, Response } from 'express';
import { verifyUnsubscribeToken } from '../../utils/crypto.js';
import { SuppressionsService } from '../suppressions/suppressions.service.js';
import { enqueueWebhookDispatch } from '../../queues/webhookDispatch.queue.js';
import { SuppressionReason } from '@prisma/client';

/**
 * RFC 8058 Direct One-Click Unsubscribe POST Handler.
 * Mailbox providers (Google, Yahoo, Apple Mail) send POST with body "List-Unsubscribe=One-Click".
 * Must resolve within < 500ms without logins or redirects.
 */
export const handleOneClickPost = async (req: Request, res: Response): Promise<void> => {
  const startTime = performance.now();
  const { token } = req.params;

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    res.status(400).json({
      error: 'Invalid or expired unsubscribe token',
      statusCode: 400,
    });
    return;
  }

  try {
    const suppression = await SuppressionsService.createSuppression(
      {
        email: payload.email,
        domainId: payload.domainId,
        reason: 'UNSUBSCRIBE',
        details: 'RFC 8058 One-Click Unsubscribe',
      },
      payload.domainId
    );

    // Enqueue email.unsubscribed webhook
    await enqueueWebhookDispatch(
      'email.unsubscribed',
      {
        email: suppression.email,
        domainId: suppression.domainId,
        messageId: payload.messageId || null,
        method: 'RFC8058_ONE_CLICK_POST',
        unsubscribedAt: new Date().toISOString(),
      },
      suppression.domainId
    ).catch((err) => {
      console.warn('Failed to enqueue email.unsubscribed webhook:', err);
    });

    const latency = Math.round(performance.now() - startTime);

    res.status(200).json({
      success: true,
      message: `Successfully unsubscribed "${payload.email}"`,
      latencyMs: latency,
    });
  } catch (error) {
    console.error('Error handling RFC 8058 unsubscribe:', error);
    res.status(500).json({
      error: 'Internal server error processing unsubscribe request',
      statusCode: 500,
    });
  }
};

/**
 * Human fallback GET handler for users clicking the link in a browser.
 */
export const handleOneClickGet = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const payload = verifyUnsubscribeToken(token);

  if (!payload) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Unsubscribe Link - EmitMail</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 440px; text-align: center; }
          h1 { font-size: 20px; color: #f43f5e; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Invalid or Expired Link</h1>
          <p>This unsubscribe link is invalid or has expired. If you continue to receive unwanted emails, please contact support.</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Automatic or confirm unsubscribe
  try {
    await SuppressionsService.createSuppression(
      {
        email: payload.email,
        domainId: payload.domainId,
        reason: 'UNSUBSCRIBE',
        details: 'User browser GET unsubscribe',
      },
      payload.domainId
    );

    await enqueueWebhookDispatch(
      'email.unsubscribed',
      {
        email: payload.email,
        domainId: payload.domainId,
        messageId: payload.messageId || null,
        method: 'BROWSER_GET',
        unsubscribedAt: new Date().toISOString(),
      },
      payload.domainId
    ).catch(() => {});

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribe Confirmation - EmitMail</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #131b2e; border: 1px solid #23314d; border-radius: 16px; padding: 40px; max-width: 460px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); color: #22c55e; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 20px; }
          h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px 0; color: #ffffff; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; }
          .email-pill { background: #1e293b; padding: 6px 14px; border-radius: 20px; font-weight: 500; color: #38bdf8; display: inline-block; font-size: 13px; margin-bottom: 24px; }
          .btn { background: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 8px; border: none; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; }
          .footer { font-size: 12px; color: #64748b; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Unsubscribe Confirmation</h1>
          <p>You have been successfully removed from this mailing list. You will no longer receive emails sent to:</p>
          <div class="email-pill">${payload.email}</div>
          <div>
            <span class="btn">Unsubscribed</span>
          </div>
          <div class="footer">EmitMail Self-Hosted Email Engine</div>
        </div>
      </body>
      </html>
    `);
  } catch {
    res.status(500).send('Error processing unsubscribe request');
  }
};
