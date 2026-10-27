"use client";

import React, { useState } from "react";
import {
  Tray,
  MagnifyingGlass,
  ArrowsClockwise,
  EnvelopeSimple,
  EnvelopeOpen,
  Star,
  Trash,
  CheckCircle,
  WarningCircle,
  ArrowUUpLeft,
  Copy,
  Clock,
  ShieldCheck,
  X,
  DotsThree,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";

interface InboundEmailItem {
  id: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  spamScore: number;
  dkimPass: boolean;
  spfPass: boolean;
}

const INITIAL_INBOX_EMAILS: InboundEmailItem[] = [
  {
    id: "inb_01j7b92x",
    from: "support@github.com",
    to: "dev@omkarbhosale.dev",
    subject: "[GitHub] A personal access token has been granted read permissions",
    preview: "Hey omkarbhosale, a new fine-grained personal access token was created with repository permissions...",
    body: `Hello omkarbhosale,\n\nA new fine-grained personal access token ("emitmail-deploy-agent") was generated on your account.\n\nPermissions granted:\n- Contents: Read and write\n- Workflows: Read\n\nIf you did not generate this token, please revoke it immediately in your security settings.`,
    receivedAt: "5 mins ago",
    isRead: false,
    isStarred: true,
    spamScore: 0.1,
    dkimPass: true,
    spfPass: true,
  },
  {
    id: "inb_02k8c01y",
    from: "noreply@cloudflare.com",
    to: "dns-admin@omkarbhosale.dev",
    subject: "DNS record propagation confirmed for omkarbhosale.dev",
    preview: "Your DNS TXT and MX verification records for selector 'esp._domainkey' have been successfully propagated globally...",
    body: `Cloudflare Edge DNS Notification:\n\nDomain: omkarbhosale.dev\nRecord: TXT esp._domainkey.omkarbhosale.dev\nStatus: Active (100% Edge Coverage)\n\nAll authoritative nameservers are now answering with 2048-bit RSA public key.`,
    receivedAt: "25 mins ago",
    isRead: false,
    isStarred: false,
    spamScore: 0.0,
    dkimPass: true,
    spfPass: true,
  },
  {
    id: "inb_03m9d44z",
    from: "mailer-daemon@google.com",
    to: "bounce@send.omkarbhosale.dev",
    subject: "Delivery Status Notification (Delay): Host busy",
    preview: "This is an informational notice regarding delivery to external destination. The server has queued retry attempt #2...",
    body: `Technical report:\n\nReporting-MTA: dns; mail.omkarbhosale.dev\nFinal-Recipient: rfc822; user@slow-destination.org\nAction: delayed\nStatus: 4.4.1 (Unable to connect to remote host)\nDiagnostic-Code: smtp; 421 4.4.1 Connection timed out, queued in Redis for retry.`,
    receivedAt: "1 hour ago",
    isRead: true,
    isStarred: false,
    spamScore: 0.2,
    dkimPass: true,
    spfPass: true,
  },
  {
    id: "inb_04p2e99w",
    from: "billing@resend.com",
    to: "finance@omkarbhosale.dev",
    subject: "Your monthly invoice summary for September 2026",
    preview: "Thank you for using Resend during your migration to EmitMail self-hosted infrastructure. Your receipt is attached...",
    body: `Hi Omkar,\n\nHere is your monthly invoice statement. Your self-hosted EmitMail instance has saved you approximately $180/mo in managed transactional email fees.\n\nTotal Paid: $0.00 (Migrated to Self-Hosted)`,
    receivedAt: "Yesterday",
    isRead: true,
    isStarred: true,
    spamScore: 0.0,
    dkimPass: true,
    spfPass: true,
  },
];

export function InboxView() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<InboundEmailItem[]>(INITIAL_INBOX_EMAILS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");
  const [selectedEmail, setSelectedEmail] = useState<InboundEmailItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Inbox Synchronized",
        description: "Checked for new inbound messages via local MX daemon.",
        type: "info",
      });
    }, 600);
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      )
    );
  };

  const markAsRead = (id: string, read: boolean) => {
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: read } : item))
    );
    if (selectedEmail?.id === id) {
      setSelectedEmail((prev) => (prev ? { ...prev, isRead: read } : null));
    }
  };

  const deleteEmail = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEmails((prev) => prev.filter((item) => item.id !== id));
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }
    toast({
      title: "Email Removed",
      description: "Message deleted from inbound inbox.",
      type: "info",
    });
  };

  const filteredEmails = emails.filter((item) => {
    if (filter === "unread" && item.isRead) return false;
    if (filter === "starred" && !item.isStarred) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.subject.toLowerCase().includes(q) ||
        item.from.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header (Cloudflare Kumo Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
              Inbox
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Inbound SMTP & Webhooks Active</span>
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cf-orange text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-kumo-subtle mt-1.5">
            Live inbound mail stream, webhook notifications, and bounce receiver
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-cf-secondary flex items-center gap-1.5 text-xs"
          >
            <ArrowsClockwise
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Toolbar: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0C0C0C] border border-[#262626] rounded-lg p-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E6E]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inbound messages by sender, recipient, or subject..."
            className="w-full bg-[#141414] border border-[#262626] rounded-md pl-9 pr-3 py-1.5 text-xs text-kumo-strong placeholder:text-[#6E6E6E] outline-none focus:border-[#3E3E3E]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E6E] hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-[#1C1C1E] text-white border border-[#3E3E3E]"
                : "text-kumo-subtle hover:text-white"
            }`}
          >
            All ({emails.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filter === "unread"
                ? "bg-[#1C1C1E] text-white border border-[#3E3E3E]"
                : "text-kumo-subtle hover:text-white"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("starred")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filter === "starred"
                ? "bg-[#1C1C1E] text-white border border-[#3E3E3E]"
                : "text-kumo-subtle hover:text-white"
            }`}
          >
            Starred ({emails.filter((e) => e.isStarred).length})
          </button>
        </div>
      </div>

      {/* 3. Master List View */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-lg overflow-hidden shadow-2xs">
        {filteredEmails.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center text-kumo-muted mb-3">
              <Tray size={24} weight="duotone" />
            </div>
            <h4 className="text-sm font-semibold text-kumo-strong mb-1">
              No inbound emails found
            </h4>
            <p className="text-xs text-kumo-subtle max-w-sm">
              {searchQuery
                ? `No messages matched "${searchQuery}".`
                : "Inbound mailbox is empty. Incoming emails sent to your verified domains will appear here in real time."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {filteredEmails.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedEmail(item);
                  if (!item.isRead) markAsRead(item.id, true);
                }}
                className={`flex items-start sm:items-center justify-between gap-3 p-3 sm:px-4 sm:py-3 transition-colors cursor-pointer group select-none ${
                  !item.isRead
                    ? "bg-[#121214] hover:bg-[#18181A]"
                    : "hover:bg-[#141414]"
                }`}
              >
                {/* Left Star & Status Dot */}
                <div className="flex items-center gap-2.5 shrink-0 pt-0.5 sm:pt-0">
                  <button
                    type="button"
                    onClick={(e) => toggleStar(item.id, e)}
                    className="text-[#6E6E6E] hover:text-amber-400 transition-colors"
                  >
                    <Star
                      size={15}
                      weight={item.isStarred ? "fill" : "regular"}
                      className={item.isStarred ? "text-amber-400" : ""}
                    />
                  </button>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !item.isRead ? "bg-cf-blue" : "bg-transparent"
                    }`}
                  />
                </div>

                {/* Sender & Subject & Preview Snippet */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-3 items-baseline">
                  {/* Sender */}
                  <div className="md:col-span-3 truncate text-xs">
                    <span
                      className={
                        !item.isRead
                          ? "font-semibold text-white"
                          : "font-normal text-[#D4D4D8]"
                      }
                    >
                      {item.from}
                    </span>
                  </div>

                  {/* Subject & Preview */}
                  <div className="md:col-span-9 truncate text-xs">
                    <span
                      className={
                        !item.isRead
                          ? "font-semibold text-white"
                          : "text-kumo-strong"
                      }
                    >
                      {item.subject}
                    </span>
                    <span className="text-kumo-subtle ml-2 hidden sm:inline">
                      — {item.preview}
                    </span>
                  </div>
                </div>

                {/* Right Badges & Timestamp */}
                <div className="flex items-center gap-3 shrink-0 text-[11px] text-[#8E8E93]">
                  <div className="hidden lg:flex items-center gap-1.5">
                    {item.dkimPass && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        DKIM:OK
                      </span>
                    )}
                    {item.spfPass && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        SPF:OK
                      </span>
                    )}
                  </div>
                  <span>{item.receivedAt}</span>
                  <button
                    type="button"
                    onClick={(e) => deleteEmail(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#6E6E6E] hover:text-kumo-danger transition-all"
                    title="Delete message"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Full Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedEmail(null)}
          />
          <div className="relative w-full max-w-2xl bg-[#0F0F11] border border-[#2B2B2B] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-[#262626]">
              <div className="space-y-1 pr-4 min-w-0">
                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {selectedEmail.subject}
                </h3>
                <div className="flex items-center gap-3 text-xs text-kumo-subtle flex-wrap">
                  <span>
                    From: <strong className="text-white font-mono">{selectedEmail.from}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    To: <span className="text-[#D4D4D8] font-mono">{selectedEmail.to}</span>
                  </span>
                  <span>•</span>
                  <span>{selectedEmail.receivedAt}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-lg text-kumo-muted hover:text-white hover:bg-[#1E1E22] shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Security Audit Row */}
            <div className="bg-[#141416] border-b border-[#262626] px-6 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-[#A1A1AA]">Inbound Security Check:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  DKIM Signature Valid
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  SPF Alignment Pass
                </span>
              </div>
              <div className="text-[11px] text-kumo-subtle font-mono">
                Spam Score: {selectedEmail.spamScore} / 10
              </div>
            </div>

            {/* Email Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs text-[#E4E4E7] leading-relaxed font-sans whitespace-pre-wrap select-text bg-[#0A0A0C]">
              {selectedEmail.body}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[#121214] border-t border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAsRead(selectedEmail.id, !selectedEmail.isRead)}
                  className="btn-cf-secondary text-xs flex items-center gap-1.5"
                >
                  {selectedEmail.isRead ? <EnvelopeSimple size={14} /> : <EnvelopeOpen size={14} />}
                  <span>{selectedEmail.isRead ? "Mark Unread" : "Mark Read"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteEmail(selectedEmail.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors"
                >
                  Delete
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="btn-cf-primary text-xs"
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
