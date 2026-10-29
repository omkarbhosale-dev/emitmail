"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  ArrowBendUpLeft,
  Code,
  Paperclip,
  WarningCircle,
  ArrowsClockwise,
  PaperPlaneTilt,
  TextB,
  TextItalic,
  Link as LinkIcon,
  CodeSimple,
  DownloadSimple,
} from "@phosphor-icons/react";
import { InboundEmailItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { EmailHtmlRenderer } from "@/components/inbox/EmailHtmlRenderer";
import { RawHeadersModal } from "@/components/inbox/RawHeadersModal";

interface InboxMessageDetailViewProps {
  messageId: string;
  mailboxId?: string;
}

export function InboxMessageDetailView({ messageId, mailboxId }: InboxMessageDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [message, setMessage] = useState<InboundEmailItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<InboundEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showRawHeaders, setShowRawHeaders] = useState(false);
  const [showMetadataPopover, setShowMetadataPopover] = useState(false);
  const replyBoxRef = useRef<HTMLTextAreaElement>(null);

  const backHref = mailboxId ? `/inbox/${mailboxId}` : "/inbox";

  const fetchMessage = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.inbox.getMessage(messageId);
      setMessage(data.message);
      setThreadMessages(data.thread || [data.message]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load message";
      toast({
        title: "Message Not Found",
        description: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [messageId, toast]);

  useEffect(() => {
    fetchMessage();
  }, [fetchMessage]);

  const handleFocusReply = () => {
    replyBoxRef.current?.scrollIntoView({ behavior: "smooth" });
    replyBoxRef.current?.focus();
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const result = await api.inbox.replyMessage(message.id, {
        html: replyText.trim(),
        text: replyText.trim(),
      });

      if (result.reply) {
        setThreadMessages((prev) => [...prev, result.reply]);
      }
      setReplyText("");
      await fetchMessage();
      toast({
        title: "Reply Sent",
        description: `Dispatched reply to ${message.fromAddress}`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reply";
      toast({ title: "Reply Failed", description: msg, type: "error" });
    } finally {
      setIsSendingReply(false);
    }
  };

  const insertFormatting = (tag: string) => {
    const el = replyBoxRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = replyText.substring(start, end);
    let replacement = "";
    if (tag === "bold") replacement = `**${selected || "text"}**`;
    if (tag === "italic") replacement = `*${selected || "text"}*`;
    if (tag === "code") replacement = `\`${selected || "code"}\``;
    if (tag === "link") replacement = `[${selected || "link text"}](https://)`;

    const updated = replyText.substring(0, start) + replacement + replyText.substring(end);
    setReplyText(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-kumo-line rounded animate-pulse" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger mx-auto flex items-center justify-center">
          <WarningCircle size={28} weight="fill" />
        </div>
        <h2 className="text-xl font-bold text-kumo-strong">Email Not Found</h2>
        <p className="text-xs text-kumo-subtle">
          This message could not be retrieved or has been deleted.
        </p>
        <div className="pt-2">
          <Link href={backHref} className="btn-cf-secondary text-xs">
            &larr; Back to {mailboxId ? "Mailbox" : "Inbox"}
          </Link>
        </div>
      </div>
    );
  }

  const formatAddress = (addr: unknown): string => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      const obj = addr as { address?: string; name?: string };
      return obj.name ? `${obj.name} <${obj.address}>` : (obj.address || "");
    }
    return String(addr);
  };

  const senderInitials = (message.fromName || message.fromAddress)
    .slice(0, 2)
    .toUpperCase();

  const recipientMailboxAddress =
    message.mailbox?.emailAddress ||
    (Array.isArray(message.toAddresses) ? formatAddress(message.toAddresses[0]) : "mailbox");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-kumo-subtle">
        <Link
          href="/inbox"
          className="hover:text-kumo-strong transition-colors flex items-center gap-1.5"
        >
          <CaretLeft size={14} />
          <span>Inbox</span>
        </Link>
        <span>/</span>
        {mailboxId && (
          <>
            <Link
              href={`/inbox/${mailboxId}`}
              className="hover:text-kumo-strong transition-colors font-mono truncate max-w-[200px]"
            >
              {recipientMailboxAddress}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-kumo-strong font-medium truncate max-w-sm">{message.subject}</span>
      </div>

      {/* 4.1 Action Bar */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
        <Link
          href={backHref}
          className="btn-cf-secondary text-xs flex items-center gap-1.5"
        >
          <CaretLeft size={14} weight="bold" />
          <span>Back to {mailboxId ? "Mailbox" : "Inbox"}</span>
        </Link>

        {/* Action Buttons Cluster */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFocusReply}
            className="btn-cf-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowBendUpLeft size={14} weight="bold" />
            <span>Reply</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRawHeaders(true)}
            className="btn-cf-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            title="View RFC headers and MIME diagnostics"
          >
            <Code size={14} />
            <span className="hidden sm:inline">Raw Headers</span>
          </button>
        </div>
      </div>

      {/* 4.2 Email Subject & Thread Metadata Header */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl p-6 shadow-2xs space-y-4">
        {/* Subject Title */}
        <div className="border-b border-kumo-hairline pb-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong leading-snug">
            {message.subject}
          </h1>
        </div>

        {/* Sender Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-cf-orange/15 border border-cf-orange/20 text-cf-orange font-semibold flex items-center justify-center text-sm shrink-0">
              {senderInitials}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-kumo-strong">
                  {message.fromName || message.fromAddress}
                </span>
                <span className="font-mono text-xs text-kumo-subtle">
                  &lt;{message.fromAddress}&gt;
                </span>
              </div>
              <div className="text-[11px] text-kumo-subtle mt-0.5 flex items-center gap-2">
                <span>
                  to{" "}
                  {Array.isArray(message.toAddresses)
                    ? message.toAddresses.map(formatAddress).filter(Boolean).join(", ")
                    : formatAddress(message.toAddresses)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMetadataPopover(!showMetadataPopover)}
                  className="text-cf-orange hover:underline cursor-pointer font-medium"
                >
                  {showMetadataPopover ? "Hide Details" : "Details"}
                </button>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-kumo-subtle shrink-0">
            <span>{new Date(message.receivedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Expandable RFC Metadata Popover */}
        {showMetadataPopover && (
          <div className="p-4 rounded-xl bg-kumo-recessed border border-kumo-line text-xs space-y-2 animate-in fade-in duration-100">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-kumo-subtle font-medium">Message-ID:</span>
              <span className="sm:col-span-3 font-mono text-kumo-strong select-all break-all">
                {message.messageId}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-kumo-subtle font-medium">Thread-ID:</span>
              <span className="sm:col-span-3 font-mono text-kumo-strong select-all">
                {message.threadId}
              </span>
            </div>
            {message.replyTo && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <span className="text-kumo-subtle font-medium">Reply-To:</span>
                <span className="sm:col-span-3 font-mono text-kumo-strong select-all">
                  {message.replyTo}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-kumo-subtle font-medium">Size:</span>
              <span className="sm:col-span-3 font-mono text-kumo-strong">
                {(message.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4.5 Inline Conversation Thread History (if multiple messages exist in thread) */}
      {threadMessages.length > 1 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-kumo-subtle px-1 flex items-center gap-1.5">
            <span>Conversation Thread ({threadMessages.length} messages)</span>
          </div>

          <div className="space-y-3">
            {threadMessages.map((tMsg) => {
              if (tMsg.id === message.id) return null;
              const isOutbound = tMsg.direction === "OUTBOUND_REPLY";

              return (
                <div
                  key={tMsg.id}
                  className={`p-4 rounded-xl border ${
                    isOutbound
                      ? "bg-kumo-elevated border-cf-orange-border/30"
                      : "bg-kumo-base border-kumo-hairline"
                  } space-y-2 text-xs`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          isOutbound ? "text-cf-orange" : "text-kumo-strong"
                        }`}
                      >
                        {isOutbound ? "You (Outbound Reply)" : tMsg.fromName || tMsg.fromAddress}
                      </span>
                      <span className="text-kumo-subtle font-mono">
                        {new Date(tMsg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-kumo-recessed text-kumo-subtle border border-kumo-hairline">
                      {isOutbound ? "Sent" : "Inbound"}
                    </span>
                  </div>

                  <p className="text-kumo-default whitespace-pre-wrap leading-relaxed">
                    {tMsg.snippet || tMsg.textBody?.slice(0, 200)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4.3 Safe, Isolated HTML Email Body Renderer */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl p-6 shadow-2xs space-y-4">
        <EmailHtmlRenderer html={message.htmlBody} text={message.textBody} />

        {/* 4.4 Attachments Bar (if attachments exist) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="pt-4 border-t border-kumo-hairline space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-kumo-strong">
              <Paperclip size={14} className="text-kumo-subtle" />
              <span>Attachments ({message.attachments.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {message.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-kumo-control border border-kumo-line flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-kumo-strong block truncate">
                      {att.filename}
                    </span>
                    <span className="text-[11px] text-kumo-subtle block font-mono">
                      {(att.sizeBytes / 1024).toFixed(1)} KB • {att.contentType}
                    </span>
                  </div>

                  <a
                    href={att.url || att.path || "#"}
                    download={att.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-tint"
                    title="Download attachment"
                  >
                    <DownloadSimple size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4.5 Inline Conversation Thread Reply Composer */}
      <div className="bg-kumo-base border border-kumo-line rounded-2xl p-5 shadow-2xs focus-within:border-[#0066FF] transition-colors">
        <form onSubmit={handleSendReply} className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-kumo-hairline pb-3">
            <div className="text-xs">
              <span className="text-kumo-subtle">Replying as </span>
              <strong className="text-kumo-strong font-mono">
                {recipientMailboxAddress}
              </strong>
              <span className="text-kumo-subtle"> to </span>
              <strong className="text-kumo-strong font-mono">
                {message.fromAddress}
              </strong>
            </div>

            <span className="text-xs font-semibold text-[#0066FF] font-mono">
              Re: {message.subject.replace(/^Re:\s*/i, "")}
            </span>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 text-kumo-subtle pb-1">
            <button
              type="button"
              onClick={() => insertFormatting("bold")}
              className="p-1.5 rounded hover:bg-kumo-tint hover:text-kumo-strong cursor-pointer"
              title="Bold"
            >
              <TextB size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("italic")}
              className="p-1.5 rounded hover:bg-kumo-tint hover:text-kumo-strong cursor-pointer"
              title="Italic"
            >
              <TextItalic size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("code")}
              className="p-1.5 rounded hover:bg-kumo-tint hover:text-kumo-strong cursor-pointer"
              title="Code"
            >
              <CodeSimple size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("link")}
              className="p-1.5 rounded hover:bg-kumo-tint hover:text-kumo-strong cursor-pointer"
              title="Link"
            >
              <LinkIcon size={15} />
            </button>
          </div>

          {/* Reply Textarea */}
          <textarea
            ref={replyBoxRef}
            required
            rows={5}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply here..."
            className="w-full bg-kumo-control border border-kumo-line rounded-xl p-3.5 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-[#0066FF] leading-relaxed min-h-[140px]"
          />

          {/* Send Bottom Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-kumo-subtle">
              Your reply will be cryptographically signed with 2048-bit DKIM.
            </span>

            <button
              type="submit"
              disabled={isSendingReply || !replyText.trim()}
              className="btn-cf-primary text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSendingReply ? (
                <>
                  <ArrowsClockwise size={14} className="animate-spin" />
                  <span>Sending Reply...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={14} weight="bold" />
                  <span>Send Reply</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Raw Headers Modal */}
      <RawHeadersModal
        isOpen={showRawHeaders}
        onClose={() => setShowRawHeaders(false)}
        headers={message.rawHeaders}
        messageId={message.id}
      />
    </div>
  );
}
