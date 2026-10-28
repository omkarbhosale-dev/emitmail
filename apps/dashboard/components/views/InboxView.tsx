"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Tray,
  MagnifyingGlass,
  ArrowsClockwise,
  Plus,
  Trash,
  CheckCircle,
  Warning,
  X,
  CaretRight,
  Globe,
} from "@phosphor-icons/react";
import { MailboxItem, InboundDomainItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

const STATIC_NOW = "2026-10-28T10:00:00.000Z";

const INITIAL_MAILBOXES: MailboxItem[] = [
  {
    id: "mbx_support",
    domainId: "dom_omkar",
    emailAddress: "support@omkarbhosale.dev",
    localPart: "support",
    displayName: "EmitMail Support",
    isCatchAll: false,
    isActive: true,
    totalMessages: 24,
    totalReceived: 24,
    unreadCount: 2,
    createdAt: STATIC_NOW,
    updatedAt: STATIC_NOW,
  },
  {
    id: "mbx_billing",
    domainId: "dom_omkar",
    emailAddress: "billing@omkarbhosale.dev",
    localPart: "billing",
    displayName: "EmitMail Billing",
    isCatchAll: false,
    isActive: true,
    totalMessages: 8,
    totalReceived: 8,
    unreadCount: 0,
    createdAt: STATIC_NOW,
    updatedAt: STATIC_NOW,
  },
];

export function InboxView() {
  const router = useRouter();
  const { toast } = useToast();

  const [mailboxes, setMailboxes] = useState<MailboxItem[]>(INITIAL_MAILBOXES);
  const [domains, setDomains] = useState<InboundDomainItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch mailboxes and domains
  const fetchData = useCallback(async () => {
    try {
      const [mailboxesRes, domainsRes] = await Promise.allSettled([
        api.inbox.listMailboxes(),
        api.inbox.listDomains(),
      ]);

      if (mailboxesRes.status === "fulfilled" && mailboxesRes.value.length > 0) {
        setMailboxes(mailboxesRes.value);
      }
      if (domainsRes.status === "fulfilled") {
        setDomains(domainsRes.value);
      }
    } catch {
      // Fallback to initial mock mailboxes in offline dev mode
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast({
      title: "Mailboxes Refreshed",
      description: "Synchronized active mailboxes and unread counts.",
      type: "info",
    });
  };

  const handleDeleteMailbox = async (id: string, emailAddress: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header (Clean header without badges or telemetry cards) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
            Inbox
          </h1>
          <p className="text-xs text-kumo-subtle mt-1">
            Manage custom inbound mailboxes, aliases, and incoming email routing.
          </p>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-cf-secondary flex items-center gap-1.5"
            title="Refresh mailboxes"
          >
            <ArrowsClockwise
              size={14}
              className={isRefreshing ? "animate-spin text-cf-blue" : ""}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/inbox/add"
            className="btn-cf-primary flex items-center gap-1.5"
          >
            <Plus size={14} weight="bold" />
            <span>Add mailbox</span>
          </Link>
        </div>
      </div>

      {/* 2. Search Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by mailbox alias or address..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-kumo-control border border-kumo-line rounded-lg text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-strong cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="text-xs text-kumo-subtle hidden sm:block">
          {filteredMailboxes.length} {filteredMailboxes.length === 1 ? "mailbox" : "mailboxes"} registered
        </div>
      </div>

      {/* 3. Mailboxes Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filteredMailboxes.length === 0 ? (
          /* Empty State */
          <div className="p-10 md:p-14 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-kumo-control border border-kumo-line flex items-center justify-center text-kumo-muted mb-3">
              <Tray size={24} weight="duotone" />
            </div>
            <h3 className="text-sm font-semibold text-kumo-strong mb-1">
              {searchQuery ? "No matching mailboxes found" : "No mailboxes created yet"}
            </h3>
            <p className="text-xs text-kumo-subtle mb-5 leading-relaxed">
              {searchQuery
                ? `No mailboxes matched "${searchQuery}".`
                : "Create custom mailbox aliases (e.g. support@yourdomain.com) to receive emails directly into EmitMail."}
            </p>
            <Link
              href="/inbox/add"
              className="btn-cf-primary flex items-center gap-1.5 text-xs"
            >
              <Plus size={14} weight="bold" />
              <span>Create your first mailbox</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium">
                  <th className="py-3 px-4">Mailbox Address</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Domain</th>
                  <th className="py-3 px-4">Unread Emails</th>
                  <th className="py-3 px-4 hidden md:table-cell">Total Messages</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline">
                {filteredMailboxes.map((mb) => {
                  const domainName = mb.domain?.domainName || mb.emailAddress.split("@")[1] || "domain";

                  return (
                    <tr
                      key={mb.id}
                      onClick={() => router.push(`/inbox/${mb.id}`)}
                      className="hover:bg-kumo-tint/60 transition-colors cursor-pointer group"
                    >
                      {/* Mailbox Address & Display Name */}
                      <td className="py-3.5 px-4 font-semibold text-kumo-strong">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cf-orange/10 border border-cf-orange/20 flex items-center justify-center text-cf-orange shrink-0">
                            <Tray size={14} weight="bold" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-xs block text-kumo-strong group-hover:text-cf-orange transition-colors truncate">
                              {mb.emailAddress}
                            </span>
                            {mb.displayName && (
                              <span className="text-[11px] text-kumo-subtle font-sans block truncate font-normal">
                                {mb.displayName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Domain */}
                      <td className="py-3.5 px-4 text-kumo-subtle hidden sm:table-cell font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Globe size={13} className="text-kumo-muted" />
                          <span>{domainName}</span>
                        </div>
                      </td>

                      {/* Unread Count Badge */}
                      <td className="py-3.5 px-4">
                        {mb.unreadCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cf-orange text-white shadow-2xs">
                            {mb.unreadCount} unread
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-kumo-control border border-kumo-line text-kumo-subtle">
                            0 unread
                          </span>
                        )}
                      </td>

                      {/* Total Messages */}
                      <td className="py-3.5 px-4 text-kumo-default hidden md:table-cell font-mono text-[11px]">
                        {mb.totalMessages ?? 0}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Active</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMailbox(mb.id, mb.emailAddress, e)}
                            disabled={deletingId === mb.id}
                            className="p-1.5 rounded-md text-kumo-muted hover:text-kumo-danger hover:bg-kumo-danger-tint transition-colors cursor-pointer"
                            title="Delete mailbox"
                          >
                            <Trash size={14} />
                          </button>

                          <div className="text-kumo-muted group-hover:text-kumo-strong group-hover:translate-x-0.5 transition-transform p-1">
                            <CaretRight size={14} />
                          </div>
                        </div>
                      </td>
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
