"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  HardDrives,
  CheckCircle,
  Copy,
  Check,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  ArrowsClockwise,
  WarningCircle,
  Info,
  RocketLaunch,
  CaretDown,
  Gear,
  SignOut,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { api, clearAuthToken } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ApiDomain, DnsRecordItem } from "@/types";

export function OnboardingView() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [domainName, setDomainName] = useState("");
  const [vpsIp, setVpsIp] = useState("");
  const [mailHostname, setMailHostname] = useState("");
  const [spfDomain, setSpfDomain] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isDetectingIp, setIsDetectingIp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [createdDomain, setCreatedDomain] = useState<ApiDomain | null>(null);
  const [masterChecklist, setMasterChecklist] = useState<
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

    if (clean && !showAdvanced) {
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
      <header className="border-b border-kumo-hairline bg-kumo-base/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-logo font-extrabold text-xl tracking-tight text-cf-orange">
            emitmail
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
            <Sparkle size={12} weight="fill" />
            <span>Setup Wizard</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kumo-default hover:text-kumo-strong hover:bg-kumo-recessed border border-kumo-hairline transition-colors cursor-pointer"
            title="Go to Settings"
          >
            <Gear size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kumo-muted hover:text-kumo-strong hover:bg-kumo-recessed transition-colors cursor-pointer"
            title="Sign Out"
          >
            <SignOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Centered Setup Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-3xl bg-kumo-base border border-kumo-line rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200">
          {/* Wizard Header Progress Bar */}
          <div className="p-5 sm:p-7 border-b border-kumo-hairline bg-kumo-recessed/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cf-orange/15 text-cf-orange flex items-center justify-center shrink-0">
                {step === 1 ? <Globe size={22} weight="bold" /> : <ShieldCheck size={22} weight="bold" />}
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-kumo-strong flex items-center gap-2">
                  {step === 1 ? "1. Connect Primary Sending Domain" : "2. Master DNS Verification Checklist"}
                </h1>
                <p className="text-xs text-kumo-subtle mt-0.5">
                  {step === 1
                    ? "Enter your root domain and VPS outbound IPv4 address to auto-generate 2048-bit RSA keys."
                    : "Add the generated DNS records into your DNS provider (Cloudflare, Route 53, Namecheap)."}
                </p>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  step === 1
                    ? "bg-cf-orange text-white shadow-2xs"
                    : "bg-kumo-elevated text-kumo-subtle hover:text-kumo-strong cursor-pointer"
                }`}
                onClick={() => setStep(1)}
              >
                Step 1
              </span>
              <span className="text-kumo-muted">&rarr;</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  step === 2
                    ? "bg-cf-orange text-white shadow-2xs"
                    : "bg-kumo-elevated text-kumo-subtle"
                }`}
              >
                Step 2
              </span>
            </div>
          </div>

          {/* Wizard Body Content */}
          <div className="p-5 sm:p-7">
            {step === 1 ? (
              /* STEP 1: DOMAIN & VPS INPUT */
              <form onSubmit={handleSubmitStep1} className="space-y-5">
                {/* Notice Banner */}
                <div className="p-4 rounded-xl bg-cf-orange-tint border border-cf-orange-border flex items-start gap-3">
                  <Sparkle size={18} className="text-cf-orange shrink-0 mt-0.5" weight="fill" />
                  <div className="text-xs text-kumo-strong leading-relaxed space-y-1">
                    <p className="font-semibold text-cf-orange">
                      Zero-Friction Email Deliverability (10/10 Score)
                    </p>
                    <p className="text-kumo-muted">
                      EmitMail configures custom Return-Path bounce handling (
                      <code className="text-kumo-strong font-mono">send.yourdomain.com</code>
                      ), 2048-bit RSA DKIM signing, and strict DMARC alignment right out of the box.
                    </p>
                  </div>
                </div>

                {/* Primary Domain Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-kumo-strong uppercase tracking-wider font-mono">
                    Primary Sending Domain *
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
                      className="w-full pl-10 pr-4 py-2.5 bg-kumo-control border border-kumo-line rounded-xl text-sm font-mono text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-kumo-subtle">
                    Enter the apex or subdomain you will send emails from.
                  </p>
                </div>

                {/* VPS Public IPv4 Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-kumo-strong uppercase tracking-wider font-mono">
                      VPS Public IPv4 Address *
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectIp}
                      disabled={isDetectingIp}
                      className="text-[11px] text-cf-blue hover:underline flex items-center gap-1 font-mono disabled:opacity-50 cursor-pointer"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-kumo-control border border-kumo-line rounded-xl text-sm font-mono text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-kumo-subtle">
                    Your server&apos;s public static IPv4 address. Used for SPF authorization and MTA identification.
                  </p>
                </div>

                {/* Cluster Hostname Auto-Calculation Preview */}
                {domainName && (
                  <div className="p-4 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-2 animate-in fade-in duration-150">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-kumo-muted font-semibold block">
                      Auto-Configured Cluster Records Preview
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-kumo-base border border-kumo-hairline">
                        <span className="text-[10px] text-kumo-subtle block">Mail Server EHLO</span>
                        <span className="font-semibold text-cf-orange truncate block">
                          {mailHostname || `mail.${domainName}`}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-kumo-base border border-kumo-hairline">
                        <span className="text-[10px] text-kumo-subtle block">Return-Path Subdomain</span>
                        <span className="font-semibold text-cf-blue truncate block">
                          send.{domainName}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-kumo-base border border-kumo-hairline">
                        <span className="text-[10px] text-kumo-subtle block">Master SPF Host</span>
                        <span className="font-semibold text-kumo-strong truncate block">
                          {spfDomain || `_spf.${domainName}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Overrides Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-medium text-kumo-subtle hover:text-kumo-strong flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CaretDown
                      size={14}
                      className={`transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
                    />
                    <span>Advanced Hostname Overrides (Optional)</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 p-4 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-3.5 animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-medium text-kumo-muted block">
                          Mail Server Hostname (EHLO FQDN)
                        </label>
                        <input
                          type="text"
                          value={mailHostname}
                          onChange={(e) => setMailHostname(e.target.value.trim().toLowerCase())}
                          placeholder={`mail.${domainName || "example.com"}`}
                          className="w-full px-3 py-1.5 bg-kumo-base border border-kumo-line rounded-lg text-xs font-mono text-kumo-strong focus:outline-none focus:border-cf-blue"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-medium text-kumo-muted block">
                          SPF Include Domain (Apex Authorization)
                        </label>
                        <input
                          type="text"
                          value={spfDomain}
                          onChange={(e) => setSpfDomain(e.target.value.trim().toLowerCase())}
                          placeholder={`_spf.${domainName || "example.com"}`}
                          className="w-full px-3 py-1.5 bg-kumo-base border border-kumo-line rounded-lg text-xs font-mono text-kumo-strong focus:outline-none focus:border-cf-blue"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit / Proceed Button */}
                <div className="pt-4 border-t border-kumo-hairline flex items-center justify-between gap-3">
                  <Link
                    href="/settings"
                    className="px-4 py-2 text-xs font-medium text-kumo-subtle hover:text-kumo-strong transition-colors"
                  >
                    Configure in Settings &rarr;
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !domainName.trim() || !vpsIp.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-cf-orange hover:bg-cf-orange-hover text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Domain Verification Status Header Bar */}
                <div className="p-4 rounded-xl bg-kumo-control border border-kumo-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        createdDomain?.status === "VERIFIED"
                          ? "bg-cf-success animate-pulse"
                          : "bg-cf-amber"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-mono font-bold text-kumo-strong flex items-center gap-2">
                        <span>{createdDomain?.domainName || domainName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            createdDomain?.status === "VERIFIED"
                              ? "bg-cf-success/15 text-cf-success border border-cf-success/30"
                              : "bg-cf-amber/15 text-cf-amber border border-cf-amber/30"
                          }`}
                        >
                          {createdDomain?.status === "VERIFIED" ? "100% VERIFIED" : "PENDING DNS PROPAGATION"}
                        </span>
                      </div>
                      <p className="text-[11px] text-kumo-subtle mt-0.5">
                        Add the DNS records below in Cloudflare, AWS Route 53, or your registrar console.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-kumo-base hover:bg-kumo-elevated text-kumo-strong border border-kumo-line transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <ArrowsClockwise size={13} className={isVerifying ? "animate-spin text-cf-orange" : ""} />
                    <span>{isVerifying ? "Checking Nameservers..." : "Check Propagation"}</span>
                  </button>
                </div>

                {/* DNS Records List */}
                <div className="space-y-3">
                  {/* 1. 2048-Bit RSA DKIM Key Record */}
                  <div className="p-3.5 rounded-xl bg-kumo-control border border-kumo-line space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-blue/15 text-cf-chart-blue border border-cf-chart-blue/25">
                          TXT (DKIM)
                        </span>
                        <span className="text-xs font-mono font-bold text-kumo-strong">
                          {createdDomain?.dkimSelector || "esp"}._domainkey
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-cf-success">
                        2048-Bit RSA Key Pair
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-kumo-base p-2.5 rounded-lg border border-kumo-hairline">
                      <code className="text-[11px] font-mono text-kumo-default truncate select-all">
                        {createdDomain?.dkimPublicKey
                          ? `v=DKIM1; k=rsa; p=${createdDomain.dkimPublicKey}`
                          : "Loading DKIM public key..."}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `v=DKIM1; k=rsa; p=${createdDomain?.dkimPublicKey || ""}`,
                            "dkim"
                          )
                        }
                        className="px-2.5 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                      >
                        {copiedKey === "dkim" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                        <span>{copiedKey === "dkim" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Return-Path Subdomain SPF Record */}
                  <div className="p-3.5 rounded-xl bg-kumo-control border border-kumo-line space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                          TXT (Sender SPF)
                        </span>
                        <span className="text-xs font-mono font-bold text-kumo-strong">send</span>
                      </div>
                      <span className="text-[10px] font-semibold text-kumo-subtle">
                        Return-Path Bounce SPF
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-kumo-base p-2.5 rounded-lg border border-kumo-hairline">
                      <code className="text-[11px] font-mono text-kumo-default truncate select-all">
                        {`v=spf1 ip4:${vpsIp} a mx -all`}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(`v=spf1 ip4:${vpsIp} a mx -all`, "spf-send")}
                        className="px-2.5 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                      >
                        {copiedKey === "spf-send" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                        <span>{copiedKey === "spf-send" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Apex / Master SPF Include Record */}
                  <div className="p-3.5 rounded-xl bg-kumo-control border border-kumo-line space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-blue/15 text-cf-chart-blue border border-cf-chart-blue/25">
                          TXT (Master SPF)
                        </span>
                        <span className="text-xs font-mono font-bold text-kumo-strong">
                          {spfDomain ? spfDomain.replace(`.${domainName}`, "") : "_spf"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-kumo-subtle">
                        Authorized Cluster IP
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-kumo-base p-2.5 rounded-lg border border-kumo-hairline">
                      <code className="text-[11px] font-mono text-kumo-default truncate select-all">
                        {`v=spf1 ip4:${vpsIp} ~all`}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(`v=spf1 ip4:${vpsIp} ~all`, "spf-master")}
                        className="px-2.5 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                      >
                        {copiedKey === "spf-master" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                        <span>{copiedKey === "spf-master" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. DMARC Policy Record */}
                  {createdDomain?.dnsRecords
                    ?.filter((r) => r.type === "TXT" && r.host.startsWith("_dmarc"))
                    .map((r, i) => (
                      <div key={`dmarc-${i}`} className="p-3.5 rounded-xl bg-kumo-control border border-kumo-line space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-purple/15 text-cf-chart-purple border border-cf-chart-purple/25">
                              TXT (DMARC)
                            </span>
                            <span className="text-xs font-mono font-bold text-kumo-strong">{r.host}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-kumo-subtle">Strict Spoofing Defense</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-kumo-base p-2.5 rounded-lg border border-kumo-hairline">
                          <code className="text-[11px] font-mono text-kumo-default truncate select-all">{r.value}</code>
                          <button
                            type="button"
                            onClick={() => handleCopy(r.value, `dmarc-${i}`)}
                            className="px-2.5 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                          >
                            {copiedKey === `dmarc-${i}` ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                            <span>{copiedKey === `dmarc-${i}` ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      </div>
                    ))}

                  {/* 5. Mail Server A Record */}
                  <div className="p-3.5 rounded-xl bg-kumo-control border border-kumo-line space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-green/15 text-cf-chart-green border border-cf-chart-green/25">
                          A Record
                        </span>
                        <span className="text-xs font-mono font-bold text-kumo-strong">
                          {mailHostname || `mail.${createdDomain?.domainName || domainName}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-kumo-subtle">Points to VPS IPv4</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-kumo-base p-2.5 rounded-lg border border-kumo-hairline">
                      <code className="text-[11px] font-mono text-kumo-default truncate select-all">{vpsIp}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(vpsIp, "a-record")}
                        className="px-2.5 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                      >
                        {copiedKey === "a-record" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                        <span>{copiedKey === "a-record" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 6. Inbound Mail MX Record */}
                  <div className="p-3.5 rounded-xl bg-kumo-control border border-kumo-line space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                          MX (Priority 10)
                        </span>
                        <span className="text-xs font-mono font-bold text-kumo-strong">
                          @ ({createdDomain?.domainName || domainName})
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-kumo-subtle">Inbound Mailboxes</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-kumo-base p-2.5 rounded-lg border border-kumo-hairline">
                      <code className="text-[11px] font-mono text-kumo-default truncate select-all">
                        {mailHostname || `mail.${createdDomain?.domainName || domainName}`}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            mailHostname || `mail.${createdDomain?.domainName || domainName}`,
                            "mx-record"
                          )
                        }
                        className="px-2.5 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                      >
                        {copiedKey === "mx-record" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                        <span>{copiedKey === "mx-record" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 7. Reverse DNS (PTR) Callout */}
                  <div className="p-4 rounded-xl bg-kumo-recessed border border-kumo-hairline flex items-start gap-3">
                    <Info size={18} className="text-cf-orange shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-kumo-subtle leading-relaxed">
                      <span className="font-semibold text-kumo-strong block">Reverse DNS (PTR) Requirement</span>
                      <p>
                        In your VPS hosting provider control panel (DigitalOcean Networking &rarr; Droplet PTR, Hetzner Server &rarr; Reverse DNS, or AWS Route 53 PTR), set the reverse DNS of{" "}
                        <code className="font-mono text-kumo-strong">{vpsIp}</code> to{" "}
                        <code className="font-mono text-kumo-strong">
                          {mailHostname || `mail.${createdDomain?.domainName || domainName}`}
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 border-t border-kumo-hairline flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-medium text-kumo-subtle hover:text-kumo-strong rounded-xl transition-colors cursor-pointer"
                  >
                    &larr; Back to Domain Details
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-cf-orange hover:bg-cf-orange-hover text-white rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      <span>Proceed to Dashboard</span>
                      <ArrowRight size={14} weight="bold" />
                    </button>
                  </div>
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
