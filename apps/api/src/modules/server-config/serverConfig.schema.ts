import { z } from 'zod';

const hostnameRegex = /^(?:[a-zA-Z0-9_](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,}$/;
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export const updateServerConfigSchema = z.object({
  mailServerHostname: z
    .string({ required_error: 'Mail server hostname is required' })
    .trim()
    .toLowerCase()
    .regex(hostnameRegex, 'Invalid hostname format (e.g., mail.yourdomain.com)'),
  spfIncludeDomain: z
    .string({ required_error: 'SPF include domain is required' })
    .trim()
    .toLowerCase()
    .regex(hostnameRegex, 'Invalid SPF domain format (e.g., _spf.yourdomain.com)'),
  vpsPublicIpv4: z
    .string({ required_error: 'VPS Public IPv4 is required' })
    .trim()
    .regex(ipv4Regex, 'Invalid IPv4 address format (e.g., 198.51.100.1)'),
});

export type UpdateServerConfigInput = z.infer<typeof updateServerConfigSchema>;
