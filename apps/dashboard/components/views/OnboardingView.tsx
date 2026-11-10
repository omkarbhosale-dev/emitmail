"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  HardDrives,
  Check,
  ArrowRight,
  ArrowsClockwise,
  Info,
  Gear,
  SignOut,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { api, clearAuthToken } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ApiDomain } from "@/types";
import { getStandardDnsRecords } from "@/lib/dnsRecords";
import { DnsRecordsTable } from "@/components/dns/DnsRecordsTable";

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

  const [createdDomain, setCreatedDomain] = useState<ApiDomain | null>(null);

  // Load existing server config and auto-detect VPS IP on mount
  useEffect(() => {
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
            res.config.mailServerHostname !== "localhost"
          ) {
            setMailHostname(res.config.mailServerHostname);
          }
        }
      })
      .catch(() => {});

    api.system
      .detectIp()
      .then((res) => {
        if (res?.ip && res.ip !== "0.0.0.0") {
          setVpsIp((prev) => prev || res.ip || "");
        }
      })
      .catch(() => {});

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
          description: `Detected server IP: ${res.ip}`,
          type: "success",
        });
      } else {
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

  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDomain = domainName.trim().toLowerCase();
    const cleanIp = vpsIp.trim();
    const finalHostname = (mailHostname || `mail.${cleanDomain}`).trim().toLowerCase();
    const finalSpf = (spfDomain || `_spf.${cleanDomain}`).trim().toLowerCase();

    if (!cleanDomain || !cleanDomain.includes(".")) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid top-level domain (e.g. yourcompany.com).",
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
      await api.serverConfig.update({
        mailServerHostname: finalHostname,
        vpsPublicIpv4: cleanIp,
        spfIncludeDomain: finalSpf,
      });

      let domainRes: ApiDomain;
      try {
        domainRes = await api.domains.create({
          domainName: cleanDomain,
          returnPathSubdomain: "send",
        });
      } catch (domErr: unknown) {
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
        title: "Domain Initialized",
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
            title: "Domain Verified",
            description: "All sending DNS records are aligned and verified.",
            type: "success",
          });
        } else {
          toast({
            title: "DNS Propagation in Progress",
            description: "Some DNS records are not detected yet. Please allow a few moments for propagation.",
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

  const standardDns = getStandardDnsRecords({
    domain: createdDomain,
    domainName,
    vpsIp,
    mailHostname,
    spfIncludeDomain: spfDomain,
  });

  const isDomainConfirmed =
    createdDomain?.status === "VERIFIED" || standardDns.isAllSendingVerified;

  const lastDisabledToastRef = useRef<number>(0);
  const notifyDomainUnconfirmed = useCallback(() => {
    const now = Date.now();
    if (now - lastDisabledToastRef.current < 1500) return;
    lastDisabledToastRef.current = now;
    toast({
      title: "Domain Verification Required",
      description: "Please verify your sending DNS records before proceeding to the dashboard.",
      type: "warning",
    });
  }, [toast]);

  const handleFinish = async () => {
    if (!isDomainConfirmed) {
      notifyDomainUnconfirmed();
      return;
    }

    try {
      const activeDomain = createdDomain?.domainName || domainName;
      if (activeDomain) {
        const cleanDom = activeDomain.trim().toLowerCase();
        await api.serverConfig.update({
          mailServerHostname: mailHostname || `mail.${cleanDom}`,
          vpsPublicIpv4: vpsIp || "0.0.0.0",
          spfIncludeDomain: spfDomain || `_spf.${cleanDom}`,
        });
      }
    } catch (e) {
      console.warn("Could not sync serverConfig on finish:", e);
    }

    toast({
      title: "Setup Complete",
      description: "Welcome to your EmitMail dashboard.",
      type: "success",
    });
    window.location.assign("/");
  };

  const handleSignOut = () => {
    clearAuthToken();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Top Focused Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-950 shrink-0">
            <PaperPlaneTilt size={13} weight="fill" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            EmitMail
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="btn-cf-secondary text-xs h-8 px-2.5 inline-flex items-center gap-1.5"
            title="Settings"
          >
            <Gear size={13} />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="btn-cf-danger text-xs h-8 px-2.5 inline-flex items-center gap-1.5"
            title="Sign Out"
          >
            <SignOut size={13} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Centered Setup Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 my-auto">
        <div className={`w-full ${step === 2 ? "max-w-4xl" : "max-w-xl"} border border-zinc-800/80 rounded-lg bg-zinc-900/40 overflow-hidden animate-in fade-in duration-200`}>
          {/* Stepper Header */}
          <div className="border-b border-zinc-800/80 bg-zinc-900/60 px-5 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Step 1 */}
              <div
                onClick={() => setStep(1)}
                className={`flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                  step === 1
                    ? "text-zinc-100 font-medium"
                    : createdDomain
                    ? "text-zinc-300"
                    : "text-zinc-500"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-semibold shrink-0 transition-colors ${
                    step === 1
                      ? "bg-zinc-100 text-zinc-950"
                      : createdDomain
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                  }`}
                >
                  {createdDomain && step !== 1 ? <Check size={11} weight="bold" /> : "1"}
                </span>
                <span>Connect Domain</span>
              </div>

              <div className="hidden sm:block flex-1 h-px bg-zinc-800 mx-2" />

              {/* Step 2 */}
              <div
                onClick={createdDomain ? () => setStep(2) : undefined}
                className={`flex items-center gap-2.5 text-xs transition-colors ${
                  step === 2
                    ? "text-zinc-100 font-medium"
                    : createdDomain
                    ? "text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    : "text-zinc-600 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-semibold shrink-0 transition-colors ${
                    step === 2
                      ? "bg-zinc-100 text-zinc-950"
                      : createdDomain && createdDomain.status === "VERIFIED"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                  }`}
                >
                  {createdDomain && createdDomain.status === "VERIFIED" && step !== 2 ? (
                    <Check size={11} weight="bold" />
                  ) : (
                    "2"
                  )}
                </span>
                <span>Configure DNS Records</span>
              </div>
            </div>
          </div>

          {/* Wizard Content */}
          <div className="p-5 sm:p-6 space-y-5">
            {step === 1 ? (
              /* STEP 1: DOMAIN & VPS INPUT */
              <form onSubmit={handleSubmitStep1} className="space-y-4">
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-[26px] font-semibold text-zinc-100 tracking-tight">
                    Connect Primary Sending Domain
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Enter your sending domain and VPS static IPv4 to generate 2048-bit RSA keys and DNS records.
                  </p>
                </div>

                {/* Primary Domain Name Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                    Sending Domain <span className="text-zinc-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. company.com"
                      value={domainName}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-md text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-2xs text-zinc-500 mt-1">
                    Apex or subdomain you will dispatch messages from.
                  </p>
                </div>

                {/* VPS Public IPv4 Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      VPS Public IPv4 Address <span className="text-zinc-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectIp}
                      disabled={isDetectingIp}
                      className="text-2xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <ArrowsClockwise size={11} className={isDetectingIp ? "animate-spin" : ""} />
                      <span>{isDetectingIp ? "Detecting..." : "Auto-detect IP"}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <HardDrives
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 198.51.100.1"
                      value={vpsIp}
                      onChange={(e) => setVpsIp(e.target.value.trim())}
                      className="w-full h-9 pl-9 pr-3 bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-md text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-2xs text-zinc-500 mt-1">
                    Server outbound IPv4 used for SPF alignment.
                  </p>
                </div>

                {/* Cluster Hostname Preview */}
                {domainName && (
                  <div className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-2">
                    <span className="text-2xs font-mono text-zinc-500 uppercase tracking-wider block">
                      Generated Endpoints
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-2xs text-zinc-500 block">Mail Server EHLO</span>
                        <span className="font-mono text-zinc-300 truncate block">
                          {mailHostname || `mail.${domainName}`}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-2xs text-zinc-500 block">Return-Path Subdomain</span>
                        <span className="font-mono text-zinc-300 truncate block">
                          send.{domainName}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <Link
                    href="/settings"
                    className="btn-cf-secondary text-xs h-9 px-3 text-center"
                  >
                    Configure in Settings
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !domainName.trim() || !vpsIp.trim()}
                    className="btn-cf-primary text-xs h-9 px-4 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowsClockwise size={13} className="animate-spin" />
                        <span>Generating Keys...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate DKIM & DNS Records</span>
                        <ArrowRight size={13} weight="bold" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: MASTER DNS CHECKLIST & PROPAGATION */
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-[26px] font-semibold text-zinc-100 tracking-tight">
                    DNS Verification Checklist
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Add the DNS records below into your DNS provider (Cloudflare, Route 53, etc.) to complete verification.
                  </p>
                </div>

                {/* Domain Verification Status Header Bar */}
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-medium text-zinc-200 truncate">
                        {createdDomain?.domainName || domainName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                          createdDomain?.status === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            createdDomain?.status === "VERIFIED"
                              ? "bg-emerald-400"
                              : "bg-amber-400 animate-pulse"
                          }`}
                        />
                        <span>
                          {createdDomain?.status === "VERIFIED" ? "Verified" : "Pending Propagation"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={isVerifying}
                    className="btn-cf-secondary text-xs h-8 px-3 shrink-0"
                  >
                    <ArrowsClockwise size={12} className={isVerifying ? "animate-spin text-zinc-400" : "text-zinc-400"} />
                    <span>{isVerifying ? "Checking..." : "Check Propagation"}</span>
                  </button>
                </div>

                {/* Standardized DNS Records */}
                <DnsRecordsTable
                  sendingRecords={standardDns.sendingRecords}
                  inboundRecords={standardDns.inboundRecords}
                  showInboundToggleNote={true}
                />

                {/* Reverse DNS (PTR) Callout */}
                <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-2.5 leading-relaxed">
                  <Info size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">Reverse DNS (PTR): </span>
                    In your VPS provider console (DigitalOcean, Hetzner, AWS), set the reverse DNS PTR of{" "}
                    <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">
                      {vpsIp}
                    </code>{" "}
                    to{" "}
                    <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">
                      {mailHostname || `mail.${createdDomain?.domainName || domainName}`}
                    </code>
                    .
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-cf-secondary text-xs h-9 px-3"
                  >
                    <span>&larr; Back to Domain Settings</span>
                  </button>

                  <div
                    onClick={!isDomainConfirmed ? notifyDomainUnconfirmed : undefined}
                    className="inline-flex cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={handleFinish}
                      disabled={!isDomainConfirmed}
                      title={isDomainConfirmed ? "Proceed to Dashboard" : undefined}
                      className={`btn-cf-primary text-xs h-9 px-4 flex items-center gap-1.5 ${
                        !isDomainConfirmed ? "opacity-40 pointer-events-none" : "cursor-pointer"
                      }`}
                    >
                      <span>Proceed to Dashboard</span>
                      <ArrowRight size={13} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
