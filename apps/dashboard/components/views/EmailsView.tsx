"use client";

import React, { useState } from "react";
import {
  PaperPlaneTilt,
  MagnifyingGlass,
  ArrowsClockwise,
  EnvelopeSimple,
  Copy,
  Clock,
  WarningCircle,
  X,
  Code,
  Lightning,
} from "@phosphor-icons/react";
import { ProcessedEmailItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";

const INITIAL_EMAILS: ProcessedEmailItem[] = [
  {
    id: "msg_8f1b9204c3e8",
    recipient: "sarah.connor@cyberdyne.io",
    sender: "notifications@omkarbhosale.dev",
    subject: "Your login security verification code is 492-108",
    status: "delivered",
    smtpResponse: "250 2.0.0 OK: message queued 1094821",
    domain: "omkarbhosale.dev",
    latencyMs: 38,
    timestamp: "2 mins ago",
    createdAt: "2026-10-26T12:00:22Z",
    hasDkim: true,
    hasSpf: true,
    sizeBytes: 4210,
  },
  {
    id: "msg_44e1a0df77b3",
    recipient: "alex.rivera@stripe-payments.com",
    sender: "billing@omkarbhosale.dev",
    subject: "Receipt for Invoice #INV-2026-8819",
    status: "delivered",
    smtpResponse: "250 2.0.0 OK: delivered to gateway mx.stripe.com",
    domain: "omkarbhosale.dev",
    latencyMs: 42,
    timestamp: "8 mins ago",
    createdAt: "2026-10-26T11:54:10Z",
    hasDkim: true,
    hasSpf: true,
    sizeBytes: 8940,
  },
  {
    id: "msg_77b31c9af021",
    recipient: "developer@emitmail.dev",
    sender: "system@emitmail.dev",
    subject: "BullMQ worker node auto-scaled to 12 concurrency threads",
    status: "delivered",
    smtpResponse: "250 2.0.0 OK: local maildir stored",
    domain: "emitmail.dev",
    latencyMs: 29,
    timestamp: "18 mins ago",
    createdAt: "2026-10-26T11:44:00Z",
    hasDkim: true,
    hasSpf: true,
    sizeBytes: 3120,
  },
  {
    id: "msg_90a1f28b4c5e",
    recipient: "queue-test@bullmq.io",
    sender: "notifications@omkarbhosale.dev",
    subject: "BullMQ Stress Test payload #98821",
    status: "queued",
    smtpResponse: "Queued in Redis list 'queue:outbound-mail' (jobId: #891)",
    domain: "omkarbhosale.dev",
    latencyMs: 14,
    timestamp: "24 mins ago",
    createdAt: "2026-10-26T11:38:12Z",
    hasDkim: true,
    hasSpf: true,
    sizeBytes: 2540,
  },
  {
    id: "msg_33a0df44b192",
    recipient: "invalid-user@acme-corp.net",
    sender: "system@emitmail.dev",
    subject: "Password Reset Request",
    status: "bounced",
    smtpResponse: "550 5.1.1 User mailbox unknown on acme-corp.net",
    domain: "emitmail.dev",
    latencyMs: 48,
    timestamp: "45 mins ago",
    createdAt: "2026-10-26T11:17:30Z",
    hasDkim: true,
    hasSpf: true,
    sizeBytes: 3890,
  },
  {
    id: "msg_12f9b8c7340e",
    recipient: "elena.rostova@techinnovate.com",
    sender: "notifications@omkarbhosale.dev",
    subject: "Welcome to the EmitMail Early Access Platform",
    status: "delivered",
    smtpResponse: "250 2.0.0 OK: queued as 778B2A",
    domain: "omkarbhosale.dev",
    latencyMs: 35,
    timestamp: "1 hour ago",
    createdAt: "2026-10-26T11:02:44Z",
    hasDkim: true,
    hasSpf: true,
    sizeBytes: 6120,
  },
];

interface EmailsViewProps {
  onTriggerSendEmail: () => void;
}

export function EmailsView({ onTriggerSendEmail }: EmailsViewProps) {
  const { toast } = useToast();
  const [emails, setEmails] = useState<ProcessedEmailItem[]>(INITIAL_EMAILS);
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "queued" | "bounced">("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmailItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIsLoading(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setIsLoading(false);
      toast({
        title: "Email Feed Refreshed",
        description: "Synchronized latest BullMQ message acknowledgments.",
        type: "info",
      });
    }, 600);
  };

  const handleFilterChange = (tab: "all" | "delivered" | "queued" | "bounced") => {
    setIsLoading(true);
    setStatusFilter(tab);
    setTimeout(() => setIsLoading(false), 300);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: label,
      type: "success",
    });
  };

  const filteredEmails = emails.filter((item) => {
    const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
    const matchesDomain = domainFilter === "all" ? true : item.domain === domainFilter;
    const matchesSearch =
      item.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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
            onClick={onTriggerSendEmail}
            className="btn-cf-primary"
          >
            <PaperPlaneTilt size={15} weight="bold" />
            <span>Send Email</span>
          </button>
        </div>
      </div>

      {/* 2. Telemetry KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Total Messages</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-kumo-strong">1,248</span>
            <span className="text-[10px] text-cf-success font-semibold">↗ 12%</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Delivery Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-kumo-strong">99.2%</span>
            <span className="text-[10px] text-cf-success font-semibold">250 OK</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">Avg Queue Latency</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-kumo-strong">36ms</span>
            <span className="text-[10px] text-cf-success font-semibold flex items-center gap-0.5">
              <Lightning size={10} weight="fill" />
              <span>Normal</span>
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-kumo-base border border-kumo-hairline">
          <span className="text-[11px] font-medium text-kumo-subtle block">DKIM Alignment</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-kumo-strong">100%</span>
            <span className="text-[10px] text-cf-success font-semibold">RSA-2048</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-kumo-base border border-kumo-line rounded-lg">
          {(["all", "delivered", "queued", "bounced"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleFilterChange(tab)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === tab
                  ? "bg-kumo-elevated text-kumo-strong shadow-2xs font-semibold"
                  : "text-kumo-subtle hover:text-kumo-strong"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Domain Filter + Search */}
        <div className="flex items-center gap-2">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="bg-kumo-control border border-kumo-line rounded-lg px-2.5 py-1.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer"
          >
            <option value="all">All Domains</option>
            <option value="omkarbhosale.dev">omkarbhosale.dev</option>
            <option value="emitmail.dev">emitmail.dev</option>
          </select>

          <div className="relative w-full sm:w-60">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient, msg_id..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-kumo-control border border-kumo-line rounded-lg text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
            />
          </div>
        </div>
      </div>

      {/* 4. Processed Emails Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium">
                  <th className="py-3 px-4">Message ID</th>
                  <th className="py-3 px-4">Recipient & Subject</th>
                  <th className="py-3 px-4 hidden md:table-cell">Sender / Domain</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Security</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Latency</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-hairline">
                {filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-kumo-subtle">
                      No processed emails found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmails.map((item) => (
                    <tr key={item.id} className="hover:bg-kumo-tint/60 transition-colors group">
                      {/* Message ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-kumo-strong">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-kumo-recessed border border-kumo-hairline">
                          <span>{item.id.substring(0, 14)}...</span>
                          <button
                            onClick={() => copyToClipboard(item.id, "Message ID")}
                            title="Copy message ID"
                            className="text-kumo-muted hover:text-kumo-strong"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Recipient & Subject */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="font-semibold text-kumo-strong truncate">
                          {item.recipient}
                        </div>
                        <div className="text-[11px] text-kumo-subtle truncate mt-0.5">
                          {item.subject}
                        </div>
                      </td>

                      {/* Sender Domain */}
                      <td className="py-3.5 px-4 text-kumo-subtle hidden md:table-cell font-mono text-[11px] truncate max-w-[180px]">
                        <div>{item.sender}</div>
                      </td>

                      {/* Cloudflare Accurate Status Badge */}
                      <td className="py-3.5 px-4">
                        {item.status === "delivered" ? (
                          <StatusBadge variant="success">250 OK</StatusBadge>
                        ) : item.status === "queued" ? (
                          <StatusBadge variant="info" pulseDot>Queued</StatusBadge>
                        ) : (
                          <StatusBadge variant="danger">550 Bounce</StatusBadge>
                        )}
                      </td>

                      {/* Security Tags */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-kumo-recessed border border-kumo-hairline text-cf-success font-semibold">
                            DKIM ✓
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-kumo-recessed border border-kumo-hairline text-cf-success font-semibold">
                            SPF ✓
                          </span>
                        </div>
                      </td>

                      {/* Latency & Timestamp */}
                      <td className="py-3.5 px-4 text-kumo-subtle hidden lg:table-cell font-mono text-[11px]">
                        <div>{item.timestamp}</div>
                        <div className="text-[10px] text-kumo-muted">{item.latencyMs}ms queue ACK</div>
                      </td>

                      {/* Action: Inspect */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedEmail(item)}
                          className="px-2.5 py-1 rounded bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-[11px] font-medium text-kumo-strong transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Email Inspector & Delivery Timeline Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedEmail(null)}
          />
          <div className="relative w-full max-w-xl bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                  <EnvelopeSimple size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    Message Delivery Lifecycle
                  </h3>
                  <span className="font-mono text-[11px] text-kumo-subtle">
                    {selectedEmail.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Delivery Overview */}
              <div className="p-3.5 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-kumo-subtle">Status:</span>
                  <span className="font-mono font-bold text-cf-success">
                    {selectedEmail.smtpResponse}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-kumo-subtle">Recipient:</span>
                  <span className="font-semibold text-kumo-strong">
                    {selectedEmail.recipient}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-kumo-subtle">Sender:</span>
                  <span className="font-mono text-kumo-strong">
                    {selectedEmail.sender}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-kumo-subtle">Subject:</span>
                  <span className="text-kumo-strong font-medium truncate max-w-xs">
                    {selectedEmail.subject}
                  </span>
                </div>
              </div>

              {/* 5-Stage Delivery Pipeline Timeline */}
              <div>
                <span className="text-xs font-semibold text-kumo-strong block mb-2.5">
                  Pipeline Execution Stages
                </span>
                <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-kumo-line">
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cf-success ring-4 ring-kumo-base" />
                    <span className="text-xs font-semibold text-kumo-strong block">
                      Stage 1: Enqueued into Redis Cluster
                    </span>
                    <span className="text-[11px] text-kumo-subtle block font-mono">
                      Queue: queue:outbound-mail • Latency: 2ms
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cf-success ring-4 ring-kumo-base" />
                    <span className="text-xs font-semibold text-kumo-strong block">
                      Stage 2: BullMQ Worker Claimed
                    </span>
                    <span className="text-[11px] text-kumo-subtle block font-mono">
                      Worker node #3-concurrency-12 • PID 4981
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cf-success ring-4 ring-kumo-base" />
                    <span className="text-xs font-semibold text-kumo-strong block">
                      Stage 3: DKIM Signed & SPF Header Embedded
                    </span>
                    <span className="text-[11px] text-kumo-subtle block font-mono">
                      Selector: emitmail._domainkey.{selectedEmail.domain} • RSA 2048-bit
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cf-success ring-4 ring-kumo-base" />
                    <span className="text-xs font-semibold text-kumo-strong block">
                      Stage 4: Remote MX Handshake (STARTTLS)
                    </span>
                    <span className="text-[11px] text-kumo-subtle block font-mono">
                      TLSv1.3 cipher TLS_AES_256_GCM_SHA384
                    </span>
                  </div>

                  <div className="relative">
                    <span className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-kumo-base ${
                      selectedEmail.status === "delivered" ? "bg-cf-success" : selectedEmail.status === "queued" ? "bg-cf-chart-blue" : "bg-kumo-danger"
                    }`} />
                    <span className="text-xs font-semibold text-kumo-strong block">
                      Stage 5: Final Delivery Acknowledgment
                    </span>
                    <span className="text-[11px] text-kumo-subtle block font-mono">
                      {selectedEmail.smtpResponse}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-between">
              <span className="text-[11px] text-kumo-subtle font-mono">
                Payload Size: {selectedEmail.sizeBytes ? `${(selectedEmail.sizeBytes / 1024).toFixed(1)} KB` : "4.2 KB"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="btn-cf-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
