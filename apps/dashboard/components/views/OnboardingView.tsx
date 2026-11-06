"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  HardDrives,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  ArrowsClockwise,
  Info,
  Gear,
  SignOut,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { api, clearAuthToken } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ApiDomain } from "@/types";

export function OnboardingView() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [domainName, setDomainName] = useState("");
  const [vpsIp, setVpsIp] = useState("");
  const [mailHostname, setMailHostname] = useState("");
  const [spfDomain, setSpfDomain] = useState("");

  const [isDetectingIp, setIsDetectingIp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [createdDomain, setCreatedDomain] = useState<ApiDomain | null>(null);
  const [, setMasterChecklist] = useState<
    Array<{
      type: string;
      host?: string;
      value: string;
      purpose: string;
      instructions: string;
    }>
  >([]);

  // Load existing server config and auto-detect VPS IP on mount
  useEffect(() => {
    // 1. Fetch server config if previously saved
    api.serverConfig
      .get()
      .then((res) => {
        if (res?.config) {
          if (res.config.vpsPublicIpv4 && res.config.vpsPublicIpv4 !== "0.0.0.0") {
            setVpsIp(res.config.vpsPublicIpv4);
          }
          if (
            res.config.mailServerHostname &&
            !res.config.mailServerHostname.includes("yourdomain.com") &&
            !res.config.mailServerHostname.includes("example.com") &&
            !res.config.mailServerHostname.includes("omkarbhosale.dev") &&
            res.config.mailServerHostname !== "localhost"
          ) {
            setMailHostname(res.config.mailServerHostname);
          }
        }
      })
      .catch(() => {});

    // 2. Auto-detect server public outbound IP
    api.system
      .detectIp()
      .then((res) => {
        if (res?.ip && res.ip !== "0.0.0.0") {
          setVpsIp((prev) => prev || res.ip || "");
        }
      })
      .catch(() => {});

    // 3. Check if a domain already exists (in case user landed here after partial setup)
    api.domains
      .list()
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setCreatedDomain(items[0]);
          setDomainName(items[0].domainName);
          setStep(2);
        }
      })
      .catch(() => {});
  }, []);

  // Dynamically calculate derived hostnames as domainName changes
  const handleDomainChange = (val: string) => {
    const clean = val
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/^mail\./i, "");

    setDomainName(clean);

    if (clean) {
      setMailHostname(`mail.${clean}`);
      setSpfDomain(`_spf.${clean}`);
    }
  };

  const handleDetectIp = async () => {
    setIsDetectingIp(true);
    try {
      const res = await api.system.detectIp();
      if (res?.ip) {
        setVpsIp(res.ip);
        toast({
          title: "Public IP Detected",
          description: `Detected server public IP: ${res.ip}`,
          type: "success",
        });
      } else {
        // Fallback to client-side public IP
        const clientRes = await fetch("https://api.ipify.org?format=json", {
          signal: AbortSignal.timeout(3000),
        });
        const clientData = await clientRes.json();
        if (clientData?.ip) {
          setVpsIp(clientData.ip);
          toast({
            title: "Public IP Detected",
            description: `Using detected IP: ${clientData.ip}`,
            type: "success",
          });
        }
      }
    } catch {
      toast({
        title: "IP Detection Offline",
        description: "Please enter your VPS public IPv4 address manually.",
        type: "info",
      });
    } finally {
      setIsDetectingIp(false);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({
        title: "Copied to Clipboard",
        description: text.length > 40 ? `${text.substring(0, 40)}...` : text,
        type: "success",
      });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the text.",
        type: "error",
      });
    }
  };

  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDomain = domainName.trim().toLowerCase();
    const cleanIp = vpsIp.trim();
    const finalHostname = (mailHostname || `mail.${cleanDomain}`).trim().toLowerCase();
    const finalSpf = (spfDomain || `_spf.${cleanDomain}`).trim().toLowerCase();

    if (!cleanDomain || !cleanDomain.includes(".")) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid top-level or subdomain (e.g. yourcompany.com).",
        type: "error",
      });
      return;
    }

    if (!cleanIp || !cleanIp.includes(".")) {
      toast({
        title: "Invalid VPS IP",
        description: "Please enter a valid IPv4 address for your mail server.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update ServerConfig in database
      const configRes = await api.serverConfig.update({
        mailServerHostname: finalHostname,
        vpsPublicIpv4: cleanIp,
        spfIncludeDomain: finalSpf,
      });

      if (configRes?.masterDnsChecklist) {
        setMasterChecklist(configRes.masterDnsChecklist);
      }

      // 2. Create Domain in database (generates 2048-bit RSA DKIM key & DNS records)
      let domainRes: ApiDomain;
      try {
        domainRes = await api.domains.create({
          domainName: cleanDomain,
          returnPathSubdomain: "send",
        });
      } catch (domErr: unknown) {
        // If domain already exists, fetch it
        const existingList = await api.domains.list();
        const found = existingList.find((d) => d.domainName === cleanDomain);
        if (found) {
          domainRes = found;
        } else {
          throw domErr;
        }
      }

      setCreatedDomain(domainRes);
      setStep(2);
      toast({
        title: "Domain Initialized!",
        description: "2048-bit RSA DKIM key and DNS records generated successfully.",
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to provision domain configuration.";
      toast({
        title: "Configuration Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDns = async () => {
    if (!createdDomain?.id) return;
    setIsVerifying(true);
    try {
      const verifyRes = await api.domains.verify(createdDomain.id);
      if (verifyRes) {
        if (verifyRes.domain) {
          setCreatedDomain(verifyRes.domain);
        }
        if (verifyRes.domain?.status === "VERIFIED" || verifyRes.verificationSummary?.status === "VERIFIED") {
          toast({
            title: "Domain 100% Verified!",
            description: "All DKIM, SPF, and MX records are verified and aligned.",
            type: "success",
          });
        } else {
          toast({
            title: "DNS Propagation in Progress",
            description: "Some DNS records are not detected yet. DNS changes can take a few minutes to propagate.",
            type: "info",
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification check failed.";
      toast({
        title: "Verification Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinish = () => {
    toast({
      title: "Setup Complete!",
      description: "Welcome to your EmitMail dashboard. You are ready to dispatch emails.",
      type: "success",
    });
    router.replace("/");
  };

  const handleSignOut = () => {
    clearAuthToken();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-kumo-canvas text-kumo-default flex flex-col justify-between selection:bg-cf-orange/20 selection:text-cf-orange">
      {/* Top Focused Navigation Bar */}
      <header className="border-b border-kumo-hairline bg-kumo-base/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-cf-orange flex items-center justify-center text-white shrink-0 shadow-xs">
            <PaperPlaneTilt size={14} weight="fill" />
          </div>
          <span className="font-logo font-extrabold text-lg sm:text-xl tracking-tight text-cf-orange leading-none">
            emitmail
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/settings"
            className="btn-cf-secondary h-8 px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            title="Go to Settings"
          >
            <Gear size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="h-8 px-3 text-[13px] font-medium text-kumo-subtle hover:text-kumo-danger hover:bg-kumo-danger-tint rounded-lg border border-transparent hover:border-kumo-danger/25 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Sign Out"
          >
            <SignOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Centered Setup Card Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 my-auto">
        <div className={`w-full ${step === 2 ? "max-w-4xl" : "max-w-[680px]"} bg-kumo-base border border-kumo-line rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200 transition-all`}>
          {/* Horizontal Stepper Progress Indicator */}
          <div className="border-b border-kumo-hairline bg-kumo-recessed/30 px-5 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Step 1 Indicator */}
              <div
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 transition-colors cursor-pointer ${
                  step === 1
                    ? "text-cf-orange font-medium"
                    : createdDomain
                    ? "text-kumo-strong font-medium"
                    : "text-kumo-subtle hover:text-kumo-strong"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                    step === 1
                      ? "bg-cf-orange text-white shadow-2xs"
                      : createdDomain
                      ? "bg-cf-success/20 text-cf-success border border-cf-success/40"
                      : "bg-kumo-elevated text-kumo-subtle border border-kumo-line"
                  }`}
                >
                  {createdDomain && step !== 1 ? <Check size={12} weight="bold" /> : "1"}
                </span>
                <span className="text-[13px] sm:text-[14px]">Connect Primary Sending Domain</span>
              </div>

              {/* Connector Divider Line */}
              <div className="hidden sm:block flex-1 h-px bg-kumo-line/60 mx-2" />

              {/* Step 2 Indicator */}
              <div
                onClick={createdDomain ? () => setStep(2) : undefined}
                className={`flex items-center gap-2 transition-colors ${
                  step === 2
                    ? "text-cf-orange font-medium"
                    : createdDomain
                    ? "text-kumo-strong hover:text-kumo-strong cursor-pointer"
                    : "text-kumo-muted cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                    step === 2
                      ? "bg-cf-orange text-white shadow-2xs"
                      : createdDomain && createdDomain.status === "VERIFIED"
                      ? "bg-cf-success/20 text-cf-success border border-cf-success/40"
                      : "bg-kumo-elevated text-kumo-subtle border border-kumo-line"
                  }`}
                >
                  {createdDomain && createdDomain.status === "VERIFIED" && step !== 2 ? (
                    <Check size={12} weight="bold" />
                  ) : (
                    "2"
                  )}
                </span>
                <span className="text-[13px] sm:text-[14px]">Configure DNS Records</span>
              </div>
            </div>
          </div>

          {/* Wizard Body Content */}
          <div className="p-5 sm:p-7 space-y-5">
            {step === 1 ? (
              /* STEP 1: DOMAIN & VPS INPUT */
              <form onSubmit={handleSubmitStep1} className="space-y-4.5">
                {/* Form Heading & Supporting Description */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-kumo-control border border-kumo-line/80 flex items-center justify-center text-kumo-muted shrink-0">
                      <Globe size={16} weight="bold" />
                    </div>
                    <h1 className="text-[20px] sm:text-[22px] font-semibold text-kumo-strong tracking-tight leading-tight">
                      Connect Primary Sending Domain
                    </h1>
                  </div>
                  <p className="text-[13px] sm:text-[14px] text-kumo-subtle leading-relaxed">
                    Enter your root domain and VPS outbound IPv4 address to auto-generate 2048-bit RSA signing keys and SPF/DMARC records.
                  </p>
                </div>

                {/* Primary Domain Name Input */}
                <div>
                  <label className="block text-[13px] sm:text-[14px] font-medium text-kumo-strong mb-1.5">
                    Primary Sending Domain <span className="text-cf-orange">*</span>
                  </label>
                  <div className="relative">
                    <Globe
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. yourcompany.com"
                      value={domainName}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 bg-kumo-control hover:bg-kumo-elevated/50 border border-kumo-line focus:border-cf-orange rounded-xl text-[14px] sm:text-[15px] font-mono text-kumo-strong placeholder:text-kumo-muted focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[12px] text-kumo-subtle mt-1.5 leading-normal">
                    Enter the apex or subdomain you will send emails from.
                  </p>
                </div>

                {/* VPS Public IPv4 Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[13px] sm:text-[14px] font-medium text-kumo-strong">
                      VPS Public IPv4 Address <span className="text-cf-orange">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectIp}
                      disabled={isDetectingIp}
                      className="inline-flex items-center gap-1.5 text-[12px] text-cf-blue hover:text-cf-blue/80 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <ArrowsClockwise size={12} className={isDetectingIp ? "animate-spin" : ""} />
                      <span>{isDetectingIp ? "Detecting..." : "Auto-detect VPS IP"}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <HardDrives
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 198.51.100.1"
                      value={vpsIp}
                      onChange={(e) => setVpsIp(e.target.value.trim())}
                      className="w-full h-11 pl-10 pr-4 bg-kumo-control hover:bg-kumo-elevated/50 border border-kumo-line focus:border-cf-orange rounded-xl text-[14px] sm:text-[15px] font-mono text-kumo-strong placeholder:text-kumo-muted focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[12px] text-kumo-subtle mt-1.5 leading-normal">
                    Your server&apos;s public static IPv4 address. Used for SPF authorization and MTA identification.
                  </p>
                </div>

                {/* Cluster Hostname Auto-Calculation Preview */}
                {domainName && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-kumo-recessed/40 border border-kumo-line/50 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-kumo-subtle uppercase tracking-wider block">
                        Auto-Configured Cluster Records Preview
                      </span>
                      <span className="text-[11px] font-mono text-kumo-muted">
                        Dynamic DNS
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-kumo-base border border-kumo-hairline space-y-0.5">
                        <span className="text-[11px] font-medium text-kumo-subtle block">
                          Mail Server EHLO
                        </span>
                        <span className="font-mono text-[13px] sm:text-[14px] font-semibold text-cf-orange truncate block" title={mailHostname || `mail.${domainName}`}>
                          {mailHostname || `mail.${domainName}`}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-kumo-base border border-kumo-hairline space-y-0.5">
                        <span className="text-[11px] font-medium text-kumo-subtle block">
                          Return-Path Subdomain
                        </span>
                        <span className="font-mono text-[13px] sm:text-[14px] font-semibold text-cf-blue truncate block" title={`send.${domainName}`}>
                          send.{domainName}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-kumo-base border border-kumo-hairline space-y-0.5">
                        <span className="text-[11px] font-medium text-kumo-subtle block">
                          Master SPF Host
                        </span>
                        <span className="font-mono text-[13px] sm:text-[14px] font-semibold text-kumo-strong truncate block" title={spfDomain || `_spf.${domainName}`}>
                          {spfDomain || `_spf.${domainName}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit / Proceed Button */}
                <div className="pt-3.5 border-t border-kumo-hairline flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Link
                    href="/settings"
                    className="btn-cf-secondary h-9 sm:h-10 px-3.5 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    Configure in Settings
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !domainName.trim() || !vpsIp.trim()}
                    className="btn-cf-primary h-9 sm:h-10 px-5 text-[13px] sm:text-[14px] font-medium inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowsClockwise size={14} className="animate-spin" />
                        <span>Generating Cryptographic Keys...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate 2048-Bit DKIM & DNS Records</span>
                        <ArrowRight size={14} weight="bold" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: MASTER DNS CHECKLIST & PROPAGATION */
              <div className="space-y-4.5 animate-in fade-in duration-200">
                {/* Step 2 Heading */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-kumo-control border border-kumo-line/80 flex items-center justify-center text-kumo-muted shrink-0">
                      <ShieldCheck size={16} weight="bold" />
                    </div>
                    <h1 className="text-[20px] sm:text-[22px] font-semibold text-kumo-strong tracking-tight leading-tight">
                      Master DNS Verification Checklist
                    </h1>
                  </div>
                  <p className="text-[13px] sm:text-[14px] text-kumo-subtle leading-relaxed">
                    Add the generated DNS records into your DNS provider (Cloudflare, AWS Route 53, Namecheap, etc.) to complete verification.
                  </p>
                </div>

                {/* Domain Verification Status Header Bar */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-kumo-control/80 border border-kumo-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[14px] sm:text-[15px] font-mono font-semibold text-kumo-strong truncate">
                        {createdDomain?.domainName || domainName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] sm:text-[12px] font-medium font-mono ${
                          createdDomain?.status === "VERIFIED"
                            ? "bg-cf-success/10 text-cf-success/90"
                            : "bg-cf-amber/10 text-cf-amber/90"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            createdDomain?.status === "VERIFIED"
                              ? "bg-cf-success animate-pulse"
                              : "bg-cf-amber"
                          }`}
                        />
                        <span>
                          {createdDomain?.status === "VERIFIED" ? "100% Verified" : "Pending Propagation"}
                        </span>
                      </span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] text-kumo-subtle mt-0.5 leading-normal">
                      Add the DNS records below in Cloudflare, AWS Route 53, or your registrar console.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={isVerifying}
                    className="btn-cf-secondary h-8.5 px-3 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 w-full sm:w-auto"
                  >
                    <ArrowsClockwise size={13} className={isVerifying ? "animate-spin text-cf-orange" : ""} />
                    <span>{isVerifying ? "Checking Nameservers..." : "Check Propagation"}</span>
                  </button>
                </div>

                {/* DNS Records Consolidated Table */}
                {(() => {
                  const dmarcRecords = createdDomain?.dnsRecords?.filter(
                    (r) => r.type === "TXT" && r.host.startsWith("_dmarc")
                  );

                  const dnsRows = [
                    {
                      keyPrefix: "dkim",
                      type: "TXT (DKIM)",
                      host: `${createdDomain?.dkimSelector || "esp"}._domainkey`,
                      value: createdDomain?.dkimPublicKey
                        ? `v=DKIM1; k=rsa; p=${createdDomain.dkimPublicKey}`
                        : "Loading DKIM public key...",
                      copyValue: createdDomain?.dkimPublicKey
                        ? `v=DKIM1; k=rsa; p=${createdDomain.dkimPublicKey}`
                        : "",
                    },
                    {
                      keyPrefix: "spf-send",
                      type: "TXT (Sender SPF)",
                      host: "send",
                      value: `v=spf1 ip4:${vpsIp} a mx -all`,
                      copyValue: `v=spf1 ip4:${vpsIp} a mx -all`,
                    },
                    {
                      keyPrefix: "spf-master",
                      type: "TXT (Master SPF)",
                      host: spfDomain ? spfDomain.replace(`.${domainName}`, "") : "_spf",
                      value: `v=spf1 ip4:${vpsIp} ~all`,
                      copyValue: `v=spf1 ip4:${vpsIp} ~all`,
                    },
                    ...(dmarcRecords && dmarcRecords.length > 0
                      ? dmarcRecords.map((r, i) => ({
                          keyPrefix: `dmarc-${i}`,
                          type: "TXT (DMARC)",
                          host: r.host,
                          value: r.value,
                          copyValue: r.value,
                        }))
                      : [
                          {
                            keyPrefix: "dmarc-fallback",
                            type: "TXT (DMARC)",
                            host: `_dmarc.${createdDomain?.domainName || domainName || "yourdomain.com"}`,
                            value: `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@${createdDomain?.domainName || domainName || "yourdomain.com"}`,
                            copyValue: `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@${createdDomain?.domainName || domainName || "yourdomain.com"}`,
                          },
                        ]),
                    {
                      keyPrefix: "a-record",
                      type: "A Record",
                      host: mailHostname || `mail.${createdDomain?.domainName || domainName}`,
                      value: vpsIp,
                      copyValue: vpsIp,
                    },
                    {
                      keyPrefix: "mx-record",
                      type: "MX (Priority 10)",
                      host: "@",
                      value: mailHostname || `mail.${createdDomain?.domainName || domainName}`,
                      copyValue: mailHostname || `mail.${createdDomain?.domainName || domainName}`,
                    },
                    ...((createdDomain?.dnsRecords || [])
                      .filter(
                        (r) =>
                          !r.host.includes("_domainkey") &&
                          !r.host.startsWith("_dmarc") &&
                          r.host !== "send" &&
                          !r.host.startsWith("_spf") &&
                          r.type !== "A" &&
                          r.type !== "MX"
                      )
                      .map((r, i) => ({
                        keyPrefix: `custom-${r.type}-${i}`,
                        type: `${r.type} Record`,
                        host: r.host,
                        value: r.value,
                        copyValue: r.value,
                      }))),
                  ];

                  return (
                    <div className="border border-kumo-line rounded-xl overflow-hidden bg-kumo-base shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-left border-collapse">
                          <colgroup>
                            <col className="w-[20%]" />
                            <col className="w-[26%]" />
                            <col className="w-[54%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-kumo-recessed/60 border-b border-kumo-line text-[11px] sm:text-[12px] font-medium text-kumo-subtle uppercase tracking-wider select-none">
                              <th className="py-2.5 px-4 text-left font-medium">Type</th>
                              <th className="py-2.5 px-4 text-left font-medium">Host / Name</th>
                              <th className="py-2.5 px-4 text-left font-medium">Value / Content</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-kumo-hairline">
                            {dnsRows.map((row) => (
                              <tr
                                key={row.keyPrefix}
                                className="transition-colors group"
                              >
                                {/* 1. Type (Click to copy) */}
                                <td
                                  onClick={() => handleCopy(row.type, `${row.keyPrefix}-type`)}
                                  className="py-3 px-4 align-middle cursor-pointer hover:bg-kumo-control/50 transition-colors group/cell select-none relative overflow-hidden"
                                  title={`Click to copy: ${row.type}`}
                                >
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span className="font-mono text-[12px] sm:text-[13px] font-medium text-kumo-strong truncate block group-hover/cell:text-kumo-strong transition-colors">
                                      {row.type}
                                    </span>
                                    {copiedKey === `${row.keyPrefix}-type` ? (
                                      <span className="inline-flex items-center gap-1 text-cf-success text-[11px] font-semibold shrink-0 bg-cf-success/10 px-1.5 py-0.5 rounded transition-all animate-in fade-in duration-150">
                                        <Check size={11} weight="bold" />
                                        <span>Copied</span>
                                      </span>
                                    ) : (
                                      <Copy
                                        size={12}
                                        className="text-kumo-subtle opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
                                      />
                                    )}
                                  </div>
                                </td>

                                {/* 2. Host / Name (Click to copy) */}
                                <td
                                  onClick={() => handleCopy(row.host, `${row.keyPrefix}-host`)}
                                  className="py-3 px-4 align-middle cursor-pointer hover:bg-kumo-control/50 transition-colors group/cell select-none relative overflow-hidden"
                                  title={`Click to copy: ${row.host}`}
                                >
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span className="font-mono text-[13px] font-medium text-kumo-strong truncate block group-hover/cell:text-kumo-strong transition-colors">
                                      {row.host}
                                    </span>
                                    {copiedKey === `${row.keyPrefix}-host` ? (
                                      <span className="inline-flex items-center gap-1 text-cf-success text-[11px] font-semibold shrink-0 bg-cf-success/10 px-1.5 py-0.5 rounded transition-all animate-in fade-in duration-150">
                                        <Check size={11} weight="bold" />
                                        <span>Copied</span>
                                      </span>
                                    ) : (
                                      <Copy
                                        size={12}
                                        className="text-kumo-subtle opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
                                      />
                                    )}
                                  </div>
                                </td>

                                {/* 3. Value / Content (Click to copy) */}
                                <td
                                  onClick={() => handleCopy(row.copyValue, `${row.keyPrefix}-value`)}
                                  className="py-3 px-4 align-middle cursor-pointer hover:bg-kumo-control/50 transition-colors group/cell select-none relative overflow-hidden"
                                  title={`Click to copy: ${row.copyValue}`}
                                >
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span className="font-mono text-[12px] sm:text-[13px] text-kumo-default truncate block group-hover/cell:text-kumo-strong transition-colors">
                                      {row.value}
                                    </span>
                                    {copiedKey === `${row.keyPrefix}-value` ? (
                                      <span className="inline-flex items-center gap-1 text-cf-success text-[11px] font-semibold shrink-0 bg-cf-success/10 px-1.5 py-0.5 rounded transition-all animate-in fade-in duration-150">
                                        <Check size={11} weight="bold" />
                                        <span>Copied</span>
                                      </span>
                                    ) : (
                                      <Copy
                                        size={12}
                                        className="text-kumo-subtle opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Reverse DNS (PTR) Callout */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-cf-blue-tint/15 border border-cf-blue-border/30 flex items-start gap-2.5 shadow-2xs">
                  <Info size={15} className="text-cf-blue shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[12px] leading-relaxed">
                    <span className="font-semibold text-kumo-strong block">
                      Reverse DNS (PTR) Requirement
                    </span>
                    <p className="text-kumo-subtle">
                      In your VPS hosting provider control panel (DigitalOcean Networking &rarr; Droplet PTR, Hetzner Server &rarr; Reverse DNS, or AWS Route 53 PTR), set the reverse DNS of{" "}
                      <code className="font-mono text-kumo-strong bg-kumo-base/80 px-1 py-0.5 rounded border border-kumo-line/60">
                        {vpsIp}
                      </code>{" "}
                      to{" "}
                      <code className="font-mono text-kumo-strong bg-kumo-base/80 px-1 py-0.5 rounded border border-kumo-line/60">
                        {mailHostname || `mail.${createdDomain?.domainName || domainName}`}
                      </code>
                      .
                    </p>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3.5 border-t border-kumo-hairline flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-cf-secondary h-9 sm:h-10 px-4 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <span>&larr; Back to Domain Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinish}
                    className="btn-cf-primary h-9 sm:h-10 px-5 text-[13px] sm:text-[14px] font-medium inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] transition-all text-center"
                  >
                    <span>Proceed to Dashboard</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-kumo-muted border-t border-kumo-hairline">
        EmitMail Sovereign Mail Infrastructure &bull; 100% Drop-In Resend Compatibility
      </footer>
    </div>
  );
}
