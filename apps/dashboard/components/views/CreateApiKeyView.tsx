"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Key,
  Copy,
  Check,
  WarningCircle,
  CaretLeft,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";
import { ApiDomain, CreatedApiKeyResponse } from "@/types";

export function CreateApiKeyView() {
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [name, setName] = useState("");
  const [permissionScope, setPermissionScope] = useState<"full" | "sending">("sending");
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [expirationOption, setExpirationOption] = useState<string>("never");
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.domains.list()
      .then((data) => {
        if (isMounted) setDomains(data || []);
      })
      .catch((err) => {
        console.warn("Could not load domains list:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDomains(false);
      });

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
        title: "Key Copied",
        description: "API key copied to clipboard.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the key.",
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
      const scopes = permissionScope === "full"
        ? ["email:send", "inbox:read", "domains:read"]
        : ["email:send"];

      const res = await api.apiKeys.create({
        name: name.trim(),
        domainId: selectedDomainId ? selectedDomainId : null,
        scopes,
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
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/api-keys"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <CaretLeft size={13} />
          <span>Back to API Keys</span>
        </Link>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access and cannot generate API keys." />
      )}

      {/* Main Container */}
      {!createdKey ? (
        <div className="border border-zinc-800/80 rounded-lg p-6 bg-zinc-900/20">
          <div className="border-b border-zinc-800/80 pb-4 mb-5">
            <h1 className="text-xl md:text-2xl font-semibold text-zinc-100 tracking-tight">
              Create API Key
            </h1>
            <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
              Generate credentials for programmatic email dispatch via REST endpoints or SDKs.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                Key Name <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                disabled={isViewer}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Backend"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 disabled:opacity-60"
                autoFocus
                required
              />
            </div>

            {/* Permissions / Scope (Segmented Radio Cards) */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                Permissions
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  onClick={() => setPermissionScope("sending")}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    permissionScope === "sending"
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-xs font-medium block">Sending Access</span>
                  <span className="text-2xs text-zinc-500 block mt-0.5">
                    Permits email dispatches only.
                  </span>
                </div>

                <div
                  onClick={() => setPermissionScope("full")}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    permissionScope === "full"
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-xs font-medium block">Full Access</span>
                  <span className="text-2xs text-zinc-500 block mt-0.5">
                    Sending, reading inboxes, and domain inspection.
                  </span>
                </div>
              </div>
            </div>

            {/* Scope / Domain Restriction */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                Domain Restriction
              </label>
              <select
                disabled={isViewer || isLoadingDomains}
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 disabled:opacity-60 cursor-pointer"
              >
                <option value="">All registered domains</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    Restricted to: {d.domainName}
                  </option>
                ))}
              </select>
              <p className="text-2xs text-zinc-500 mt-1">
                Restricting to a domain enforces isolation across workloads.
              </p>
            </div>

            {/* Expiration Settings */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                Expiration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "never", label: "Never" },
                  { id: "30d", label: "30 days" },
                  { id: "90d", label: "90 days" },
                  { id: "365d", label: "1 year" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isViewer}
                    onClick={() => setExpirationOption(opt.id)}
                    className={`py-1.5 px-2 text-xs rounded-md border text-center transition-colors cursor-pointer disabled:opacity-60 ${
                      expirationOption === opt.id
                        ? "bg-zinc-800 border-zinc-700 text-zinc-100 font-medium"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2.5">
              <Link
                href="/api-keys"
                className="btn-cf-secondary text-xs"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || isViewer || !name.trim()}
                className="btn-cf-primary text-xs"
              >
                {isSubmitting ? (
                  <>
                    <ArrowsClockwise size={13} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create API Key</span>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* One-Time Secret Reveal State */
        <div className="border border-zinc-800/80 rounded-lg p-6 bg-zinc-900/20 space-y-4">
          <div className="border-b border-zinc-800/80 pb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              API Key Created
            </h2>
            <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
              Copy this token now. It is hashed with SHA-256 and will not be shown again.
            </p>
          </div>

          {/* Subtle Amber Warning Banner */}
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <WarningCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <span>This key will only be shown once. Please store it securely in your secret manager.</span>
          </div>

          {/* High-Contrast Mono Input Box with One-Click Copy */}
          <div>
            <label className="block text-2xs font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Plaintext API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdKey.apiKey}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs font-mono text-zinc-100 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn-cf-primary text-xs h-9 px-3 shrink-0 flex items-center gap-1.5"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy Key"}</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex justify-end">
            <Link
              href="/api-keys"
              className="btn-cf-secondary text-xs"
            >
              Done
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
