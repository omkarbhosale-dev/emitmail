"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PaperPlaneTilt,
  MagnifyingGlass,
  ArrowsClockwise,
  Copy,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { ProcessedEmailItem, ApiDomain } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useModals } from "@/components/layout/AppShell";
import { api } from "@/lib/api";

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
    } catch (err: any) {
      console.error("Failed to load processed emails:", err);
      toast({
        title: "Failed to Fetch Emails",
        description: err.message || "Could not synchronize processed emails feed.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, toast]);

  // Fetch domains for filter dropdown
  const fetchDomains = useCallback(async () => {
    try {
      const items = await api.domains.list();
      setDomains(items || []);
    } catch (err) {
      console.error("Failed to load domains:", err);
    }
  }, []);

  useEffect(() => {
    fetchEmails("all");
    fetchDomains();

    // Auto-refresh when new email is sent via modal
    const handleEmailsUpdated = () => {
      fetchEmails(statusFilter, true);
    };

    window.addEventListener("emails-updated", handleEmailsUpdated);
    return () => {
      window.removeEventListener("emails-updated", handleEmailsUpdated);
    };
  }, [fetchEmails, fetchDomains, statusFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEmails(statusFilter, true).then(() => {
      toast({
        title: "Email Feed Refreshed",
        description: "Synchronized latest BullMQ message acknowledgments.",
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

  // Filter in-memory for instant search and domain match
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

  // Dynamic Telemetry KPI Calculations
  const totalEmailsCount = totalCount || emails.length;
  const deliveredCount = emails.filter((e) => (e.status || "").toUpperCase() === "DELIVERED").length;
  const queuedCount = emails.filter((e) => {
    const st = (e.status || "").toUpperCase();
    return st === "QUEUED" || st === "SENDING";
  }).length;
  const deliveryRate = totalEmailsCount > 0
    ? `${Math.round((deliveredCount / totalEmailsCount) * 100)}%`
    : "100%";
  const bouncedCount = emails.filter((e) => {
    const st = (e.status || "").toUpperCase();
    return st === "BOUNCED" || st === "SUPPRESSED" || st === "FAILED";
  }).length;
  const bounceRate = totalEmailsCount > 0
    ? `${((bouncedCount / totalEmailsCount) * 100).toFixed(1)}%`
    : "0%";

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
            Processed Emails
          </h1>
          <p className="text-xs text-kumo-subtle mt-1">
            Real-time feed of transactional and broadcast messages processed through the BullMQ queue and SMTP engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Refresh feed"
            className="p-2 rounded-lg bg-kumo-base border border-kumo-line text-kumo-subtle hover:text-kumo-strong transition-colors cursor-pointer"
          >
            <ArrowsClockwise
              size={16}
              className={isRefreshing ? "animate-spin text-cf-blue" : ""}
            />
          </button>
          {/* Cloudflare Action Blue Button */}
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

      {/* 2. Telemetry KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Total Messages</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-kumo-strong">{totalEmailsCount}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Delivery Rate</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-kumo-strong">{deliveryRate}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Queued</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-kumo-strong">{queuedCount}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Bounce Rate</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-kumo-strong">{bounceRate}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-kumo-base border border-kumo-line rounded-lg overflow-x-auto">
          {[
            { key: "all", label: "All" },
            { key: "delivered", label: "Delivered" },
            { key: "queued", label: "Queued" },
            { key: "bounced", label: "Bounced" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer shrink-0 ${statusFilter.toLowerCase() === tab.key.toLowerCase()
                  ? "bg-kumo-elevated text-kumo-strong shadow-2xs font-semibold"
                  : "text-kumo-subtle hover:text-kumo-strong"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Domain Filter + Search */}
        <div className="flex items-center gap-2">
          <select
            value={domainFilter}
            onChange={(e) => handleDomainFilterChange(e.target.value)}
            className="bg-kumo-control border border-kumo-line rounded-lg px-2.5 py-1.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer"
          >
            <option value="all">All Domains</option>
            {domains.map((dom) => (
              <option key={dom.id} value={dom.domainName}>
                {dom.domainName}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-60">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search recipient, msg_id..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-kumo-control border border-kumo-line rounded-lg text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
            />
          </div>
        </div>
      </div>

      {/* 4. Processed Emails Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium">
                  <th className="py-2.5 px-4">Message ID</th>
                  <th className="py-2.5 px-4">Recipient & Subject</th>
                  <th className="py-2.5 px-4 hidden md:table-cell">Sender / Domain</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline">
                {paginatedEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-kumo-subtle">
                      No processed emails found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedEmails.map((item) => {
                    const recipientText = Array.isArray(item.to) && item.to.length > 0
                      ? item.to.join(", ")
                      : item.recipient || "No recipient";
                    const senderText = item.from || item.sender || "System";
                    const displayId = item.messageId || item.id;
                    const normalizedStatus = (item.status || "QUEUED").toUpperCase();

                    return (
                      <tr key={item.id} className="hover:bg-kumo-tint/60 transition-colors group">
                        {/* Message ID */}
                        <td className="py-2.5 px-4 font-mono text-[11px] text-kumo-strong">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-kumo-recessed border border-kumo-hairline max-w-[160px]">
                            <span className="truncate">{displayId}</span>
                            <button
                              onClick={() => copyToClipboard(displayId, "Message ID")}
                              title="Copy message ID"
                              className="text-kumo-muted hover:text-kumo-strong cursor-pointer shrink-0"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </td>

                        {/* Recipient & Subject */}
                        <td className="py-2.5 px-4 max-w-[320px]">
                          <div className="font-semibold text-kumo-strong truncate">
                            {recipientText}
                          </div>
                          <div className="text-[11px] text-kumo-subtle truncate mt-0.5">
                            {item.subject || "(No subject)"}
                          </div>
                        </td>

                        {/* Sender Domain */}
                        <td className="py-2.5 px-4 text-kumo-subtle hidden md:table-cell font-mono text-[11px] truncate max-w-[200px]">
                          <div>{senderText}</div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-4">
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
                        <td className="py-2.5 px-4 text-kumo-subtle text-right font-mono text-[11px]">
                          <div>{formatRelativeTime(item.createdAt)}</div>
                          <div className="text-[10px] text-kumo-muted">
                            {item.deliveryAttempts ? `${item.deliveryAttempts} attempt(s)` : "1 attempt"}
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
              <div className="px-4 py-2.5 border-t border-kumo-hairline bg-kumo-recessed/40 flex items-center justify-between text-xs text-kumo-subtle select-none">
                <div>
                  Showing{" "}
                  <span className="font-medium text-kumo-strong font-mono">
                    {startIndex + 1}
                  </span>
                  –
                  <span className="font-medium text-kumo-strong font-mono">
                    {Math.min(startIndex + PAGE_SIZE, filteredEmails.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-kumo-strong font-mono">
                    {filteredEmails.length}
                  </span>{" "}
                  emails
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-kumo-muted">
                    Page <span className="font-mono text-kumo-strong">{safeCurrentPage}</span> of{" "}
                    <span className="font-mono text-kumo-strong">{totalPages}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="px-2 py-1 text-xs rounded-md border border-kumo-line bg-kumo-base hover:bg-kumo-elevated text-kumo-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                      title="Previous page"
                    >
                      <CaretLeft size={12} weight="bold" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="px-2 py-1 text-xs rounded-md border border-kumo-line bg-kumo-base hover:bg-kumo-elevated text-kumo-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                      title="Next page"
                    >
                      <span>Next</span>
                      <CaretRight size={12} weight="bold" />
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