import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { UpdateServerConfigInput } from './serverConfig.schema.js';
import { DnsRecordDefinition } from '../../utils/dnsResolver.js';
import { Prisma } from '@prisma/client';

export interface MasterDnsChecklistItem {
  type: 'A' | 'TXT' | 'PTR';
  host?: string;
  ip?: string;
  value: string;
  purpose: string;
  instructions: string;
}

export class ServerConfigService {
  /**
   * Fetches active ServerConfig, initializing with root .env values if empty.
   */
  static async getActiveConfig() {
    let config = await prisma.serverConfig.findUnique({
      where: { id: 'master' },
    });

    const isPlaceholder = (h?: string | null) =>
      !h ||
      h === 'mail.yourdomain.com' ||
      h === 'mail.example.com' ||
      h.includes('yourdomain.com') ||
      h.includes('example.com') ||
      h === 'localhost';

    if (!config) {
      const activeHostname =
        env.SMTP_EHLO_HOSTNAME && !isPlaceholder(env.SMTP_EHLO_HOSTNAME)
          ? env.SMTP_EHLO_HOSTNAME
          : (!isPlaceholder(env.MAIL_SERVER_HOSTNAME) ? env.MAIL_SERVER_HOSTNAME : 'mail.yourdomain.com');

      const isCustomConfigured = !isPlaceholder(activeHostname) && activeHostname.includes('.');

      config = await prisma.serverConfig.create({
        data: {
          id: 'master',
          mailServerHostname: activeHostname,
          spfIncludeDomain: env.SPF_INCLUDE_DOMAIN || '_spf.yourdomain.com',
          vpsPublicIpv4: env.SENDING_SERVER_IP || env.VPS_PUBLIC_IPV4 || '0.0.0.0',
          isConfigured: isCustomConfigured,
        },
      });
    } else if (
      isPlaceholder(config.mailServerHostname) &&
      env.SMTP_EHLO_HOSTNAME &&
      !isPlaceholder(env.SMTP_EHLO_HOSTNAME)
    ) {
      // Auto-heal legacy database rows initialized with placeholder values
      config = await prisma.serverConfig.update({
        where: { id: 'master' },
        data: {
          mailServerHostname: env.SMTP_EHLO_HOSTNAME,
          vpsPublicIpv4:
            env.SENDING_SERVER_IP && env.SENDING_SERVER_IP !== '0.0.0.0'
              ? env.SENDING_SERVER_IP
              : config.vpsPublicIpv4,
          isConfigured: true,
        },
      });
      console.log(`🔧 [ServerConfig] Auto-healed placeholder hostname to "${env.SMTP_EHLO_HOSTNAME}".`);
    }

    // Auto-heal configured flag if domains already exist in the database
    if (config && !config.isConfigured) {
      const domainCount = await prisma.domain.count();
      if (domainCount > 0) {
        config = await prisma.serverConfig.update({
          where: { id: 'master' },
          data: { isConfigured: true },
        });
        console.log(`🔧 [ServerConfig] Auto-healed isConfigured to true since ${domainCount} domain(s) exist.`);
      }
    }

    return config;
  }

  /**
   * Builds the prerequisite master DNS checklist for tenant-owned VPS infrastructure.
   */
  static generateMasterDnsChecklist(config: {
    mailServerHostname: string;
    spfIncludeDomain: string;
    vpsPublicIpv4: string | null;
  }): MasterDnsChecklistItem[] {
    const vpsIp = config.vpsPublicIpv4 || 'YOUR_VPS_PUBLIC_IP';

    return [
      {
        type: 'A',
        host: config.mailServerHostname,
        value: vpsIp,
        purpose: 'Mail Server Inbound & Outbound Hostname',
        instructions: `Add an A record on your master DNS provider pointing "${config.mailServerHostname}" to "${vpsIp}".`,
      },
      {
        type: 'TXT',
        host: config.spfIncludeDomain,
        value: `v=spf1 ip4:${vpsIp} -all`,
        purpose: 'Master SPF Authority Record',
        instructions: `Add a TXT record for "${config.spfIncludeDomain}" so sender domains can include your mail cluster authorized IP.`,
      },
      {
        type: 'PTR',
        ip: vpsIp,
        value: config.mailServerHostname,
        purpose: 'VPS Reverse DNS (rDNS)',
        instructions: `Set the reverse DNS (PTR) record for IP "${vpsIp}" to "${config.mailServerHostname}" in your VPS provider panel (Hetzner, DigitalOcean, AWS, OVH, Linode). This is mandatory for deliverability to Gmail & Outlook.`,
      },
    ];
  }

  /**
   * Get ServerConfig with Master DNS Checklist.
   */
  static async getServerConfigWithChecklist() {
    const config = await this.getActiveConfig();
    const checklist = this.generateMasterDnsChecklist(config);

    return {
      serverConfig: config,
      config,
      masterDnsChecklist: checklist,
      checklist,
    };
  }

  /**
   * Update ServerConfig and dynamically refresh expected MX & SPF records for PENDING domains.
   */
  static async updateServerConfig(input: UpdateServerConfigInput) {
    const mailServerHostname = input.mailServerHostname.toLowerCase().trim();
    const spfIncludeDomain = input.spfIncludeDomain.toLowerCase().trim();
    const vpsPublicIpv4 = input.vpsPublicIpv4.trim();

    const updatedConfig = await prisma.serverConfig.upsert({
      where: { id: 'master' },
      update: {
        mailServerHostname,
        spfIncludeDomain,
        vpsPublicIpv4,
        isConfigured: true,
      },
      create: {
        id: 'master',
        mailServerHostname,
        spfIncludeDomain,
        vpsPublicIpv4,
        isConfigured: true,
      },
    });

    // Dynamically refresh expected MX and SPF records of any PENDING domains
    const pendingDomains = await prisma.domain.findMany({
      where: { status: 'PENDING' },
    });

    for (const domain of pendingDomains) {
      const records = (domain.dnsRecords as unknown as DnsRecordDefinition[]) || [];
      let modified = false;

      const refreshedRecords = records.map((record) => {
        // Refresh SPF TXT record value
        if (record.type === 'TXT' && record.host === domain.returnPathSubdomain) {
          modified = true;
          return {
            ...record,
            value: `v=spf1 include:${spfIncludeDomain} ~all`,
          };
        }
        // Refresh MX record value
        if (record.type === 'MX' && record.host === domain.returnPathSubdomain) {
          modified = true;
          return {
            ...record,
            value: mailServerHostname,
          };
        }
        return record;
      });

      if (modified) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: {
            dnsRecords: refreshedRecords as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }

    const checklist = this.generateMasterDnsChecklist(updatedConfig);

    return {
      serverConfig: updatedConfig,
      config: updatedConfig,
      masterDnsChecklist: checklist,
      checklist,
      refreshedPendingDomainsCount: pendingDomains.length,
    };
  }
}
