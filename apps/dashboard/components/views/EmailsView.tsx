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
  DotsThree,
  EnvelopeSimple,
  Funnel,
  X,
} from "@phosphor-icons/react";
import { ProcessedEmailItem, ApiDomain } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
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
      const errorMsg = err instanceof Error ? err.message : "Could not synchronize processed emails feed.";
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

    // Auto-refresh when new email is sent via modal
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-kumo-strong leading-tight">
            Processed Emails
          </h1>
          <p className="text-sm text-kumo-subtle mt-0.5 font-normal leading-relaxed">
            Real-time feed of transactional and broadcast messages processed through the BullMQ queue and SMTP engine.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh feed"
            aria-label="Refresh feed"
            className="p-2 rounded-lg bg-kumo-base hover:bg-kumo-elevated border border-kumo-line text-kumo-subtle hover:text-kumo-strong transition-colors cursor-pointer shadow-2xs"
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
            className="btn-cf-primary shadow-2xs"
          >
            <PaperPlaneTilt size={15} weight="bold" />
            <span>Send Email</span>
          </button>
        </div>
      </div>

      {/* 2. Telemetry KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Messages */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-kumo-subtle">
            <span className="text-sm font-medium text-kumo-subtle">Total Messages</span>
            <DotsThree size={16} className="text-kumo-muted" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-kumo-strong font-mono leading-none">
                {totalEmailsCount.toLocaleString()}
              </span>
              {totalEmailsCount > 0 ? (
                <span className="text-xs font-medium text-cf-success flex items-center gap-0.5">
                  ↗ Active
                </span>
              ) : (
                <span className="text-xs font-normal text-kumo-muted flex items-center">
                  No volume
                </span>
              )}
            </div>
            <span className="text-xs text-kumo-subtle block mt-1 font-normal">
              {totalEmailsCount > 0
                ? `${deliveredCount.toLocaleString()} delivered`
                : "All recorded dispatches"}
            </span>
          </div>
        </div>

        {/* Card 2: Delivery Rate (Presentation rule: display "—" and "No data yet" when totalEmailsCount is 0) */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-kumo-subtle">
            <span className="text-sm font-medium text-kumo-subtle">Delivery Rate</span>
            <DotsThree size={16} className="text-kumo-muted" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-kumo-strong font-mono leading-none">
                {totalEmailsCount > 0 ? deliveryRate : "—"}
              </span>
              {totalEmailsCount > 0 ? (
                <span className="text-xs font-medium text-cf-success flex items-center">
                  250 OK
                </span>
              ) : (
                <span className="text-xs font-normal text-kumo-muted flex items-center">
                  No data yet
                </span>
              )}
            </div>
            <span className="text-xs text-kumo-subtle block mt-1 font-normal">
              {totalEmailsCount > 0
                ? `${deliveredCount.toLocaleString()} of ${totalEmailsCount.toLocaleString()} delivered`
                : "Requires at least 1 dispatch"}
            </span>
          </div>
        </div>

        {/* Card 3: Queued */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-kumo-subtle">
            <span className="text-sm font-medium text-kumo-subtle">Queued</span>
            <DotsThree size={16} className="text-kumo-muted" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-kumo-strong font-mono leading-none">
                {queuedCount.toLocaleString()}
              </span>
              {queuedCount > 0 ? (
                <span className="text-xs font-medium text-cf-blue flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cf-blue animate-pulse" />
                  In transit
                </span>
              ) : (
                <span className="text-xs font-normal text-kumo-muted flex items-center">
                  Queue idle
                </span>
              )}
            </div>
            <span className="text-xs text-kumo-subtle block mt-1 font-normal">
              BullMQ message engine
            </span>
          </div>
        </div>

        {/* Card 4: Bounce Rate */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-kumo-subtle">
            <span className="text-sm font-medium text-kumo-subtle">Bounce Rate</span>
            <DotsThree size={16} className="text-kumo-muted" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-kumo-strong font-mono leading-none">
                {totalEmailsCount > 0 ? bounceRate : "0.0%"}
              </span>
              {bouncedCount === 0 ? (
                <span className="text-xs font-medium text-cf-success flex items-center">
                  Optimal
                </span>
              ) : (
                <span className="text-xs font-medium text-cf-amber flex items-center">
                  {bouncedCount} bounced
                </span>
              )}
            </div>
            <span className="text-xs text-kumo-subtle block mt-1 font-normal">
              {totalEmailsCount > 0
                ? `${bouncedCount.toLocaleString()} rejected / suppressed`
                : "Suppressed & rejected"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Segmented Control */}
        <div className="inline-flex items-center gap-1 p-1 bg-kumo-base border border-kumo-hairline rounded-lg overflow-x-auto shadow-2xs shrink-0">
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
                  "px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer shrink-0 select-none",
                  isActive
                    ? "bg-kumo-elevated text-kumo-strong font-medium shadow-2xs border border-kumo-line/50"
                    : "text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-tint/50 font-normal"
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
              className="w-full sm:w-auto h-9 bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg pl-3 pr-8 text-sm text-kumo-strong focus:outline-none focus:border-cf-blue/80 focus:ring-1 focus:ring-cf-blue/30 cursor-pointer transition-colors appearance-none shadow-2xs"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search recipient, msg_id..."
              className="w-full h-9 pl-8 pr-7 text-sm bg-kumo-control hover:bg-kumo-elevated/50 border border-kumo-line rounded-lg text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue/80 focus:ring-1 focus:ring-cf-blue/30 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-strong cursor-pointer p-0.5 rounded transition-colors"
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
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/40 text-kumo-subtle font-medium text-sm">
                  <th className="py-2.5 px-4 font-medium">Message ID</th>
                  <th className="py-2.5 px-4 font-medium">Recipient & Subject</th>
                  <th className="py-2.5 px-4 font-medium hidden md:table-cell">Sender / Domain</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline text-sm">
                {paginatedEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 sm:py-16 text-center">
                      <div className="max-w-sm mx-auto px-4 flex flex-col items-center">
                        <div className="w-9 h-9 rounded-xl bg-kumo-elevated text-kumo-muted flex items-center justify-center mb-3 border border-kumo-hairline shadow-2xs">
                          {emails.length === 0 ? (
                            <EnvelopeSimple size={18} className="text-kumo-subtle" />
                          ) : (
                            <Funnel size={18} className="text-kumo-subtle" />
                          )}
                        </div>
                        <div className="text-sm font-medium text-kumo-strong">
                          {emails.length === 0
                            ? "No processed emails yet"
                            : "No matching emails found"}
                        </div>
                        <p className="text-xs sm:text-sm text-kumo-subtle mt-1 font-normal leading-relaxed">
                          {emails.length === 0
                            ? "Emails dispatched through your SMTP server or API will appear in this real-time telemetry feed."
                            : "No processed emails match the selected filters or search query."}
                        </p>
                        {emails.length > 0 &&
                          (statusFilter !== "all" || domainFilter !== "all" || searchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                handleFilterChange("all");
                                handleDomainFilterChange("all");
                                handleSearchChange("");
                              }}
                              className="mt-3.5 px-3 py-1.5 text-xs font-medium text-cf-blue hover:text-cf-blue-hover rounded-md hover:bg-cf-blue/10 transition-colors cursor-pointer"
                            >
                              Clear active filters
                            </button>
                          )}
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
                        className="hover:bg-kumo-elevated/40 transition-colors group"
                      >
                        {/* Message ID */}
                        <td className="py-3 px-4 font-mono text-xs text-kumo-subtle align-middle">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-kumo-recessed/70 border border-kumo-hairline max-w-38 group-hover:border-kumo-line transition-colors">
                            <span className="truncate text-kumo-strong">{displayId}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(displayId, "Message ID")}
                              title="Copy message ID"
                              aria-label={`Copy message ID ${displayId}`}
                              className="text-kumo-muted hover:text-kumo-strong cursor-pointer shrink-0 transition-colors"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </td>

                        {/* Recipient & Subject */}
                        <td className="py-3 px-4 max-w-70 lg:max-w-85 align-middle">
                          <div className="font-medium text-kumo-strong truncate text-sm">
                            {recipientText}
                          </div>
                          <div className="text-xs text-kumo-subtle truncate mt-0.5 font-normal">
                            {item.subject || "(No subject)"}
                          </div>
                        </td>

                        {/* Sender Domain */}
                        <td className="py-3 px-4 text-kumo-subtle hidden md:table-cell font-mono text-xs truncate max-w-50 align-middle">
                          <span className="truncate block font-normal">{senderText}</span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 align-middle whitespace-nowrap">
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
                        <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                          <div className="font-mono text-xs text-kumo-default">
                            {formatRelativeTime(item.createdAt)}
                          </div>
                          <div className="text-xs text-kumo-muted font-normal mt-0.5">
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
              <div className="px-4 py-3 border-t border-kumo-hairline bg-kumo-recessed/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-kumo-subtle select-none">
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

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs text-kumo-muted">
                    Page <span className="font-mono text-kumo-strong">{safeCurrentPage}</span> of{" "}
                    <span className="font-mono text-kumo-strong">{totalPages}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="px-2.5 py-1 text-xs font-medium rounded-md border border-kumo-line bg-kumo-base hover:bg-kumo-elevated text-kumo-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Previous page"
                    >
                      <CaretLeft size={12} weight="bold" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="px-2.5 py-1 text-xs font-medium rounded-md border border-kumo-line bg-kumo-base hover:bg-kumo-elevated text-kumo-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
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
