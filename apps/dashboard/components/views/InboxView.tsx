"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Tray,
  MagnifyingGlass,
  ArrowsClockwise,
  Plus,
  Trash,
  X,
  Globe,
} from "@phosphor-icons/react";
import { MailboxItem, InboundDomainItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

export function InboxView() {
  const router = useRouter();
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [mailboxes, setMailboxes] = useState<MailboxItem[]>([]);
  const [domains, setDomains] = useState<InboundDomainItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch mailboxes and domains on mount
  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      api.inbox.listMailboxes(),
      api.inbox.listDomains(),
    ])
      .then(([mailboxesRes, domainsRes]) => {
        if (!isMounted) return;
        if (mailboxesRes.status === "fulfilled") {
          setMailboxes(mailboxesRes.value);
        }
        if (domainsRes.status === "fulfilled") {
          setDomains(domainsRes.value);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to load inbox data:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [mailboxesRes, domainsRes] = await Promise.allSettled([
        api.inbox.listMailboxes(),
        api.inbox.listDomains(),
      ]);

      if (mailboxesRes.status === "fulfilled") {
        setMailboxes(mailboxesRes.value);
      }
      if (domainsRes.status === "fulfilled") {
        setDomains(domainsRes.value);
      }
      toast({
        title: "Mailboxes Refreshed",
        description: "Synchronized active mailboxes and unread counts.",
        type: "info",
      });
    } catch {
      // Keep existing state on error
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteMailbox = async (id: string, emailAddress: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to delete mailboxes.",
        type: "warning",
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete mailbox "${emailAddress}"? Incoming emails to this alias will no longer be accepted.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.inbox.deleteMailbox(id);
      setMailboxes((prev) => prev.filter((m) => m.id !== id));
      toast({
        title: "Mailbox Deleted",
        description: `Removed alias ${emailAddress}`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete mailbox";
      toast({
        title: "Delete Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMailboxes = useMemo(() => {
    if (!searchQuery.trim()) return mailboxes;
    const q = searchQuery.toLowerCase();
    return mailboxes.filter(
      (m) =>
        m.emailAddress.toLowerCase().includes(q) ||
        m.localPart.toLowerCase().includes(q) ||
        (m.displayName && m.displayName.toLowerCase().includes(q))
    );
  }, [mailboxes, searchQuery]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-kumo-strong leading-tight">
            Inbox
          </h1>
          <p className="text-sm text-kumo-subtle mt-0.5 font-normal leading-relaxed">
            Manage custom inbound mailboxes, aliases, and incoming email routing.
          </p>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-kumo-base hover:bg-kumo-elevated border border-kumo-line text-kumo-subtle hover:text-kumo-strong transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh mailboxes"
            aria-label="Refresh mailboxes"
          >
            <ArrowsClockwise
              size={16}
              className={isRefreshing ? "animate-spin text-cf-blue" : ""}
            />
          </button>

          {!isViewer && (
            <Link
              href="/inbox/add"
              className="btn-cf-primary flex items-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} weight="bold" />
              <span>Add mailbox</span>
            </Link>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot create or delete mailboxes." />
      )}

      {/* 2. Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative w-full sm:max-w-md">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by mailbox alias or address..."
            className="w-full h-9 pl-8 pr-7 text-sm bg-kumo-control hover:bg-kumo-elevated/50 border border-kumo-line rounded-lg text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue/80 focus:ring-1 focus:ring-cf-blue/30 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-strong cursor-pointer p-0.5 rounded transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="text-xs sm:text-sm text-kumo-subtle self-end sm:self-auto select-none">
          <span className="font-mono font-medium text-kumo-strong">{filteredMailboxes.length}</span>{" "}
          {filteredMailboxes.length === 1 ? "mailbox" : "mailboxes"} registered
          {domains.length > 0 && (
            <span className="text-kumo-muted"> across {domains.length} {domains.length === 1 ? "domain" : "domains"}</span>
          )}
        </div>
      </div>

      {/* 3. Mailboxes Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filteredMailboxes.length === 0 ? (
          /* Empty State */
          <div className="py-10 sm:py-12 px-4 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="w-9 h-9 rounded-xl bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue mb-2.5 shadow-2xs">
              <Tray size={18} weight="bold" />
            </div>
            <h3 className="text-sm font-medium text-kumo-strong">
              {searchQuery ? "No matching mailboxes found" : "No mailboxes created yet"}
            </h3>
            <p className="text-xs sm:text-sm text-kumo-subtle mt-1 mb-4 leading-relaxed font-normal">
              {searchQuery
                ? `No mailboxes matched "${searchQuery}".`
                : `Create custom mailbox aliases (e.g. support@${domains[0]?.domainName || "yourdomain.com"}) to receive emails directly into EmitMail.`}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-3 py-1.5 text-xs font-medium text-cf-blue hover:text-cf-blue-hover rounded-md hover:bg-cf-blue/10 transition-colors cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              !isViewer && (
                <Link
                  href="/inbox/add"
                  className="btn-cf-primary flex items-center gap-1.5 text-sm shadow-2xs"
                >
                  <Plus size={14} weight="bold" />
                  <span>Create your first mailbox</span>
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/40 text-kumo-subtle font-medium text-sm">
                  <th className="py-2.5 px-4 font-medium">Mailbox Address</th>
                  <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Domain</th>
                  <th className="py-2.5 px-4 font-medium">Unread Emails</th>
                  <th className="py-2.5 px-4 font-medium hidden md:table-cell">Total Messages</th>
                  <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Status</th>
                  {!isViewer && <th className="py-2.5 px-4 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline text-sm">
                {filteredMailboxes.map((mb) => {
                  const domainName = mb.domain?.domainName || mb.emailAddress.split("@")[1] || "domain";

                  return (
                    <tr
                      key={mb.id}
                      onClick={() => router.push(`/inbox/${mb.id}`)}
                      className="hover:bg-kumo-elevated/40 transition-colors cursor-pointer group"
                    >
                      {/* Mailbox Address & Display Name */}
                      <td className="py-3 px-4 max-w-65 lg:max-w-xs align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0 shadow-2xs group-hover:bg-cf-blue group-hover:text-white transition-colors duration-150">
                            <Tray size={14} weight="bold" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-sm font-medium block text-kumo-strong group-hover:text-cf-blue transition-colors truncate">
                              {mb.emailAddress}
                            </span>
                            {mb.displayName && (
                              <span className="text-xs text-kumo-subtle font-sans block truncate font-normal mt-0.5">
                                {mb.displayName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Domain */}
                      <td className="py-3 px-4 text-kumo-subtle hidden sm:table-cell font-mono text-xs align-middle">
                        <div className="flex items-center gap-1.5 truncate max-w-45">
                          <Globe size={13} className="text-kumo-muted shrink-0" />
                          <span className="truncate">{domainName}</span>
                        </div>
                      </td>

                      {/* Unread Count Badge */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        {mb.unreadCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-cf-blue text-white shadow-2xs">
                            {mb.unreadCount} unread
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-kumo-control border border-kumo-line text-kumo-subtle">
                            0 unread
                          </span>
                        )}
                      </td>

                      {/* Total Messages */}
                      <td className="py-3 px-4 text-kumo-default hidden md:table-cell font-mono text-xs align-middle">
                        {mb.totalMessages ?? 0}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 hidden sm:table-cell align-middle whitespace-nowrap">
                        {mb.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {!isViewer && (
                        <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMailbox(mb.id, mb.emailAddress, e)}
                            disabled={deletingId === mb.id}
                            className="p-1.5 rounded-md text-kumo-muted hover:text-kumo-danger hover:bg-kumo-danger-tint border border-transparent hover:border-kumo-danger/30 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete mailbox"
                            aria-label={`Delete mailbox ${mb.emailAddress}`}
                          >
                            <Trash size={14} />
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
