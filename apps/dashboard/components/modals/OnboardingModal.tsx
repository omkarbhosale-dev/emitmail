"use client";

import React, { useState, useEffect } from "react";
import {
  X,
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
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ApiDomain, DnsRecordItem } from "@/types";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function OnboardingModal({ isOpen, onClose, onCompleted }: OnboardingModalProps) {
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
  const [masterChecklist, setMasterChecklist] = useState<Array<{
    type: string;
    host?: string;
    value: string;
    purpose: string;
    instructions: string;
  }>>([]);

  // Auto-detect public IP and load initial server config if available
  useEffect(() => {
    if (!isOpen) return;

    // Reset state on open if starting fresh
    if (step === 1 && !createdDomain) {
      api.serverConfig.get()
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

      // Auto-detect server public outbound IP
      api.system.detectIp()
        .then((res) => {
          if (res?.ip && res.ip !== "0.0.0.0") {
            setVpsIp((prev) => prev || res.ip || "");
          }
        })
        .catch(() => {});
    }
  }, [isOpen, step, createdDomain]);

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
        const clientRes = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
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
      } catch (domErr: any) {
        // If domain already exists, fetch it
        const list = await api.domains.list();
        const existing = list.find((d) => d.domainName.toLowerCase() === cleanDomain);
        if (existing) {
          domainRes = existing;
        } else {
          throw domErr;
        }
      }

      setCreatedDomain(domainRes);
      setStep(2);
      toast({
        title: "Server & Domain Provisioned!",
        description: `Generated 2048-bit RSA DKIM and DNS records for ${cleanDomain}.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Onboarding setup failed:", err);
      toast({
        title: "Setup Failed",
        description: err instanceof Error ? err.message : "Unable to complete server setup. Please try again.",
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
    } catch (err: any) {
      toast({
        title: "Verification Check Completed",
        description: err instanceof Error ? err.message : "DNS records are propagating.",
        type: "info",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinish = () => {
    onClose();
    if (onCompleted) {
      onCompleted();
    } else {
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-kumo-hairline">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cf-orange/10 border border-cf-orange/20 flex items-center justify-center text-cf-orange shrink-0 mt-0.5">
              <RocketLaunch size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-cf-orange animate-pulse" />
                  EmitMail Quickstart Setup
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-kumo-recessed text-kumo-subtle border border-kumo-hairline">
                  Step {step} of 2: {step === 1 ? "Domain & VPS Details" : "Master DNS Records"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-kumo-strong tracking-tight">
                {step === 1 ? "Configure Your Sending Domain & VPS" : "Add DNS Records to Your Domain"}
              </h2>
              <p className="text-xs text-kumo-subtle mt-0.5">
                {step === 1
                  ? "Enter your primary sending domain and VPS public IP. EmitMail will configure the mail cluster automatically."
                  : "Copy these records into your DNS provider (Cloudflare, Route 53, Namecheap, etc.) to achieve 10/10 deliverability."}
              </p>
            </div>
          </div>

          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-recessed transition-colors cursor-pointer"
              aria-label="Close setup modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* STEP 1: Domain & VPS Details */}
          {step === 1 && (
            <form onSubmit={handleSubmitStep1} className="space-y-4">
              {/* Primary Sending Domain */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-kumo-strong flex items-center gap-1.5">
                  <Globe size={14} className="text-cf-orange" weight="bold" />
                  <span>Primary Sending Domain</span>
                  <span className="text-cf-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={domainName}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="e.g. yourcompany.com"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-kumo-control border border-kumo-line rounded-xl text-kumo-strong placeholder:text-kumo-subtle focus:outline-hidden focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition-all"
                  />
                </div>
                <p className="text-[11px] text-kumo-subtle">
                  The domain you want to send emails from (e.g. <span className="font-mono text-kumo-default">hello@yourcompany.com</span>).
                </p>
              </div>

              {/* VPS Public IPv4 Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-kumo-strong flex items-center gap-1.5">
                    <HardDrives size={14} className="text-cf-orange" weight="bold" />
                    <span>VPS Public IPv4 Address</span>
                    <span className="text-cf-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectIp}
                    disabled={isDetectingIp}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cf-orange hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <ArrowsClockwise size={12} className={isDetectingIp ? "animate-spin" : ""} />
                    <span>Auto-Detect IP</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={vpsIp}
                  onChange={(e) => setVpsIp(e.target.value.trim())}
                  placeholder="e.g. 198.51.100.1"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-kumo-control border border-kumo-line rounded-xl text-kumo-strong placeholder:text-kumo-subtle focus:outline-hidden focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition-all"
                />
                <p className="text-[11px] text-kumo-subtle">
                  The public IPv4 address of your VPS server hosting EmitMail. Used for SPF authorization and PTR reverse DNS.
                </p>
              </div>

              {/* Live Preview Box */}
              {domainName && (
                <div className="p-3.5 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-kumo-strong">
                    <Sparkle size={14} className="text-cf-orange" weight="fill" />
                    <span>Automated Cluster Configuration</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-kumo-base border border-kumo-hairline">
                      <span className="text-kumo-subtle block">Mail Server Hostname</span>
                      <span className="font-mono font-bold text-kumo-strong truncate block mt-0.5">
                        {mailHostname || `mail.${domainName}`}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-kumo-base border border-kumo-hairline">
                      <span className="text-kumo-subtle block">Return-Path Subdomain</span>
                      <span className="font-mono font-bold text-kumo-strong truncate block mt-0.5">
                        send.{domainName}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-kumo-base border border-kumo-hairline">
                      <span className="text-kumo-subtle block">Master SPF Include</span>
                      <span className="font-mono font-bold text-kumo-strong truncate block mt-0.5">
                        {spfDomain || `_spf.${domainName}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Customization Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex items-center gap-1 text-xs text-kumo-subtle hover:text-kumo-strong font-medium transition-colors cursor-pointer"
                >
                  <CaretDown size={12} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  <span>Advanced Hostname Settings</span>
                </button>

                {showAdvanced && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-kumo-recessed/50 border border-kumo-hairline space-y-3 animate-in fade-in">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-kumo-strong">
                        Custom SMTP EHLO Hostname
                      </label>
                      <input
                        type="text"
                        value={mailHostname}
                        onChange={(e) => setMailHostname(e.target.value.toLowerCase().trim())}
                        placeholder={`mail.${domainName || "yourdomain.com"}`}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-kumo-control border border-kumo-line rounded-lg text-kumo-strong"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-kumo-strong">
                        Custom SPF Include Domain
                      </label>
                      <input
                        type="text"
                        value={spfDomain}
                        onChange={(e) => setSpfDomain(e.target.value.toLowerCase().trim())}
                        placeholder={`_spf.${domainName || "yourdomain.com"}`}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-kumo-control border border-kumo-line rounded-lg text-kumo-strong"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-kumo-hairline flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-recessed rounded-xl transition-colors cursor-pointer"
                >
                  Configure Later
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !domainName || !vpsIp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-cf-orange hover:bg-cf-orange-hover text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowsClockwise size={14} className="animate-spin" />
                      <span>Generating DKIM Keys...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Generate DNS Records</span>
                      <ArrowRight size={14} weight="bold" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Interactive Master DNS Records Checklist */}
          {step === 2 && createdDomain && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="p-3.5 rounded-xl bg-cf-success/10 border border-cf-success/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-cf-success font-semibold">
                  <CheckCircle size={18} weight="fill" />
                  <span>
                    Server configured for <span className="font-mono underline">{createdDomain.domainName}</span> with 2048-bit RSA encryption
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyDns}
                  disabled={isVerifying}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-cf-success text-white hover:bg-cf-success/90 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <ArrowsClockwise size={12} className={isVerifying ? "animate-spin" : ""} />
                  <span>Verify DNS</span>
                </button>
              </div>

              <div className="text-xs text-kumo-subtle">
                Add these records to your DNS provider (e.g. Cloudflare, AWS Route 53, Namecheap, GoDaddy):
              </div>

              {/* Records Checklist */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {/* 1. DKIM Record */}
                {createdDomain.dnsRecords
                  ?.filter((r) => r.type === "TXT" && r.host.includes("_domainkey"))
                  .map((r, i) => (
                    <div key={`dkim-${i}`} className="p-3 rounded-xl bg-kumo-control border border-kumo-line space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                            TXT (DKIM)
                          </span>
                          <span className="text-xs font-mono font-bold text-kumo-strong">{r.host}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-kumo-subtle">2048-Bit RSA Signature</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-kumo-base p-2 rounded-lg border border-kumo-hairline">
                        <code className="text-[11px] font-mono text-kumo-default truncate select-all">{r.value}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.value, `dkim-${i}`)}
                          className="px-2 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedKey === `dkim-${i}` ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                          <span>{copiedKey === `dkim-${i}` ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* 2. Return-Path SPF Record */}
                {createdDomain.dnsRecords
                  ?.filter((r) => r.type === "TXT" && r.host === createdDomain.returnPathSubdomain)
                  .map((r, i) => (
                    <div key={`spf-${i}`} className="p-3 rounded-xl bg-kumo-control border border-kumo-line space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-blue/15 text-cf-chart-blue border border-cf-chart-blue/25">
                            TXT (SPF)
                          </span>
                          <span className="text-xs font-mono font-bold text-kumo-strong">{r.host}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-kumo-subtle">Return-Path SPF Alignment</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-kumo-base p-2 rounded-lg border border-kumo-hairline">
                        <code className="text-[11px] font-mono text-kumo-default truncate select-all">{r.value}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.value, `spf-${i}`)}
                          className="px-2 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedKey === `spf-${i}` ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                          <span>{copiedKey === `spf-${i}` ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* 3. Master SPF Authority Record */}
                <div className="p-3 rounded-xl bg-kumo-control border border-kumo-line space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-blue/15 text-cf-chart-blue border border-cf-chart-blue/25">
                        TXT (Master SPF)
                      </span>
                      <span className="text-xs font-mono font-bold text-kumo-strong">{spfDomain || `_spf.${createdDomain.domainName}`}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-kumo-subtle">Server IP Authorization</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-kumo-base p-2 rounded-lg border border-kumo-hairline">
                    <code className="text-[11px] font-mono text-kumo-default truncate select-all">v=spf1 ip4:{vpsIp} -all</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(`v=spf1 ip4:${vpsIp} -all`, "master-spf")}
                      className="px-2 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === "master-spf" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                      <span>{copiedKey === "master-spf" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* 4. DMARC Policy Record */}
                {createdDomain.dnsRecords
                  ?.filter((r) => r.type === "TXT" && r.host.startsWith("_dmarc"))
                  .map((r, i) => (
                    <div key={`dmarc-${i}`} className="p-3 rounded-xl bg-kumo-control border border-kumo-line space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-purple/15 text-cf-chart-purple border border-cf-chart-purple/25">
                            TXT (DMARC)
                          </span>
                          <span className="text-xs font-mono font-bold text-kumo-strong">{r.host}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-kumo-subtle">Strict Spoofing Defense</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-kumo-base p-2 rounded-lg border border-kumo-hairline">
                        <code className="text-[11px] font-mono text-kumo-default truncate select-all">{r.value}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.value, `dmarc-${i}`)}
                          className="px-2 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedKey === `dmarc-${i}` ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                          <span>{copiedKey === `dmarc-${i}` ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* 5. Mail Server A Record */}
                <div className="p-3 rounded-xl bg-kumo-control border border-kumo-line space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-chart-green/15 text-cf-chart-green border border-cf-chart-green/25">
                        A Record
                      </span>
                      <span className="text-xs font-mono font-bold text-kumo-strong">{mailHostname || `mail.${createdDomain.domainName}`}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-kumo-subtle">Points to VPS IPv4</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-kumo-base p-2 rounded-lg border border-kumo-hairline">
                    <code className="text-[11px] font-mono text-kumo-default truncate select-all">{vpsIp}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(vpsIp, "a-record")}
                      className="px-2 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === "a-record" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                      <span>{copiedKey === "a-record" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* 6. Inbound Mail MX Record */}
                <div className="p-3 rounded-xl bg-kumo-control border border-kumo-line space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                        MX (Priority 10)
                      </span>
                      <span className="text-xs font-mono font-bold text-kumo-strong">@ ({createdDomain.domainName})</span>
                    </div>
                    <span className="text-[10px] font-semibold text-kumo-subtle">Inbound Mailboxes</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-kumo-base p-2 rounded-lg border border-kumo-hairline">
                    <code className="text-[11px] font-mono text-kumo-default truncate select-all">{mailHostname || `mail.${createdDomain.domainName}`}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(mailHostname || `mail.${createdDomain.domainName}`, "mx-record")}
                      className="px-2 py-1 text-xs rounded bg-kumo-elevated hover:bg-kumo-line text-kumo-strong flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === "mx-record" ? <Check size={12} className="text-cf-success" /> : <Copy size={12} />}
                      <span>{copiedKey === "mx-record" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* 7. Reverse DNS (PTR) Callout */}
                <div className="p-3 rounded-xl bg-kumo-recessed border border-kumo-hairline flex items-start gap-2.5">
                  <Info size={16} className="text-cf-orange shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] text-kumo-subtle">
                    <span className="font-semibold text-kumo-strong block">Reverse DNS (PTR) Step</span>
                    <span>
                      In your VPS host control panel (DigitalOcean, Hetzner, AWS, Linode), set the PTR of{" "}
                      <code className="font-mono text-kumo-strong">{vpsIp}</code> to{" "}
                      <code className="font-mono text-kumo-strong">{mailHostname || `mail.${createdDomain.domainName}`}</code>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-kumo-hairline flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3.5 py-2 text-xs font-medium text-kumo-subtle hover:text-kumo-strong rounded-xl transition-colors cursor-pointer"
                >
                  &larr; Back to Details
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-cf-orange hover:bg-cf-orange-hover text-white rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
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
    </div>
  );
}
