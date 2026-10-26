import dns from 'node:dns/promises';

export interface PreflightDiagnostic {
  ehloHostname: string;
  sendingIp: string;
  isPlaceholder: boolean;
  forwardDnsMatch: boolean;
  reverseDnsMatch: boolean;
  forwardIps: string[];
  reverseHostnames: string[];
  warnings: string[];
}

/**
 * Runs a pre-flight deliverability self-check against the configured EHLO hostname and sending IP.
 * Checks for:
 * 1. Placeholder bugs (e.g., mail.yourdomain.com or localhost)
 * 2. Forward DNS (A record) of SMTP_EHLO_HOSTNAME -> SENDING_SERVER_IP
 * 3. Reverse DNS (PTR record) of SENDING_SERVER_IP -> SMTP_EHLO_HOSTNAME
 */
export async function runPreflightDeliverabilityCheck(
  ehloHostname: string,
  sendingIp: string
): Promise<PreflightDiagnostic> {
  const warnings: string[] = [];
  const isPlaceholder =
    !ehloHostname ||
    ehloHostname === 'mail.yourdomain.com' ||
    ehloHostname === 'localhost' ||
    ehloHostname.includes('yourdomain');

  if (isPlaceholder) {
    warnings.push(
      `⚠️ CRITICAL DELIVERABILITY BUG: SMTP_EHLO_HOSTNAME is set to placeholder "${ehloHostname}". Mail servers (and Mail-Tester) will penalize or reject emails with EHLO "${ehloHostname}". Set SMTP_EHLO_HOSTNAME to your real FQDN (e.g. mail.yourdomain.com).`
    );
  }

  let forwardIps: string[] = [];
  let forwardDnsMatch = false;

  try {
    const addresses = await dns.resolve4(ehloHostname);
    forwardIps = addresses;
    forwardDnsMatch = addresses.includes(sendingIp);
    if (!forwardDnsMatch) {
      warnings.push(
        `⚠️ FORWARD DNS MISMATCH: Hostname "${ehloHostname}" resolves to [${addresses.join(', ')}], which does NOT include SENDING_SERVER_IP "${sendingIp}". Add an A record pointing "${ehloHostname}" to "${sendingIp}".`
      );
    }
  } catch (err: any) {
    warnings.push(
      `⚠️ FORWARD DNS LOOKUP FAILED: Could not resolve A record for "${ehloHostname}": ${err.message}`
    );
  }

  let reverseHostnames: string[] = [];
  let reverseDnsMatch = false;

  try {
    const hostnames = await dns.reverse(sendingIp);
    reverseHostnames = hostnames;
    reverseDnsMatch = hostnames.some(
      (h) => h.toLowerCase().replace(/\.$/, '') === ehloHostname.toLowerCase().replace(/\.$/, '')
    );
    if (!reverseDnsMatch) {
      warnings.push(
        `⚠️ REVERSE DNS (PTR) MISMATCH: IP "${sendingIp}" resolves to [${hostnames.join(', ')}], which does not match SMTP_EHLO_HOSTNAME "${ehloHostname}". Configure your VPS provider PTR record to point "${sendingIp}" to "${ehloHostname}".`
      );
    }
  } catch (err: any) {
    warnings.push(
      `⚠️ REVERSE DNS LOOKUP FAILED: Could not resolve PTR record for IP "${sendingIp}": ${err.message}. Ensure PTR is configured at your hosting provider.`
    );
  }

  console.log('\n🔍 [DeliverabilityPreflight] Pre-Flight SMTP & DNS Diagnostic:');
  console.log(`  - EHLO Hostname:        ${ehloHostname} ${isPlaceholder ? '❌ (PLACEHOLDER!)' : '✅'}`);
  console.log(`  - Sending Server IP:    ${sendingIp}`);
  console.log(`  - Forward DNS (A):      ${forwardDnsMatch ? `✅ PASS (${forwardIps.join(', ')})` : `⚠️ MISMATCH (${forwardIps.join(', ') || 'none'})`}`);
  console.log(`  - Reverse DNS (PTR):    ${reverseDnsMatch ? `✅ PASS (${reverseHostnames.join(', ')})` : `⚠️ MISMATCH (${reverseHostnames.join(', ') || 'none'})`}`);

  if (warnings.length > 0) {
    console.warn('\n⚠️ [DeliverabilityPreflight] Action Items for 10/10 Score:');
    for (const w of warnings) {
      console.warn(`  ${w}`);
    }
    console.warn('');
  } else {
    console.log('🎉 [DeliverabilityPreflight] Perfect 10/10 PTR & Forward DNS alignment verified!\n');
  }

  return {
    ehloHostname,
    sendingIp,
    isPlaceholder,
    forwardDnsMatch,
    reverseDnsMatch,
    forwardIps,
    reverseHostnames,
    warnings,
  };
}
