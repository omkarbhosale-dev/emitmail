"use client";

import React, { useState } from "react";
import {
  Plus,
  Key,
  Copy,
  Check,
  ShieldCheck,
  X,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react";
import { ApiKeyItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";

const INITIAL_KEYS: ApiKeyItem[] = [
  {
    id: "key-1",
    name: "Production Next.js App",
    prefix: "em_live_9f8a7c2b...",
    scope: "Sending Only",
    domain: "omkarbhosale.dev",
    lastUsed: "4 minutes ago",
    createdAt: "Oct 21, 2026",
    status: "active",
  },
  {
    id: "key-2",
    name: "BullMQ Worker Service",
    prefix: "em_live_44e1a0df...",
    scope: "Full Access",
    domain: "All Domains",
    lastUsed: "Just now",
    createdAt: "Oct 22, 2026",
    status: "active",
  },
  {
    id: "key-3",
    name: "Staging Test Script",
    prefix: "em_test_77b31c9a...",
    scope: "Sending Only",
    domain: "preview.mailflow.io",
    lastUsed: "3 days ago",
    createdAt: "Oct 24, 2026",
    status: "revoked",
  },
];

export function ApiKeysView() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>(INITIAL_KEYS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"form" | "reveal">("form");
  const [keyName, setKeyName] = useState("");
  const [keyScope, setKeyScope] = useState<"Sending Only" | "Full Access">("Sending Only");
  const [keyDomain, setKeyDomain] = useState("All Domains");
  const [generatedSecret, setGeneratedSecret] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    const randomSuffix = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const fullSecret = `em_live_${randomSuffix}`;
    const prefix = `${fullSecret.substring(0, 16)}...`;

    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: keyName.trim(),
      prefix,
      scope: keyScope,
      domain: keyDomain,
      lastUsed: "Never",
      createdAt: "Just now",
      status: "active",
    };

    setKeys((prev) => [newKey, ...prev]);
    setGeneratedSecret(fullSecret);
    setModalStep("reveal");
    toast({
      title: "API Key Created",
      description: `Key "${keyName}" generated. Copy your token now.`,
      type: "success",
    });
  };

  const handleRevokeKey = (id: string, name: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k))
    );
    toast({
      title: "API Key Revoked",
      description: `Authentication key "${name}" has been disabled.`,
      type: "warning",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    toast({
      title: "Copied to Clipboard",
      description: "API Key copied securely.",
      type: "success",
    });
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalStep("form");
    setKeyName("");
    setGeneratedSecret("");
    setCopiedToken(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
            API Keys
          </h1>
          <p className="text-xs text-kumo-subtle mt-1">
            Manage authentication tokens for dispatching emails via the EmitMail REST API and SMTP.
          </p>
        </div>
        {/* Cloudflare Action Blue Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-cf-primary"
        >
          <Plus size={15} weight="bold" />
          <span>Create API Key</span>
        </button>
      </div>

      {/* 2. Security Callout Banner */}
      <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cf-blue/10 text-cf-blue shrink-0">
          <ShieldCheck size={20} weight="fill" />
        </div>
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-kumo-strong block">
            End-to-End Cryptographic Authentication
          </span>
          <span className="text-kumo-subtle">
            EmitMail API keys authenticate requests via the <code className="font-mono text-cf-blue font-semibold">Authorization: Bearer em_live_...</code> header and SMTP LOGIN protocol. Restrict keys by domain to isolate services.
          </span>
        </div>
      </div>

      {/* 3. API Keys Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={3} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Token Prefix</th>
                  <th className="py-3 px-4">Permission Scope</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Domain</th>
                  <th className="py-3 px-4 hidden md:table-cell">Last Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-kumo-tint/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-kumo-strong">
                      <div className="flex items-center gap-2">
                        <Key size={15} className="text-cf-blue shrink-0" />
                        <span>{k.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-kumo-recessed border border-kumo-hairline font-mono text-[11px] text-kumo-strong">
                        <span>{k.prefix}</span>
                        <button
                          onClick={() => copyToClipboard(k.prefix)}
                          title="Copy token prefix"
                          className="text-kumo-muted hover:text-kumo-strong ml-0.5"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-kumo-default">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-kumo-elevated border border-kumo-line">
                        {k.scope}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-kumo-subtle hidden sm:table-cell">
                      {k.domain}
                    </td>

                    <td className="py-3.5 px-4 text-kumo-subtle hidden md:table-cell font-mono text-[11px]">
                      {k.lastUsed}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge variant={k.status === "active" ? "success" : "neutral"}>
                        {k.status === "active" ? "Active" : "Revoked"}
                      </StatusBadge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {k.status === "active" ? (
                        <button
                          onClick={() => handleRevokeKey(k.id, k.name)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-line hover:border-kumo-danger/40 transition-colors"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-[11px] text-kumo-muted">Disabled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Create API Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-md bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {modalStep === "form" ? (
              <form onSubmit={handleCreateKey}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                      <Key size={18} weight="bold" />
                    </div>
                    <h3 className="text-sm font-semibold text-kumo-strong">
                      Create API Key
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                      Key Name
                    </label>
                    <input
                      type="text"
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Production Next.js App"
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                      Permission Scope
                    </label>
                    <select
                      value={keyScope}
                      onChange={(e) => setKeyScope(e.target.value as "Sending Only" | "Full Access")}
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer"
                    >
                      <option value="Sending Only">Sending Only (Recommended for App Dispatch)</option>
                      <option value="Full Access">Full Access (Manage Domains, Keys, Queues)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                      Domain Restriction
                    </label>
                    <select
                      value={keyDomain}
                      onChange={(e) => setKeyDomain(e.target.value)}
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer"
                    >
                      <option value="All Domains">All Verified Domains</option>
                      <option value="omkarbhosale.dev">omkarbhosale.dev</option>
                      <option value="emitmail.dev">emitmail.dev</option>
                    </select>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-cf-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-cf-primary"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-cf-success/10 border border-cf-success/20 flex items-center justify-center text-cf-success mx-auto">
                  <CheckCircle size={26} weight="fill" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    API Key Generated
                  </h3>
                  <p className="text-xs text-kumo-subtle mt-1">
                    Copy and store this token in your environment variables.
                  </p>
                </div>

                {/* Key Reveal Box */}
                <div className="p-3 bg-kumo-recessed border border-kumo-hairline rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-kumo-strong break-all bg-kumo-base p-2.5 rounded border border-kumo-line select-all">
                    <span>{generatedSecret}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedSecret)}
                    className="btn-cf-primary w-full"
                  >
                    {copiedToken ? (
                      <>
                        <Check size={14} />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Secret Token</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Warning Alert */}
                <div className="p-3 rounded-lg bg-kumo-danger-tint border border-kumo-danger/30 flex items-start gap-2 text-xs text-kumo-danger">
                  <Warning size={16} className="shrink-0 mt-0.5" />
                  <span>
                    You will not be able to view this token again after closing this dialog.
                  </span>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2 rounded-lg bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-xs font-semibold text-kumo-strong transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
