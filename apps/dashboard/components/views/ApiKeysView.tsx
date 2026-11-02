"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Key,
  ShieldCheck,
  Trash,
  ArrowsClockwise,
  Globe,
  Pause,
  Play,
} from "@phosphor-icons/react";
import { ApiKeyItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

export function ApiKeysView() {
  const { toast } = useToast();
  const { isViewer } = useAuth();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.apiKeys.list();
      setKeys(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load API keys";
      toast({
        title: "Load Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchKeys();
    setIsRefreshing(false);
    toast({
      title: "API Keys Synchronized",
      description: "Fetched active API tokens from database.",
      type: "info",
    });
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to delete API keys.",
        type: "warning",
      });
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to permanently delete API key "${name}"? Any applications or services authenticating with this key will immediately fail.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await api.apiKeys.delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({
        title: "API Key Deleted",
        description: `Key "${name}" was permanently revoked and deleted.`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete API key";
      toast({
        title: "Delete Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleKey = async (id: string) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to toggle API keys.",
        type: "warning",
      });
      return;
    }
    try {
      const updated = await api.apiKeys.toggle(id);
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, isActive: updated.isActive } : k))
      );
      toast({
        title: updated.isActive ? "API Key Activated" : "API Key Paused",
        description: `Token is now ${updated.isActive ? "active" : "paused"}.`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle API key";
      toast({
        title: "Toggle Failed",
        description: msg,
        type: "error",
      });
    }
  };

  const formatLastUsed = (dateStr?: string | null): string => {
    if (!dateStr) return "Never";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Never";
    }
  };

  const formatCreatedAt = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
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
            Manage cryptographic authentication tokens for programmatic email dispatch and SDK integrations.
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="btn-cf-secondary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh API keys"
          >
            <ArrowsClockwise
              size={13}
              className={isRefreshing ? "animate-spin" : ""}
            />
            <span>Refresh</span>
          </button>

          {/* Create API Key Link Button */}
          {!isViewer && (
            <Link
              href="/api-keys/add"
              className="btn-cf-primary flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Create API key</span>
            </Link>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot create, activate, pause, or delete API keys." />
      )}

      {/* 2. Security Banner */}
      <div className="p-4 rounded-xl bg-kumo-base border border-kumo-hairline flex items-start gap-3 shadow-2xs">
        <div className="p-2 rounded-lg bg-cf-blue/10 text-cf-blue shrink-0">
          <ShieldCheck size={20} weight="fill" />
        </div>
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-kumo-strong block">
            End-to-End Cryptographic Authentication
          </span>
          <span className="text-kumo-subtle">
            EmitMail API keys authenticate requests via the{" "}
            <code className="font-mono text-cf-blue font-semibold">
              Authorization: Bearer em_live_...
            </code>{" "}
            header and Resend-compatible SDK endpoints. Restrict keys by domain to enforce tenancy boundaries.
          </span>
        </div>
      </div>

      {/* 3. API Keys Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : keys.length === 0 ? (
          /* Empty State */
          <div className="p-10 md:p-14 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-kumo-control border border-kumo-line flex items-center justify-center text-kumo-muted mb-3">
              <Key size={24} weight="duotone" />
            </div>
            <h3 className="text-sm font-semibold text-kumo-strong mb-1">
              No API keys created yet
            </h3>
            <p className="text-xs text-kumo-subtle mb-5 leading-relaxed">
              Create an API key to dispatch transactional emails using our REST endpoints or official Resend SDKs.
            </p>
            {!isViewer && (
              <Link
                href="/api-keys/add"
                className="btn-cf-primary flex items-center gap-1.5 text-xs font-semibold"
              >
                <Plus size={14} weight="bold" />
                <span>Create your first API key</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Token Prefix</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Domain</th>
                  <th className="py-3 px-4 hidden md:table-cell">Last Used</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Created</th>
                  <th className="py-3 px-4">Status</th>
                  {!isViewer && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline">
                {keys.map((k) => {
                  const domainLabel = k.domain?.domainName || "All Domains";
                  const maskedToken = `${k.keyPrefix}xxxxxx`;

                  return (
                    <tr
                      key={k.id}
                      className="hover:bg-kumo-tint/60 transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-kumo-strong">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
                            <Key size={14} weight="bold" />
                          </div>
                          <span className="truncate max-w-[200px]">{k.name}</span>
                        </div>
                      </td>

                      {/* Token Prefix with masked value (no copy button) */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded bg-kumo-recessed border border-kumo-hairline font-mono text-[11px] text-kumo-strong select-all">
                          {maskedToken}
                        </span>
                      </td>

                      {/* Domain */}
                      <td className="py-3.5 px-4 text-kumo-subtle hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Globe size={13} className="text-kumo-muted" />
                          <span>{domainLabel}</span>
                        </div>
                      </td>

                      {/* Last Used */}
                      <td className="py-3.5 px-4 text-kumo-subtle hidden md:table-cell font-mono text-[11px]">
                        {formatLastUsed(k.lastUsedAt)}
                      </td>

                      {/* Created */}
                      <td className="py-3.5 px-4 text-kumo-subtle hidden lg:table-cell text-[11px]">
                        {formatCreatedAt(k.createdAt)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge variant={k.isActive ? "success" : "neutral"}>
                          {k.isActive ? "Active" : "Paused"}
                        </StatusBadge>
                      </td>

                      {/* Actions */}
                      {!isViewer && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Toggle Active / Pause */}
                            <button
                              type="button"
                              onClick={() => handleToggleKey(k.id)}
                              className="p-1.5 rounded-md text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-tint border border-transparent hover:border-kumo-line transition-colors cursor-pointer"
                              title={k.isActive ? "Pause key" : "Activate key"}
                            >
                              {k.isActive ? <Pause size={13} /> : <Play size={13} />}
                            </button>

                            {/* Delete Key Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteKey(k.id, k.name)}
                              disabled={deletingId === k.id}
                              className="p-1.5 rounded-md text-kumo-danger hover:bg-kumo-danger-tint border border-transparent hover:border-kumo-danger/30 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete API key"
                            >
                              {deletingId === k.id ? (
                                <ArrowsClockwise size={13} className="animate-spin" />
                              ) : (
                                <Trash size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
