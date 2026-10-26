import { z } from 'zod';

export const emailAttachmentSchema = z.object({
  filename: z.string().min(1, 'Attachment filename is required'),
  content: z.string().min(1, 'Attachment content (base64 string or text) is required'),
  contentType: z.string().optional(),
});

export const sendEmailSchema = z
  .object({
    from: z
      .string({ required_error: 'Sender "from" address is required' })
      .min(3, 'From address is required')
      .trim(),
    name: z.string().optional(),
    fromName: z.string().optional(),
    from_name: z.string().optional(),
    to: z.union([
      z.string().min(3, 'Invalid email address in "to" field'),
      z.array(z.string().min(3, 'Invalid email address in "to" array')).min(1, 'At least one recipient is required'),
    ]),
    subject: z
      .string({ required_error: 'Email subject is required' })
      .min(1, 'Subject cannot be empty')
      .max(998, 'Subject exceeds RFC 5322 limit'),
    html: z.string().optional(),
    text: z.string().optional(),
    replyTo: z.union([z.string(), z.array(z.string())]).optional(),
    reply_to: z.union([z.string(), z.array(z.string())]).optional(),
    cc: z.union([z.string(), z.array(z.string())]).optional(),
    bcc: z.union([z.string(), z.array(z.string())]).optional(),
    headers: z.record(z.string()).optional(),
    attachments: z.array(emailAttachmentSchema).optional(),
    listUnsubscribe: z
      .object({
        url: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),
    list_unsubscribe: z
      .object({
        url: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),
    unsubscribeMode: z.enum(['one-click', 'standard']).optional(),
    unsubscribe_mode: z.enum(['one-click', 'standard']).optional(),
  })
  .refine((data) => data.html || data.text, {
    message: 'At least one of "html" or "text" content must be provided',
    path: ['html'],
  });

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

export const emailIdParamSchema = z.object({
  id: z.string().min(1, 'Invalid email ID format'),
});

export type EmailIdParam = z.infer<typeof emailIdParamSchema>;
