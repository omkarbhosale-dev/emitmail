"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Plus,
  ShieldCheck,
  Check,
  WarningCircle,
  Lightning,
  Key,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

export function AddDomainView() {
  const router = useRouter();
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [domainName, setDomainName] = useState("");
  const [dkimSelector, setDkimSelector] = useState("esp");
  const [returnPathSubdomain, setReturnPathSubdomain] = useState("send");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanDomain = domainName.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members are not permitted to register sending domains.",
        type: "error",
      });
      return;
    }

    if (!cleanDomain) {
      setErrorMessage("Please enter a valid domain name");
      return;
    }

    // Basic domain validation
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      setErrorMessage("Please enter a valid domain format (e.g., yourdomain.com)");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdDomain = await api.domains.create({
        domainName: cleanDomain,
        dkimSelector: dkimSelector.trim() || "esp",
        returnPathSubdomain: returnPathSubdomain.trim() || "send",
      });

      toast({
        title: "Domain Created Successfully",
        description: `Generated 2048-bit DKIM keys and DNS records for ${createdDomain.domainName}.`,
        type: "success",
      });

      // Navigate to the newly created domain details page to configure DNS
      router.push(`/domains/${createdDomain.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register domain";
      setErrorMessage(msg);
      toast({
        title: "Registration Failed",
        description: msg,
        type: "error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back button */}
      <div>
        <Link
          href="/domains"
          className="inline-flex items-center gap-1.5 text-xs text-kumo-subtle hover:text-kumo-strong transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Domains</span>
        </Link>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access and cannot register new sending domains." />
      )}

      {/* Main Form Card */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-kumo-hairline bg-kumo-recessed/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cf-orange/10 border border-cf-orange-border/40 flex items-center justify-center text-cf-orange shrink-0">
              <Globe size={22} weight="bold" />
            </div>
            <div>
              <h1 className="text-base font-bold text-kumo-strong">
                Add Sending Domain
              </h1>
              <p className="text-xs text-kumo-subtle mt-0.5">
                EmitMail will generate dedicated 2048-bit RSA DKIM keys, Return-Path SPF, MX routing, and DMARC records.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <WarningCircle size={15} weight="fill" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Domain Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="domain-name"
              className="block text-xs font-semibold text-kumo-strong"
            >
              Domain Name <span className="text-cf-orange">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-kumo-subtle">
                <Globe size={16} />
              </div>
              <input
                id="domain-name"
                type="text"
                disabled={isViewer}
                value={domainName}
                onChange={(e) => {
                  setDomainName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="example.com"
                className="w-full pl-9 pr-3 py-2 bg-kumo-control border border-kumo-line rounded-lg text-xs text-kumo-strong font-mono focus:outline-none focus:border-cf-orange transition-colors disabled:opacity-60"
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-kumo-subtle">
              Enter your root apex domain (e.g., <code className="text-kumo-strong">yourcompany.com</code>) or a sending subdomain (<code className="text-kumo-strong">mail.yourcompany.com</code>).
            </p>
          </div>

          {/* Advanced DKIM & Return-Path Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* DKIM Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="dkim-selector"
                className="block text-xs font-semibold text-kumo-strong"
              >
                DKIM Selector
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-kumo-subtle">
                  <Key size={16} />
                </div>
                <input
                  id="dkim-selector"
                  type="text"
                  disabled={isViewer}
                  value={dkimSelector}
                  onChange={(e) => setDkimSelector(e.target.value.toLowerCase().trim())}
                  placeholder="esp"
                  className="w-full pl-9 pr-3 py-2 bg-kumo-control border border-kumo-line rounded-lg text-xs text-kumo-strong font-mono focus:outline-none focus:border-cf-orange transition-colors disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-kumo-subtle">
                Default: <code className="text-cf-orange">esp</code> &rarr; Host: <code className="text-kumo-strong">{dkimSelector || "esp"}._domainkey.{cleanDomain || "example.com"}</code>
              </p>
            </div>

            {/* Return-Path Subdomain */}
            <div className="space-y-1.5">
              <label
                htmlFor="return-path-sub"
                className="block text-xs font-semibold text-kumo-strong"
              >
                Return-Path Subdomain (Envelope Bounces)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-kumo-subtle">
                  <Lightning size={16} />
                </div>
                <input
                  id="return-path-sub"
                  type="text"
                  disabled={isViewer}
                  value={returnPathSubdomain}
                  onChange={(e) => setReturnPathSubdomain(e.target.value.toLowerCase().trim())}
                  placeholder="send"
                  className="w-full pl-9 pr-3 py-2 bg-kumo-control border border-kumo-line rounded-lg text-xs text-kumo-strong font-mono focus:outline-none focus:border-cf-orange transition-colors disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-kumo-subtle">
                Default: <code className="text-cf-orange">send</code> &rarr; Host: <code className="text-kumo-strong">{returnPathSubdomain || "send"}.{cleanDomain || "example.com"}</code>
              </p>
            </div>
          </div>

          {/* Deliverability Guarantee Explainer Box */}
          <div className="p-4 rounded-xl bg-kumo-control border border-kumo-hairline space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-kumo-strong">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>What happens next?</span>
            </div>
            <p className="text-xs text-kumo-subtle leading-relaxed">
              EmitMail cryptographically generates a private/public <strong>2048-bit RSA keypair</strong> stored in encrypted AES-256 storage. On the next screen, you will receive your exact DNS configuration records (DKIM, Return-Path SPF, Bounce MX, and DMARC).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-kumo-base border border-kumo-hairline text-kumo-strong">
                <Check size={10} className="text-cf-orange" /> 2048-bit RSA DKIM
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-kumo-base border border-kumo-hairline text-kumo-strong">
                <Check size={10} className="text-cf-orange" /> SPF Alignment
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-kumo-base border border-kumo-hairline text-kumo-strong">
                <Check size={10} className="text-cf-orange" /> MX Bounce Handler
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-kumo-hairline">
            <Link
              href="/domains"
              className="btn-cf-secondary text-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !cleanDomain || isViewer}
              title={isViewer ? "View-only members cannot register domains" : undefined}
              className="btn-cf-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={14} className="animate-spin" />
                  <span>Registering Domain...</span>
                </>
              ) : (
                <>
                  <Plus size={14} weight="bold" />
                  <span>Register & Configure DNS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
