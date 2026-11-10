"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PaperPlaneTilt,
  MagnifyingGlass,
  ArrowsClockwise,
  Copy,
  CaretLeft,
  CaretRight,
  CaretDown,
  EnvelopeSimple,
  X,
} from "@phosphor-icons/react";
import { ProcessedEmailItem, ApiDomain } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useModals } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 0) return "Just now";
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

interface EmailsViewProps {
  onTriggerSendEmail?: () => void;
}

export function EmailsView({ onTriggerSendEmail }: EmailsViewProps = {}) {
  const { toast } = useToast();
  const modals = useModals();

  const handleSendEmail = () => {
    if (onTriggerSendEmail) {
      onTriggerSendEmail();
    } else {
      modals.openSendTestEmail();
    }
  };

  const [emails, setEmails] = useState<ProcessedEmailItem[]>([]);
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch emails from backend
  const fetchEmails = useCallback(async (status: string = statusFilter, silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.emails.list({
        status: status !== "all" ? status : undefined,
        limit: 100,
      });
      setEmails(res.emails || []);
      setTotalCount(res.total || (res.emails ? res.emails.length : 0));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Could not fetch emails.";
      console.error("Failed to load processed emails:", err);
      toast({
        title: "Failed to Fetch Emails",
        description: errorMsg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    let isMounted = true;

    api.emails
      .list({
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 100,
      })
      .then((res) => {
        if (!isMounted) return;
        setEmails(res.emails || []);
        setTotalCount(res.total || (res.emails ? res.emails.length : 0));
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to load processed emails:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    api.domains
      .list()
      .then((items) => {
        if (!isMounted) return;
        setDomains(items || []);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to load domains:", err);
      });

    const handleEmailsUpdated = () => {
      if (isMounted) {
        void fetchEmails(statusFilter, true);
      }
    };

    window.addEventListener("emails-updated", handleEmailsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("emails-updated", handleEmailsUpdated);
    };
  }, [fetchEmails, statusFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEmails(statusFilter, true).then(() => {
      toast({
        title: "Email Feed Refreshed",
        description: "Synchronized latest message dispatches.",
        type: "info",
      });
    });
  };

  const handleFilterChange = (tab: string) => {
    setStatusFilter(tab);
    setCurrentPage(1);
    fetchEmails(tab);
  };

  const handleDomainFilterChange = (domain: string) => {
    setDomainFilter(domain);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: label,
      type: "success",
    });
  };

  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      const itemDomain = item.domain?.domainName || (item.from ? item.from.split("@")[1] : "") || "";
      const matchesDomain = domainFilter === "all" ? true : itemDomain === domainFilter;

      const recipientStr = Array.isArray(item.to) ? item.to.join(" ") : (item.recipient || "");
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        recipientStr.toLowerCase().includes(q) ||
        (item.subject && item.subject.toLowerCase().includes(q)) ||
        (item.from && item.from.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.messageId && item.messageId.toLowerCase().includes(q));

      return matchesDomain && matchesSearch;
    });
  }, [emails, domainFilter, searchQuery]);

  // Telemetry Metrics
  const totalEmailsCount = totalCount || emails.length;
  const deliveredCount = emails.filter((e) => (e.status || "").toUpperCase() === "DELIVERED").length;
  const queuedCount = emails.filter((e) => {
    const st = (e.status || "").toUpperCase();
    return st === "QUEUED" || st === "SENDING";
  }).length;
  const deliveryRate = totalEmailsCount > 0
    ? `${Math.round((deliveredCount / totalEmailsCount) * 100)}%`
    : "—";
  const bouncedCount = emails.filter((e) => {
    const st = (e.status || "").toUpperCase();
    return st === "BOUNCED" || st === "SUPPRESSED" || st === "FAILED";
  }).length;
  const bounceRate = totalEmailsCount > 0
    ? `${((bouncedCount / totalEmailsCount) * 100).toFixed(1)}%`
    : "—";

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Bar */}
      <div className="border-b border-zinc-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
            Processed Emails
          </h1>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Outbound delivery feed and message dispatch telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh feed"
            aria-label="Refresh feed"
            className="btn-cf-secondary px-3"
          >
            <ArrowsClockwise
              size={15}
              className={isRefreshing ? "animate-spin text-zinc-400" : "text-zinc-400"}
            />
          </button>
          <button
            type="button"
            onClick={handleSendEmail}
            className="btn-cf-primary"
          >
            <PaperPlaneTilt size={15} weight="bold" />
            <span>Send Email</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Horizontal Metric Strip */}
      <div className="border border-zinc-800/80 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 bg-zinc-900/20 grid grid-cols-2 md:grid-cols-4 overflow-hidden">
        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Total Messages</span>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {totalEmailsCount.toLocaleString()}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">Recorded dispatches</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Delivery Rate</span>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {deliveryRate}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {totalEmailsCount > 0 ? `${deliveredCount} delivered` : "No data yet"}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Queued</span>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {queuedCount.toLocaleString()}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {queuedCount > 0 ? "In transit" : "Queue empty"}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Bounce Rate</span>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {bounceRate}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {totalEmailsCount > 0 ? `${bouncedCount} rejected` : "No bounces"}
          </span>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Segmented Control */}
        <div className="inline-flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-md overflow-x-auto shrink-0">
          {[
            { key: "all", label: "All" },
            { key: "delivered", label: "Delivered" },
            { key: "queued", label: "Queued" },
            { key: "bounced", label: "Bounced" },
          ].map((tab) => {
            const isActive = statusFilter.toLowerCase() === tab.key.toLowerCase();
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  "px-3 py-1 rounded text-xs transition-colors cursor-pointer shrink-0 select-none",
                  isActive
                    ? "bg-zinc-800 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Domain Filter + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative shrink-0">
            <select
              value={domainFilter}
              onChange={(e) => handleDomainFilterChange(e.target.value)}
              aria-label="Filter by domain"
              className="w-full sm:w-auto h-8 bg-zinc-900 border border-zinc-800 rounded-md pl-3 pr-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none"
            >
              <option value="all">All Domains</option>
              {domains.map((dom) => (
                <option key={dom.id} value={dom.domainName}>
                  {dom.domainName}
                </option>
              ))}
            </select>
            <CaretDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
          </div>

          <div className="relative w-full sm:w-60">
            <MagnifyingGlass
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search recipient, ID..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer p-0.5 rounded"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Processed Emails Table */}
      <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
        {isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4">Message ID</th>
                  <th className="py-3.5 px-4">Recipient & Subject</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Sender / Domain</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm md:text-[15px]">
                {paginatedEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <div className="max-w-sm mx-auto px-4 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-md bg-zinc-900 text-zinc-500 flex items-center justify-center mb-2.5 border border-zinc-800">
                          <EnvelopeSimple size={16} />
                        </div>
                        <div className="text-sm font-medium text-zinc-200">
                          {emails.length === 0 ? "No processed emails yet" : "No matching emails found"}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 max-w-64 leading-relaxed">
                          {emails.length === 0
                            ? "Emails dispatched through your SMTP server or API will appear in this feed."
                            : "No processed emails match the selected filters or search query."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmails.map((item) => {
                    const recipientText =
                      Array.isArray(item.to) && item.to.length > 0
                        ? item.to.join(", ")
                        : item.recipient || "No recipient";
                    const senderText = item.from || item.sender || "System";
                    const displayId = item.messageId || item.id;
                    const normalizedStatus = (item.status || "QUEUED").toUpperCase();

                    return (
                      <tr
                        key={item.id}
                        className="h-13 hover:bg-zinc-800/30 transition-colors group"
                      >
                        {/* Message ID */}
                        <td className="py-3.5 px-4 font-mono text-[13px] md:text-sm text-zinc-300 align-middle">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 max-w-44">
                            <span className="truncate text-zinc-200 font-mono text-[13px] md:text-sm">{displayId}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(displayId, "Message ID")}
                              title="Copy message ID"
                              aria-label={`Copy message ID ${displayId}`}
                              className="text-zinc-500 hover:text-zinc-200 cursor-pointer shrink-0"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </td>

                        {/* Recipient & Subject */}
                        <td className="py-3.5 px-4 max-w-80 align-middle">
                          <div className="font-medium text-zinc-200 truncate text-sm md:text-[15px]">
                            {recipientText}
                          </div>
                          <div className="text-xs text-zinc-400 truncate mt-0.5">
                            {item.subject || "(No subject)"}
                          </div>
                        </td>

                        {/* Sender Domain */}
                        <td className="py-3.5 px-4 text-zinc-300 hidden md:table-cell font-mono text-[13px] md:text-sm truncate max-w-52 align-middle">
                          <span className="truncate block">{senderText}</span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          {normalizedStatus === "DELIVERED" ? (
                            <StatusBadge variant="success">Delivered</StatusBadge>
                          ) : normalizedStatus === "QUEUED" ? (
                            <StatusBadge variant="info" pulseDot>Queued</StatusBadge>
                          ) : normalizedStatus === "SENDING" ? (
                            <StatusBadge variant="info" pulseDot>Sending</StatusBadge>
                          ) : normalizedStatus === "SUPPRESSED" ? (
                            <StatusBadge variant="warning">Suppressed</StatusBadge>
                          ) : (
                            <StatusBadge variant="danger">Bounced</StatusBadge>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          <div className="font-mono text-[13px] md:text-sm text-zinc-400">
                            {formatRelativeTime(item.createdAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls Footer */}
            {filteredEmails.length > 0 && (
              <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400 select-none">
                <div>
                  Showing{" "}
                  <span className="font-medium text-zinc-200 font-mono">
                    {startIndex + 1}
                  </span>
                  –
                  <span className="font-medium text-zinc-200 font-mono">
                    {Math.min(startIndex + PAGE_SIZE, filteredEmails.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-zinc-200 font-mono">
                    {filteredEmails.length}
                  </span>{" "}
                  emails
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-2xs text-zinc-500">
                    Page <span className="font-mono text-zinc-300">{safeCurrentPage}</span> of{" "}
                    <span className="font-mono text-zinc-300">{totalPages}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="btn-cf-secondary text-2xs h-7 px-2"
                      title="Previous page"
                    >
                      <CaretLeft size={10} weight="bold" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="btn-cf-secondary text-2xs h-7 px-2"
                      title="Next page"
                    >
                      <span>Next</span>
                      <CaretRight size={10} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
