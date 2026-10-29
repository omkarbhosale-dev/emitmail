"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Key,
  Copy,
  Check,
  Warning,
  CheckCircle,
  CaretLeft,
  Globe,
  Clock,
  ShieldCheck,
  Code,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { ApiDomain, CreatedApiKeyResponse } from "@/types";

export function CreateApiKeyView() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [expirationOption, setExpirationOption] = useState<string>("never");
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch available domains for dropdown
  useEffect(() => {
    let isMounted = true;
    const loadDomains = async () => {
      try {
        const data = await api.domains.list();
        if (isMounted) {
          setDomains(data || []);
        }
      } catch (err) {
        console.warn("Could not load domains list:", err);
      } finally {
        if (isMounted) {
          setIsLoadingDomains(false);
        }
      }
    };
    loadDomains();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = async () => {
    if (!createdKey?.apiKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.apiKey);
      setCopied(true);
      toast({
        title: "API Key Copied",
        description: "Copied secret API token to clipboard.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the key.",
        type: "error",
      });
    }
  };

  const calculateExpiresAt = (option: string): string | null => {
    if (option === "never") return null;
    const now = new Date();
    if (option === "30d") now.setDate(now.getDate() + 30);
    else if (option === "90d") now.setDate(now.getDate() + 90);
    else if (option === "365d") now.setDate(now.getDate() + 365);
    return now.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a key name.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = calculateExpiresAt(expirationOption);
      const res = await api.apiKeys.create({
        name: name.trim(),
        domainId: selectedDomainId ? selectedDomainId : null,
        scopes: ["email:send"],
        expiresAt,
      });

      setCreatedKey(res);
      toast({
        title: "API Key Generated",
        description: "Copy your API key now. It will not be shown again.",
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create API key";
      toast({
        title: "Creation Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    router.push("/api-keys");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-kumo-subtle">
        <Link
          href="/api-keys"
          className="hover:text-kumo-strong transition-colors flex items-center gap-1.5"
        >
          <CaretLeft size={14} />
          <span>API Keys</span>
        </Link>
        <span>/</span>
        <span className="text-kumo-strong font-medium">
          {createdKey ? "Key Generated" : "Create API Key"}
        </span>
      </div>

      {/* 2. Main Content Card */}
      {!createdKey ? (
        /* Form View */
        <div className="bg-kumo-base border border-kumo-hairline rounded-2xl shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-kumo-hairline flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                <Key size={20} weight="bold" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-kumo-strong">Create New API Key</h1>
                <p className="text-xs text-kumo-subtle mt-0.5">
                  Generate high-entropy credentials for sending emails and Resend SDK integration.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Key Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-kumo-strong">
                Key Name <span className="text-kumo-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Web App, Background Queue, Staging"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3.5 py-2.5 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue leading-relaxed"
              />
              <p className="text-[11px] text-kumo-subtle">
                A human-readable label to identify the service or environment using this key.
              </p>
            </div>

            {/* Domain Restriction */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-kumo-strong flex items-center justify-between">
                <span>Domain Restriction</span>
                {isLoadingDomains && (
                  <span className="text-[11px] text-kumo-subtle flex items-center gap-1">
                    <ArrowsClockwise size={11} className="animate-spin" /> Loading domains...
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3.5 py-2.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer appearance-none"
                >
                  <option value="">All Verified Domains (Full Sending Scope)</option>
                  {domains.map((dom) => (
                    <option key={dom.id} value={dom.id}>
                      {dom.domainName} ({dom.status === "VERIFIED" ? "Verified" : dom.status})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-kumo-subtle">
                  <Globe size={14} />
                </div>
              </div>
              <p className="text-[11px] text-kumo-subtle">
                Restrict this API key to a specific verified sender domain to enforce tenancy boundaries.
              </p>
            </div>

            {/* Expiration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-kumo-strong">
                Key Expiration
              </label>
              <div className="relative">
                <select
                  value={expirationOption}
                  onChange={(e) => setExpirationOption(e.target.value)}
                  className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3.5 py-2.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer appearance-none"
                >
                  <option value="never">No Expiration (recommended for persistent services)</option>
                  <option value="30d">30 Days</option>
                  <option value="90d">90 Days</option>
                  <option value="365d">1 Year (365 Days)</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-kumo-subtle">
                  <Clock size={14} />
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-xl bg-kumo-recessed border border-kumo-line flex items-start gap-3">
              <div className="p-1 rounded-md bg-cf-blue/10 text-cf-blue shrink-0 mt-0.5">
                <ShieldCheck size={16} weight="bold" />
              </div>
              <div className="text-xs text-kumo-subtle leading-relaxed">
                <strong className="text-kumo-strong block mb-0.5">
                  Single-View Secret Token Security
                </strong>
                EmitMail hashes all API keys using SHA-256 upon generation. The plaintext token (<code className="font-mono text-cf-blue font-semibold">em_live_...</code>) will be displayed exactly once on the next screen.
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4 border-t border-kumo-hairline flex items-center justify-between">
              <Link
                href="/api-keys"
                className="btn-cf-secondary text-xs"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="btn-cf-primary text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <ArrowsClockwise size={14} className="animate-spin" />
                    <span>Generating Key...</span>
                  </>
                ) : (
                  <>
                    <Key size={14} weight="bold" />
                    <span>Create API Key</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Reveal View (One-time Display) */
        <div className="bg-kumo-base border border-kumo-hairline rounded-2xl shadow-2xs overflow-hidden space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-kumo-hairline pb-4">
            <div className="w-12 h-12 rounded-2xl bg-cf-success/15 border border-cf-success/30 flex items-center justify-center text-cf-success shrink-0">
              <CheckCircle size={26} weight="fill" />
            </div>
            <div>
              <h2 className="text-base font-bold text-kumo-strong">
                API Key Successfully Created
              </h2>
              <p className="text-xs text-kumo-subtle mt-0.5">
                Key name: <strong className="text-kumo-strong font-mono">{createdKey.name}</strong>
              </p>
            </div>
          </div>

          {/* Critical Warning Alert */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <Warning size={20} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-300 font-semibold block">
                Copy your secret API key now!
              </strong>
              <p className="text-amber-200/90 leading-relaxed">
                For security reasons, this token will <strong>never be shown again</strong> once you leave this page. If you lose this key, you will need to generate a new one.
              </p>
            </div>
          </div>

          {/* Token Display Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-kumo-strong">
              Your API Key Token
            </label>
            <div className="p-3 bg-kumo-recessed border border-kumo-line rounded-xl flex items-center justify-between gap-3">
              <code className="font-mono text-xs sm:text-sm text-kumo-strong select-all break-all flex-1 py-1 px-1">
                {createdKey.apiKey}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="btn-cf-primary text-xs shrink-0 flex items-center gap-1.5 cursor-pointer py-2 px-3.5"
                title="Copy full API key"
              >
                {copied ? (
                  <>
                    <Check size={14} weight="bold" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} weight="bold" />
                    <span>Copy Key</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Snippet Preview */}
          <div className="p-4 rounded-xl bg-kumo-control border border-kumo-line space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-kumo-strong">
              <Code size={15} className="text-cf-blue" />
              <span>Integration Quickstart (Resend SDK / Fetch)</span>
            </div>
            <pre className="p-3 rounded-lg bg-kumo-recessed font-mono text-[11px] text-kumo-default overflow-x-auto border border-kumo-hairline select-all leading-relaxed">
{`import { Resend } from 'resend';

const resend = new Resend('${createdKey.apiKey}');

await resend.emails.send({
  from: 'notifications@${createdKey.domain?.domainName || "omkarbhosale.dev"}',
  to: 'user@example.com',
  subject: 'Hello from EmitMail',
  html: '<p>Dispatched via EmitMail self-hosted engine.</p>'
});`}
            </pre>
          </div>

          {/* Done Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleDone}
              className="btn-cf-primary text-xs px-6 py-2.5 cursor-pointer font-semibold flex items-center gap-1.5"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

