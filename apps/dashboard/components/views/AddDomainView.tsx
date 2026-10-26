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
import { api } from "@/lib/api";

export function AddDomainView() {
  const router = useRouter();
  const { toast } = useToast();

  const [domainName, setDomainName] = useState("");
  const [dkimSelector, setDkimSelector] = useState("esp");
  const [returnPathSubdomain, setReturnPathSubdomain] = useState("send");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanDomain = domainName.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Navigate to the newly created domain configuration page
      router.push(`/domains/${createdDomain.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register domain";
      setErrorMessage(msg);
      toast({
        title: "Registration Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-kumo-subtle">
        <Link
          href="/domains"
          className="hover:text-kumo-strong transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>Back to Domains</span>
        </Link>
        <span>/</span>
        <span className="text-kumo-strong font-medium">Add Domain</span>
      </div>

      {/* Page Header */}
      <div className="border-b border-kumo-hairline pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cf-orange/10 border border-cf-orange/20 flex items-center justify-center text-cf-orange">
            <Globe size={20} weight="bold" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
              Register a New Sending Domain
            </h1>
            <p className="text-xs text-kumo-subtle mt-0.5">
              EmitMail will generate dedicated 2048-bit RSA DKIM keys, Return-Path SPF, MX routing, and DMARC records.
            </p>
          </div>
        </div>
      </div>

      {/* Main Registration Form Card */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs flex items-center gap-2.5">
              <WarningCircle size={18} weight="fill" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Domain Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="domain-name"
              className="block text-xs font-semibold text-kumo-strong uppercase tracking-wider"
            >
              Domain Name <span className="text-cf-orange">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-kumo-subtle">
                <Globe size={18} />
              </div>
              <input
                id="domain-name"
                type="text"
                required
                value={domainName}
                onChange={(e) => setDomainName(e.target.value.toLowerCase())}
                placeholder="omkarbhosale.dev or mail.company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-kumo-control border border-kumo-line rounded-xl text-sm text-kumo-strong placeholder:text-kumo-subtle focus:outline-none focus:border-cf-orange transition-colors"
              />
            </div>
            <p className="text-[11px] text-kumo-subtle">
              Enter your root domain or subdomain without http:// or https://.
            </p>
          </div>

          {/* 2. Advanced DNS Settings Grid */}
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
                  value={dkimSelector}
                  onChange={(e) => setDkimSelector(e.target.value.toLowerCase().trim())}
                  placeholder="esp"
                  className="w-full pl-9 pr-3 py-2 bg-kumo-control border border-kumo-line rounded-lg text-xs text-kumo-strong font-mono focus:outline-none focus:border-cf-orange transition-colors"
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
                  value={returnPathSubdomain}
                  onChange={(e) => setReturnPathSubdomain(e.target.value.toLowerCase().trim())}
                  placeholder="send"
                  className="w-full pl-9 pr-3 py-2 bg-kumo-control border border-kumo-line rounded-lg text-xs text-kumo-strong font-mono focus:outline-none focus:border-cf-orange transition-colors"
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
            <ul className="text-xs text-kumo-subtle space-y-1.5 pl-5 list-disc">
              <li>
                EmitMail cryptographically generates a private/public <strong>2048-bit RSA keypair</strong> stored in encrypted AES-256 storage.
              </li>
              <li>
                You will be provided with <strong>4 standard DNS records</strong> (DKIM TXT, Return-Path SPF, Return-Path MX, and DMARC).
              </li>
              <li>
                Once added to your DNS host (Cloudflare, Route53, Namecheap), click <strong>Verify DNS</strong> to unlock instant mail dispatch with a 10/10 deliverability score.
              </li>
            </ul>
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
              disabled={isSubmitting || !cleanDomain}
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
