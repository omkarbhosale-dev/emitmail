"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  Tray,
  MagnifyingGlass,
  ArrowsClockwise,
  EnvelopeSimple,
  EnvelopeOpen,
  Star,
  Trash,
  CheckCircle,
  Warning,
  Paperclip,
  PaperPlaneTilt,
  Copy,
  Check,
  X,
} from "@phosphor-icons/react";
import { InboundEmailItem, MailboxItem, InboundDomainItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { ComposeEmailModal } from "@/components/inbox/ComposeEmailModal";

interface MailboxEmailsViewProps {
  mailboxId: string;
}

const STATIC_5MIN_AGO = "2026-10-28T09:55:00.000Z";
const STATIC_25MIN_AGO = "2026-10-28T09:35:00.000Z";
const STATIC_1HR_AGO = "2026-10-28T09:00:00.000Z";

const FALLBACK_EMAILS: InboundEmailItem[] = [
  {
    id: "inb_01j7b92x",
    mailboxId: "mbx_support",
    domainId: "dom_omkar",
    threadId: "thr_01j7b92x",
    messageId: "<pat-notice@github.com>",
    fromAddress: "support@github.com",
    fromName: "GitHub Security",
    toAddresses: ["support@omkarbhosale.dev"],
    subject: "[GitHub] A personal access token has been granted read permissions",
    snippet: "Hey omkarbhosale, a new fine-grained personal access token was created with repository permissions...",
    textBody: "Hey omkarbhosale, a new fine-grained personal access token was created with repository permissions.",
    receivedAt: STATIC_5MIN_AGO,
    createdAt: STATIC_5MIN_AGO,
    updatedAt: STATIC_5MIN_AGO,
    direction: "INBOUND",
    isRead: false,
    isStarred: true,
    isArchived: false,
    isTrash: false,
    spamScore: 0.1,
    dkimPass: true,
    spfPass: true,
    attachments: [
      {
        filename: "token-manifest.json",
        contentType: "application/json",
        sizeBytes: 1024,
      },
    ],
    sizeBytes: 4096,
  },
  {
    id: "inb_02k8c01y",
    mailboxId: "mbx_support",
    domainId: "dom_omkar",
    threadId: "thr_02k8c01y",
    messageId: "<dns-verify@cloudflare.com>",
    fromAddress: "noreply@cloudflare.com",
    fromName: "Cloudflare Edge",
    toAddresses: ["support@omkarbhosale.dev"],
    subject: "DNS record propagation confirmed for omkarbhosale.dev",
    snippet: "Your DNS TXT and MX verification records for selector 'esp._domainkey' have been successfully propagated globally...",
    textBody: "Cloudflare Edge DNS Notification: All authoritative nameservers are now answering with 2048-bit RSA public key.",
    receivedAt: STATIC_25MIN_AGO,
    createdAt: STATIC_25MIN_AGO,
    updatedAt: STATIC_25MIN_AGO,
    direction: "INBOUND",
    isRead: false,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    spamScore: 0.0,
    dkimPass: true,
    spfPass: true,
    attachments: [],
    sizeBytes: 3200,
  },
  {
    id: "inb_03m9d44z",
    mailboxId: "mbx_billing",
    domainId: "dom_omkar",
    threadId: "thr_03m9d44z",
    messageId: "<delay-notice@google.com>",
    fromAddress: "mailer-daemon@google.com",
    fromName: "Google Mailer Daemon",
    toAddresses: ["billing@omkarbhosale.dev"],
    subject: "Delivery Status Notification (Delay): Host busy",
    snippet: "This is an informational notice regarding delivery to external destination. The server has queued retry attempt #2...",
    textBody: "Technical report: Reporting-MTA: dns; mail.omkarbhosale.dev. Action: delayed. Status: 4.4.1 Connection timed out.",
    receivedAt: STATIC_1HR_AGO,
    createdAt: STATIC_1HR_AGO,
    updatedAt: STATIC_1HR_AGO,
    direction: "INBOUND",
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    spamScore: 0.2,
    dkimPass: true,
    spfPass: true,
    attachments: [],
    sizeBytes: 2150,
  },
];

export function MailboxEmailsView({ mailboxId }: MailboxEmailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [mailbox, setMailbox] = useState<MailboxItem | null>(null);
  const [messages, setMessages] = useState<InboundEmailItem[]>([]);
  const [domain, setDomain] = useState<InboundDomainItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifyingMx, setIsVerifyingMx] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMxBannerDismissed, setIsMxBannerDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "starred">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchMailboxData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mailboxRes, messagesRes, domainsRes] = await Promise.allSettled([
        api.inbox.getMailbox(mailboxId),
        api.inbox.listMessages(mailboxId, {
          filter: activeFilter,
          search: searchQuery.trim() || undefined,
        }),
        api.inbox.listDomains(),
      ]);

      let foundMailbox: MailboxItem | null = null;
      if (mailboxRes.status === "fulfilled" && mailboxRes.value) {
        foundMailbox = mailboxRes.value;
        setMailbox(foundMailbox);
      }

      if (messagesRes.status === "fulfilled") {
        setMessages(messagesRes.value.messages || []);
        if (messagesRes.value.mailbox && !foundMailbox) {
          foundMailbox = messagesRes.value.mailbox;
          setMailbox(foundMailbox);
        }
      }

      if (domainsRes.status === "fulfilled" && domainsRes.value.length > 0) {
        const dom = domainsRes.value.find((d) => d.id === foundMailbox?.domainId) || domainsRes.value[0];
        setDomain(dom);
      }
    } catch {
      // Keep existing state on error
    } finally {
      setIsLoading(false);
    }
  }, [mailboxId, activeFilter, searchQuery]);

  useEffect(() => {
    fetchMailboxData();
  }, [fetchMailboxData]);

  const handleSimulateTestEmail = async () => {
    if (!mailbox) return;
    setIsSimulating(true);
    try {
      await api.inbox.simulateInbound({
        from: "EmitMail Test <hello@emitmail.com>",
        to: mailbox.emailAddress,
        subject: "Welcome to your new EmitMail Inbox!",
        text: `Your mailbox ${mailbox.emailAddress} is active and receiving inbound emails.`,
        html: `<div style="font-family:sans-serif;padding:20px;border-radius:12px;background:#f9f9fb;border:1px solid #e2e2ea;"><h2 style="color:#0f172a;margin-top:0;">Welcome to EmitMail!</h2><p style="color:#334155;line-height:1.6;">Your mailbox <strong>${mailbox.emailAddress}</strong> is active, DNS is verified, and inbound processing is working properly.</p><hr style="border:none;border-top:1px solid #e2e2ea;margin:20px 0;"/><p style="color:#64748b;font-size:12px;margin-bottom:0;">Processed by EmitMail SMTP Receiver & BullMQ Worker</p></div>`,
      });
      toast({
        title: "Test Inbound Dispatched",
        description: "Processing incoming MIME message through BullMQ worker...",
        type: "info",
      });
      setTimeout(async () => {
        await fetchMailboxData();
        setIsSimulating(false);
        toast({
          title: "New Email Received",
          description: "Incoming test email has been added to your mailbox.",
          type: "success",
        });
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to simulate email";
      toast({ title: "Simulation Failed", description: msg, type: "error" });
      setIsSimulating(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMailboxData();
    setIsRefreshing(false);
    toast({
      title: "Inbox Synchronized",
      description: "Checked for new messages in this mailbox.",
      type: "info",
    });
  };

  const handleVerifyMx = async () => {
    if (!domain) return;
    setIsVerifyingMx(true);
    try {
      const res = await api.inbox.verifyDomainMx(domain.id);
      if (res.verified) {
        setDomain({ ...domain, inboundMxVerified: true });
        toast({
          title: "Inbound MX Verified",
          description: `MX DNS records confirmed for ${domain.domainName}. Ready to receive emails.`,
          type: "success",
        });
      } else {
        toast({
          title: "MX Records Not Yet Detected",
          description: "DNS propagation can take a few minutes. Check that the MX host and priority are configured in your DNS provider.",
          type: "warning",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast({ title: "MX Check Failed", description: msg, type: "error" });
    } finally {
      setIsVerifyingMx(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to Clipboard", description: text, type: "info" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = messages.find((m) => m.id === id);
    if (!target) return;
    const nextStarred = !target.isStarred;

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: nextStarred } : m))
    );

    try {
      await api.inbox.updateMessage(id, { isStarred: nextStarred });
    } catch {
      // Non-blocking
    }
  };

  const handleToggleRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = messages.find((m) => m.id === id);
    if (!target) return;
    const nextRead = !target.isRead;

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isRead: nextRead } : m))
    );

    try {
      await api.inbox.updateMessage(id, { isRead: nextRead });
    } catch {
      // Non-blocking
    }
  };

  const handleDeleteMessage = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await api.inbox.deleteMessage(id);
      toast({
        title: "Message Deleted",
        description: "Removed from mailbox.",
        type: "info",
      });
    } catch {
      // Non-blocking
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMessageIds(new Set(filteredMessages.map((m) => m.id)));
    } else {
      setSelectedMessageIds(new Set());
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkRead = async (markRead: boolean) => {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;

    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, isRead: markRead } : m))
    );
    setSelectedMessageIds(new Set());

    try {
      await Promise.all(ids.map((id) => api.inbox.updateMessage(id, { isRead: markRead })));
      toast({
        title: markRead ? "Marked as Read" : "Marked as Unread",
        description: `${ids.length} messages updated.`,
        type: "info",
      });
    } catch {
      // Non-blocking
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;

    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedMessageIds(new Set());

    try {
      await Promise.all(ids.map((id) => api.inbox.deleteMessage(id)));
      toast({
        title: "Messages Deleted",
        description: `${ids.length} messages removed.`,
        type: "info",
      });
    } catch {
      // Non-blocking
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((item) => {
      if (activeFilter === "unread" && item.isRead) return false;
      if (activeFilter === "starred" && !item.isStarred) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = item.subject?.toLowerCase().includes(q);
        const matchesFrom = item.fromAddress?.toLowerCase().includes(q) || item.fromName?.toLowerCase().includes(q);
        const matchesSnippet = item.snippet?.toLowerCase().includes(q);
        return matchesSubject || matchesFrom || matchesSnippet;
      }
      return true;
    });
  }, [messages, activeFilter, searchQuery]);

  const totalUnreadCount = useMemo(() => {
    return messages.filter((m) => !m.isRead).length;
  }, [messages]);

  const isAllSelected =
    filteredMessages.length > 0 &&
    filteredMessages.every((m) => selectedMessageIds.has(m.id));

  const formatTime = (isoString: string) => {
    if (!isMounted) return "—";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  const showMxBanner = Boolean(
    domain && !domain.inboundMxVerified && !isMxBannerDismissed
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-kumo-subtle">
        <Link
          href="/inbox"
          className="hover:text-kumo-strong transition-colors flex items-center gap-1.5"
        >
          <CaretLeft size={14} />
          <span>Inbox</span>
        </Link>
        <span>/</span>
        <span className="text-kumo-strong font-medium font-mono">
          {mailbox?.emailAddress || "Mailbox"}
        </span>
      </div>

      {/* 2. Mailbox Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-kumo-hairline pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong font-mono">
              {mailbox?.emailAddress || "Mailbox"}
            </h1>
            {totalUnreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0066FF] text-white">
                {totalUnreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-kumo-subtle mt-1">
            {mailbox?.displayName ? `${mailbox.displayName} • ` : ""}
            Inbound email stream and conversation threads.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-cf-secondary flex items-center gap-1.5"
            title="Refresh messages"
          >
            <ArrowsClockwise
              size={14}
              className={isRefreshing ? "animate-spin text-cf-blue" : ""}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="btn-cf-primary flex items-center gap-1.5"
          >
            <PaperPlaneTilt size={14} weight="bold" />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      {/* 3. Inbound MX Setup Banner (if not verified) */}
      {showMxBanner && domain && (
        <div className="p-4 rounded-xl bg-kumo-base border border-amber-500/30 flex items-start gap-3.5 shadow-2xs animate-in fade-in duration-150">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
            <Warning size={20} weight="fill" />
          </div>
          <div className="text-xs leading-relaxed flex-1 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-kumo-strong block text-xs">
                  Inbound MX Configuration Required for {domain.domainName}
                </span>
                <span className="text-kumo-subtle text-[11px]">
                  Add this root-domain MX record to your DNS provider to begin receiving emails.
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleVerifyMx}
                  disabled={isVerifyingMx}
                  className="btn-cf-primary text-xs flex items-center gap-1.5"
                >
                  {isVerifyingMx ? (
                    <>
                      <ArrowsClockwise size={13} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={13} weight="bold" />
                      <span>Verify MX Record</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMxBannerDismissed(true)}
                  className="p-1 rounded text-kumo-muted hover:text-kumo-strong cursor-pointer"
                  title="Dismiss banner"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Record Pill Spec */}
            <div className="bg-kumo-control border border-kumo-line rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-[10px] text-kumo-subtle font-sans block">Type</span>
                <span className="font-semibold text-cf-orange">MX</span>
              </div>
              <div>
                <span className="text-[10px] text-kumo-subtle font-sans block">Host</span>
                <div className="flex items-center gap-1">
                  <span>@</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("@", "host")}
                    className="p-0.5 text-kumo-subtle hover:text-kumo-strong"
                    title="Copy host"
                  >
                    {copiedKey === "host" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-kumo-subtle font-sans block">Target Value</span>
                <div className="flex items-center gap-1">
                  <span className="truncate">{domain.requiredMxRecord?.value || domain.mxHost || "mail.omkarbhosale.dev"}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(domain.requiredMxRecord?.value || domain.mxHost || "mail.omkarbhosale.dev", "val")}
                    className="p-0.5 text-kumo-subtle hover:text-kumo-strong"
                    title="Copy value"
                  >
                    {copiedKey === "val" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-kumo-subtle font-sans block">Priority</span>
                <span className="font-semibold text-kumo-strong">{domain.requiredMxRecord?.priority || domain.mxPriority || 10}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Filter tabs or bulk action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedMessageIds.size > 0 ? (
            <div className="flex items-center gap-1.5 p-1 bg-kumo-base border border-kumo-line rounded-lg animate-in fade-in duration-100">
              <span className="text-xs font-semibold text-kumo-strong px-2">
                {selectedMessageIds.size} selected
              </span>

              <button
                type="button"
                onClick={() => handleBulkMarkRead(true)}
                className="px-2.5 py-1 text-xs rounded-md text-kumo-default hover:text-kumo-strong hover:bg-kumo-tint flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mark selected as read"
              >
                <EnvelopeOpen size={13} />
                <span>Mark Read</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkMarkRead(false)}
                className="px-2.5 py-1 text-xs rounded-md text-kumo-default hover:text-kumo-strong hover:bg-kumo-tint flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mark selected as unread"
              >
                <EnvelopeSimple size={13} />
                <span>Mark Unread</span>
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-2.5 py-1 text-xs rounded-md text-kumo-danger hover:bg-kumo-danger-tint flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete selected"
              >
                <Trash size={13} />
                <span>Delete</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1 bg-kumo-base border border-kumo-line rounded-lg">
              {(["all", "unread", "starred"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    activeFilter === tab
                      ? "bg-kumo-elevated text-kumo-strong shadow-2xs font-semibold"
                      : "text-kumo-subtle hover:text-kumo-strong"
                  }`}
                >
                  {tab}
                  {tab === "all" ? ` (${messages.length})` : ""}
                  {tab === "unread" && totalUnreadCount > 0 ? ` (${totalUnreadCount})` : ""}
                  {tab === "starred" && messages.filter((m) => m.isStarred).length > 0
                    ? ` (${messages.filter((m) => m.isStarred).length})`
                    : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Search Input */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sender, subject..."
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
      </div>

      {/* 5. Messages Table */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
        {/* Table Column Headers */}
        <div className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium text-xs px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="rounded border-kumo-line text-cf-blue focus:ring-cf-blue cursor-pointer w-4 h-4 bg-kumo-control shrink-0"
              title="Select all"
            />
            <span className="w-40 sm:w-44">Sender</span>
            <span>Subject & Snippet</span>
          </div>
          <div className="w-24 text-right">Received</div>
        </div>

        {/* Message Rows */}
        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : filteredMessages.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-kumo-control border border-kumo-line flex items-center justify-center text-kumo-muted mb-3">
              <Tray size={24} weight="duotone" />
            </div>
            <h4 className="text-sm font-semibold text-kumo-strong mb-1">
              Mailbox is empty
            </h4>
            <p className="text-xs text-kumo-subtle max-w-sm">
              {searchQuery
                ? `No messages matched "${searchQuery}".`
                : `Incoming messages addressed to ${mailbox?.emailAddress || "this mailbox"} will appear here in real time.`}
            </p>
            {!searchQuery && mailbox && (
              <button
                type="button"
                onClick={handleSimulateTestEmail}
                disabled={isSimulating}
                className="mt-4 btn-cf-secondary text-xs flex items-center gap-1.5"
              >
                <ArrowsClockwise size={13} className={isSimulating ? "animate-spin" : ""} />
                <span>{isSimulating ? "Simulating inbound email..." : "Simulate incoming test email"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-kumo-hairline">
            {filteredMessages.map((item) => {
              const isSelected = selectedMessageIds.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/inbox/${mailboxId}/${item.id}`)}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors cursor-pointer group select-none relative ${
                    !item.isRead
                      ? "bg-kumo-base hover:bg-kumo-tint/60 border-l-2 border-l-[#0066FF]"
                      : "bg-kumo-base/40 hover:bg-kumo-tint/60 border-l-2 border-l-transparent text-kumo-subtle"
                  } ${isSelected ? "bg-cf-blue/5" : ""}`}
                >
                  {/* Left Controls: Checkbox + Star + Dot + Sender */}
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => handleSelectRow(item.id, e)}
                      onChange={() => {}}
                      className="rounded border-kumo-line text-cf-blue focus:ring-cf-blue cursor-pointer w-4 h-4 bg-kumo-control shrink-0"
                    />

                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(item.id, e)}
                      className="cursor-pointer shrink-0 text-kumo-subtle hover:text-amber-400 transition-colors"
                      title={item.isStarred ? "Starred" : "Not starred"}
                    >
                      <Star
                        size={16}
                        weight={item.isStarred ? "fill" : "regular"}
                        className={item.isStarred ? "text-amber-400" : ""}
                      />
                    </button>

                    {/* Unread Orange Dot */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        !item.isRead ? "bg-[#0066FF]" : "bg-transparent"
                      }`}
                    />

                    {/* Sender Name */}
                    <div className="w-40 sm:w-44 truncate shrink-0">
                      <span
                        className={`text-xs truncate block ${
                          !item.isRead
                            ? "font-semibold text-kumo-strong"
                            : "font-normal text-kumo-subtle"
                        }`}
                      >
                        {item.fromName || item.fromAddress}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Subject Line + Snippet + Attachments */}
                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5 truncate text-xs">
                    <span
                      className={`truncate shrink-0 max-w-[280px] sm:max-w-[380px] md:max-w-[460px] ${
                        !item.isRead
                          ? "font-semibold text-kumo-strong"
                          : "font-normal text-kumo-default"
                      }`}
                    >
                      {item.subject}
                    </span>

                    <span
                      className={`hidden sm:inline truncate ${
                        !item.isRead
                          ? "font-normal text-kumo-subtle"
                          : "font-normal text-kumo-subtle/80"
                      }`}
                    >
                      — {item.snippet || item.textBody?.slice(0, 100)}
                    </span>

                    {/* Attachment icon */}
                    {item.attachments && item.attachments.length > 0 && (
                      <span title={`${item.attachments.length} attachment(s)`} className="inline-flex">
                        <Paperclip
                          size={13}
                          className="text-kumo-subtle shrink-0 ml-1 inline-block"
                        />
                      </span>
                    )}
                  </div>

                  {/* Right: Timestamp OR Quick Hover Actions */}
                  <div className="shrink-0 flex items-center justify-end w-24 text-right">
                    {/* Default Timestamp */}
                    <span
                      className={`group-hover:hidden text-xs ${
                        !item.isRead
                          ? "font-semibold text-kumo-strong"
                          : "font-normal text-kumo-subtle"
                      }`}
                    >
                      {formatTime(item.receivedAt)}
                    </span>

                    {/* Quick Hover Action Buttons */}
                    <div className="hidden group-hover:flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleToggleRead(item.id, e)}
                        className="p-1 rounded text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-control transition-colors"
                        title={item.isRead ? "Mark unread" : "Mark read"}
                      >
                        {item.isRead ? <EnvelopeSimple size={15} /> : <EnvelopeOpen size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteMessage(item.id, e)}
                        className="p-1 rounded text-kumo-subtle hover:text-kumo-danger hover:bg-kumo-danger-tint transition-colors"
                        title="Delete message"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      {mailbox && (
        <ComposeEmailModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          mailboxes={[mailbox]}
          defaultMailboxId={mailbox.id}
          onSent={() => fetchMailboxData()}
        />
      )}
    </div>
  );
}
