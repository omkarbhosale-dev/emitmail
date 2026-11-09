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
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";
import { ApiDomain, CreatedApiKeyResponse } from "@/types";

export function CreateApiKeyView() {
  const router = useRouter();
  const { toast } = useToast();
  const { isViewer } = useAuth();

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
        description: "Your key has been copied to clipboard.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the key from the box.",
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
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members are not permitted to generate API keys.",
        type: "error",
      });
      return;
    }

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Breadcrumb / Back button */}
      <div>
        <Link
          href="/api-keys"
          className="inline-flex items-center gap-1.5 text-xs text-kumo-subtle hover:text-kumo-strong transition-colors"
        >
          <CaretLeft size={14} />
          <span>Back to API Keys</span>
        </Link>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access and cannot generate new API keys." />
      )}

      {/* Main Container */}
      {!createdKey ? (
        <div className="bg-kumo-base border border-kumo-hairline rounded-2xl shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-kumo-hairline bg-kumo-recessed/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange shrink-0">
              <Key size={20} weight="bold" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-kumo-strong">Create New API Key</h1>
              <p className="text-xs text-kumo-subtle mt-0.5">
                Generate high-entropy credentials compatible with the official Resend SDK and REST API.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Key Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-kumo-strong">
                Key Name <span className="text-cf-orange">*</span>
              </label>
              <input
                type="text"
                disabled={isViewer}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Webhook Sender or Next.js App"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange disabled:opacity-60"
                autoFocus
                required
              />
              <p className="text-xs text-kumo-subtle">
                A human-readable label to identify where this credential is used.
              </p>
            </div>

            {/* Scope / Domain Restriction */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-kumo-strong flex items-center gap-1.5">
                <Globe size={14} className="text-cf-blue" />
                <span>Domain Permission</span>
              </label>
              <select
                disabled={isViewer || isLoadingDomains}
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange disabled:opacity-60 cursor-pointer"
              >
                <option value="">Full Access (All registered domains)</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    Restricted to: {d.domainName} {d.status === "VERIFIED" ? "(Verified)" : "(Pending)"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-kumo-subtle">
                Restricting an API key prevents accidental unauthorized dispatches across other domains.
              </p>
            </div>

            {/* Expiration Settings */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-kumo-strong flex items-center gap-1.5">
                <Clock size={14} className="text-cf-orange" />
                <span>Expiration Period</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "never", label: "Never expire" },
                  { id: "30d", label: "30 days" },
                  { id: "90d", label: "90 days" },
                  { id: "365d", label: "1 year" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isViewer}
                    onClick={() => setExpirationOption(opt.id)}
                    className={`py-2 px-3 text-xs rounded-lg border text-center transition-all cursor-pointer disabled:opacity-60 ${
                      expirationOption === opt.id
                        ? "bg-cf-orange/10 border-cf-orange text-cf-orange font-semibold"
                        : "bg-kumo-control border-kumo-line text-kumo-subtle hover:text-kumo-strong"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Security Callout Box */}
            <div className="p-4 rounded-xl bg-kumo-control border border-kumo-hairline space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-kumo-strong">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>SHA-256 One-Way Security</span>
              </div>
              <p className="text-xs text-kumo-subtle leading-relaxed">
                EmitMail hashes all API keys using SHA-256 upon generation. The plaintext token (<code className="font-mono text-cf-blue font-semibold">em_live_...</code>) will be displayed exactly once on the next screen.
              </p>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-kumo-hairline">
              <Link
                href="/api-keys"
                className="btn-cf-secondary text-xs"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || isViewer}
                title={isViewer ? "View-only members cannot generate API keys" : undefined}
                className="btn-cf-primary text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start gap-2.5">
            <Warning size={18} weight="fill" className="shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold block text-amber-400">Save your API key securely now</span>
              <span>
                For security reasons, EmitMail never stores plaintext API keys in the database. You will not be able to view this secret token again after leaving this page.
              </span>
            </div>
          </div>

          {/* Plaintext Token Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-kumo-subtle">
              Your API Secret Token
            </label>
            <div className="flex items-center gap-2 bg-kumo-recessed border border-kumo-hairline rounded-xl p-2.5">
              <input
                type="text"
                readOnly
                value={createdKey.apiKey}
                className="w-full bg-transparent font-mono text-xs text-cf-blue font-semibold focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn-cf-secondary shrink-0 flex items-center gap-1.5 text-xs py-1 px-3"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-cf-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Resend SDK Drop-in Code Snippet */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-kumo-strong">
              <Code size={14} className="text-cf-orange" />
              <span>Drop-in Code Example (Resend NPM SDK)</span>
            </div>
            <div className="p-3.5 bg-kumo-recessed border border-kumo-hairline rounded-xl font-mono text-xs text-kumo-default overflow-x-auto leading-relaxed">
              <pre>{`import { Resend } from 'resend';

// Point Resend SDK to your self-hosted EmitMail instance
const resend = new Resend('${createdKey.apiKey}');

await resend.emails.send({
  from: 'notifications@${createdKey.domain?.domainName || "yourdomain.com"}',
  to: 'user@example.com',
  subject: 'Hello from EmitMail',
  html: '<p>Dispatched via EmitMail self-hosted engine.</p>'
});`}</pre>
            </div>
          </div>

          {/* Done Button */}
          <div className="pt-4 border-t border-kumo-hairline flex justify-end">
            <Link
              href="/api-keys"
              className="btn-cf-primary text-xs px-5 py-2"
            >
              Done & Return to API Keys
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
