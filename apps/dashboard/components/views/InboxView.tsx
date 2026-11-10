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
  const [domainFilter, setDomainFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      api.inbox.listMailboxes(),
      api.inbox.listDomains(),
    ])
      .then(([mailboxesRes, domainsRes]) => {
        if (!isMounted) return;
        if (mailboxesRes.status === "fulfilled") {
          setMailboxes(mailboxesRes.value || []);
        }
        if (domainsRes.status === "fulfilled") {
          setDomains(domainsRes.value || []);
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
        setMailboxes(mailboxesRes.value || []);
      }
      if (domainsRes.status === "fulfilled") {
        setDomains(domainsRes.value || []);
      }
      toast({
        title: "Inboxes Synchronized",
        description: "Fetched active inbound routes and unread counts.",
        type: "info",
      });
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
    if (!window.confirm(`Delete mailbox "${emailAddress}"? Inbound messages to this route will no longer be accepted.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.inbox.deleteMailbox(id);
      setMailboxes((prev) => prev.filter((m) => m.id !== id));
      toast({
        title: "Mailbox Deleted",
        description: `Removed route ${emailAddress}`,
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
    return mailboxes.filter((m) => {
      const mDomain = m.domain?.domainName || m.emailAddress.split("@")[1] || "";
      const matchesDomain = domainFilter === "all" ? true : mDomain === domainFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        m.emailAddress.toLowerCase().includes(q) ||
        m.localPart.toLowerCase().includes(q) ||
        (m.displayName && m.displayName.toLowerCase().includes(q));

      return matchesDomain && matchesQuery;
    });
  }, [mailboxes, domainFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Standard Header */}
      <div className="border-b border-zinc-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
            Inbox
          </h1>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Manage custom inbound mailboxes, aliases, and incoming email routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-cf-secondary px-3"
            title="Refresh mailboxes"
            aria-label="Refresh mailboxes"
          >
            <ArrowsClockwise
              size={15}
              className={isRefreshing ? "animate-spin text-zinc-400" : "text-zinc-400"}
            />
          </button>

          {!isViewer && (
            <Link
              href="/inbox/add"
              className="btn-cf-primary"
            >
              <Plus size={15} weight="bold" />
              <span>Create Inbox / Route</span>
            </Link>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot create or delete mailboxes." />
      )}

      {/* 2. Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Domain Filter */}
          <div className="relative shrink-0">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full sm:w-auto h-10 bg-zinc-900 border border-zinc-800 rounded-md pl-3 pr-8 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none"
            >
              <option value="all">All Domains</option>
              {domains.map((dom) => (
                <option key={dom.id} value={dom.domainName}>
                  {dom.domainName}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route or address..."
              className="w-full h-10 pl-9 pr-8 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer p-0.5 rounded"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-zinc-500 font-mono self-end sm:self-auto select-none">
          {filteredMailboxes.length} {filteredMailboxes.length === 1 ? "route" : "routes"} registered
        </div>
      </div>

      {/* 3. Flat Mailboxes Table */}
      <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filteredMailboxes.length === 0 ? (
          <div className="py-14 text-center">
            <div className="max-w-sm mx-auto px-4 flex flex-col items-center">
              <div className="w-8 h-8 rounded-md bg-zinc-900 text-zinc-500 flex items-center justify-center mb-2.5 border border-zinc-800">
                <Tray size={16} />
              </div>
              <div className="text-sm font-medium text-zinc-200">
                {searchQuery || domainFilter !== "all" ? "No matching inboxes found" : "No inboxes configured yet"}
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-64 leading-relaxed">
                {searchQuery || domainFilter !== "all"
                  ? "Try resetting your search query or domain filter."
                  : "Create custom mailbox aliases to receive emails directly into EmitMail."}
              </p>
              {!searchQuery && domainFilter === "all" && !isViewer && (
                <Link
                  href="/inbox/add"
                  className="btn-cf-primary mt-4"
                >
                  <Plus size={14} weight="bold" />
                  <span>Create Inbox</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 font-semibold">Route / Address</th>
                  <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Target Domain</th>
                  <th className="py-3.5 px-4 font-semibold">Unread</th>
                  <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Messages</th>
                  <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Status</th>
                  {!isViewer && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm md:text-[15px]">
                {filteredMailboxes.map((mb) => {
                  const domainName = mb.domain?.domainName || mb.emailAddress.split("@")[1] || "domain";

                  return (
                    <tr
                      key={mb.id}
                      onClick={() => router.push(`/inbox/${mb.id}`)}
                      className="h-13 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                    >
                      {/* Mailbox Address & Display Name */}
                      <td className="py-3.5 px-4 max-w-72 align-middle">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              mb.unreadCount > 0 ? "bg-emerald-400" : "bg-transparent"
                            }`}
                          />
                          <span className="font-mono text-sm text-zinc-200 group-hover:text-white transition-colors truncate">
                            {mb.emailAddress}
                          </span>
                          {mb.displayName && (
                            <span className="text-xs text-zinc-500 truncate hidden lg:inline">
                              ({mb.displayName})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Domain */}
                      <td className="py-3.5 px-4 text-zinc-300 hidden sm:table-cell font-mono text-[13px] md:text-sm align-middle">
                        <div className="flex items-center gap-1.5 truncate max-w-48">
                          <Globe size={14} className="text-zinc-500 shrink-0" />
                          <span className="truncate">{domainName}</span>
                        </div>
                      </td>

                      {/* Unread Count Badge */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {mb.unreadCount > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            {mb.unreadCount} unread
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500 font-mono">
                            0 unread
                          </span>
                        )}
                      </td>

                      {/* Total Messages */}
                      <td className="py-3.5 px-4 text-zinc-300 hidden md:table-cell font-mono text-[13px] md:text-sm align-middle">
                        {mb.totalMessages ?? 0}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 hidden sm:table-cell align-middle whitespace-nowrap">
                        {mb.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {!isViewer && (
                        <td className="py-2 px-4 text-right align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMailbox(mb.id, mb.emailAddress, e)}
                            disabled={deletingId === mb.id}
                            className="btn-cf-danger text-2xs h-7 px-2"
                            title="Delete mailbox"
                            aria-label={`Delete mailbox ${mb.emailAddress}`}
                          >
                            <Trash size={12} />
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
