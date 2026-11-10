"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Key,
  Trash,
  ArrowsClockwise,
  Globe,
} from "@phosphor-icons/react";
import { ApiKeyItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
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
    let isMounted = true;
    api.apiKeys
      .list()
      .then((data) => {
        if (isMounted) setKeys(data || []);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load API keys";
          toast({
            title: "Load Failed",
            description: msg,
            type: "error",
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchKeys();
    setIsRefreshing(false);
    toast({
      title: "API Keys Synchronized",
      description: "Fetched active API tokens.",
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
        `Revoke and delete API key "${name}"? Any applications using this key will immediately be rejected.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await api.apiKeys.delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({
        title: "API Key Revoked",
        description: `Key "${name}" was revoked and deleted.`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete API key";
      toast({
        title: "Revoke Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setDeletingId(null);
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
      <div className="border-b border-zinc-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
            API Keys
          </h1>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Cryptographic authentication tokens for programmatic email dispatch and SDK integrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="btn-cf-secondary px-3"
            title="Refresh API keys"
          >
            <ArrowsClockwise
              size={15}
              className={isRefreshing ? "animate-spin text-zinc-400" : "text-zinc-400"}
            />
          </button>

          {!isViewer && (
            <Link
              href="/api-keys/add"
              className="btn-cf-primary"
            >
              <Plus size={15} weight="bold" />
              <span>Create API Key</span>
            </Link>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot create or revoke API keys." />
      )}

      {/* 2. Flat API Keys Table */}
      <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
        {isLoading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : keys.length === 0 ? (
          <div className="py-14 text-center">
            <div className="max-w-sm mx-auto px-4 flex flex-col items-center">
              <div className="w-8 h-8 rounded-md bg-zinc-900 text-zinc-500 flex items-center justify-center mb-2.5 border border-zinc-800">
                <Key size={16} />
              </div>
              <div className="text-sm font-medium text-zinc-200">
                No API keys created yet
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-64 leading-relaxed">
                Create an API key to dispatch transactional emails using our REST endpoints or SDKs.
              </p>
              {!isViewer && (
                <Link
                  href="/api-keys/add"
                  className="btn-cf-primary mt-4"
                >
                  <Plus size={14} weight="bold" />
                  <span>Create API Key</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 font-semibold">Name</th>
                  <th className="py-3.5 px-4 font-semibold">Token Prefix</th>
                  <th className="py-3.5 px-4 font-semibold">Permission / Scope</th>
                  <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Domain Restriction</th>
                  <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Last Used</th>
                  <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Created</th>
                  {!isViewer && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm md:text-[15px]">
                {keys.map((k) => {
                  const domainLabel = k.domain?.domainName || "All Domains";
                  const maskedToken = `${k.keyPrefix}••••••`;

                  return (
                    <tr
                      key={k.id}
                      className="h-13 hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 text-zinc-200 font-medium align-middle">
                        {k.name}
                      </td>

                      {/* Token Prefix */}
                      <td className="py-3.5 px-4 font-mono text-[13px] md:text-sm align-middle">
                        <span className="font-mono text-[13px] md:text-sm bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-200">
                          {maskedToken}
                        </span>
                      </td>

                      {/* Permission / Scope */}
                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-[13px] md:text-sm align-middle">
                        <span className="inline-block px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {Array.isArray(k.scopes) && k.scopes.length > 0
                            ? k.scopes.join(", ")
                            : "Sending Access"}
                        </span>
                      </td>

                      {/* Domain Restriction */}
                      <td className="py-3.5 px-4 text-zinc-300 hidden sm:table-cell font-mono text-[13px] md:text-sm align-middle">
                        <div className="flex items-center gap-1.5 truncate max-w-48">
                          <Globe size={14} className="text-zinc-500 shrink-0" />
                          <span className="truncate">{domainLabel}</span>
                        </div>
                      </td>

                      {/* Last Used */}
                      <td className="py-3.5 px-4 text-zinc-400 hidden md:table-cell font-mono text-[13px] md:text-sm align-middle">
                        {formatLastUsed(k.lastUsedAt)}
                      </td>

                      {/* Created */}
                      <td className="py-3.5 px-4 text-zinc-400 hidden lg:table-cell font-mono text-[13px] md:text-sm align-middle">
                        {formatCreatedAt(k.createdAt)}
                      </td>

                      {/* Actions */}
                      {!isViewer && (
                        <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(k.id, k.name)}
                            disabled={deletingId === k.id}
                            className="btn-cf-danger text-xs h-8 px-2.5"
                            title="Revoke key"
                          >
                            <Trash size={13} />
                            <span>Revoke</span>
                          </button>
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
