"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  ArrowBendUpLeft,
  Code,
  WarningCircle,
  PaperPlaneTilt,
  Copy,
} from "@phosphor-icons/react";
import { InboundEmailItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";
import { EmailHtmlRenderer } from "@/components/inbox/EmailHtmlRenderer";

interface InboxMessageDetailViewProps {
  messageId: string;
  mailboxId?: string;
}

export function InboxMessageDetailView({ messageId, mailboxId }: InboxMessageDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [message, setMessage] = useState<InboundEmailItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<InboundEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState<"html" | "text" | "raw">("html");
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
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to send replies.",
        type: "warning",
      });
      return;
    }
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
        title: "Reply Dispatched",
        description: `Delivered reply to ${message.fromAddress}`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reply";
      toast({ title: "Reply Failed", description: msg, type: "error" });
    } finally {
      setIsSendingReply(false);
    }
  };

  const copyRawToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Raw headers / payload copied.",
      type: "success",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <WarningCircle size={24} weight="fill" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Email Not Found</h2>
        <p className="text-xs text-zinc-400">
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

  const toList = Array.isArray(message.toAddresses)
    ? message.toAddresses.map(formatAddress).filter(Boolean).join(", ")
    : formatAddress(message.toAddresses);

  const rawHeadersString =
    typeof message.rawHeaders === "string"
      ? message.rawHeaders
      : message.rawHeaders
      ? JSON.stringify(message.rawHeaders, null, 2)
      : JSON.stringify(message, null, 2);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="border-b border-zinc-800/80 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0">
          <Link
            href="/inbox"
            className="hover:text-zinc-200 transition-colors flex items-center gap-1 shrink-0"
          >
            <CaretLeft size={13} />
            <span>Inbox</span>
          </Link>
          <span>/</span>
          {mailboxId && (
            <>
              <Link
                href={`/inbox/${mailboxId}`}
                className="hover:text-zinc-200 transition-colors font-mono truncate"
              >
                {message.mailbox?.emailAddress || "mailbox"}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-zinc-200 font-medium truncate">{message.subject}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={backHref}
            className="btn-cf-secondary text-xs"
          >
            &larr; Back
          </Link>
          {!isViewer && (
            <button
              type="button"
              onClick={handleFocusReply}
              className="btn-cf-primary text-xs"
            >
              <ArrowBendUpLeft size={13} weight="bold" />
              <span>Reply</span>
            </button>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access and cannot dispatch replies." />
      )}

      {/* Top Metadata Header Bar */}
      <div className="border border-zinc-800/80 rounded-lg p-5 bg-zinc-900/30 space-y-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">
          {message.subject || "(No subject)"}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-3 border-t border-zinc-800/60">
          <div>
            <span className="text-xs text-zinc-400 font-medium block mb-0.5">From</span>
            <span className="font-mono text-zinc-200 truncate block font-medium" title={message.fromAddress}>
              {message.fromName ? `${message.fromName} <${message.fromAddress}>` : message.fromAddress}
            </span>
          </div>

          <div>
            <span className="text-xs text-zinc-400 font-medium block mb-0.5">To</span>
            <span className="font-mono text-zinc-200 truncate block" title={toList}>
              {toList || message.mailbox?.emailAddress}
            </span>
          </div>

          <div>
            <span className="text-xs text-zinc-400 font-medium block mb-0.5">Received</span>
            <span className="font-mono text-zinc-300 tabular-nums block">
              {new Date(message.receivedAt).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-xs text-zinc-400 font-medium block mb-0.5">Message ID</span>
            <span className="font-mono text-xs text-zinc-400 truncate block select-all" title={message.messageId}>
              {message.messageId}
            </span>
          </div>
        </div>
      </div>

      {/* Developer-Grade View Toggle Tabs (Rendered HTML | Plain Text | Raw Headers) */}
      <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/20">
        <div className="px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab("html")}
              className={`px-3 py-1 text-2xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === "html"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Rendered HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1 text-2xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === "text"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Plain Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1 text-2xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === "raw"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Raw Headers / Payload
            </button>
          </div>

          {activeTab === "raw" && (
            <button
              type="button"
              onClick={() => copyRawToClipboard(rawHeadersString)}
              className="btn-cf-secondary text-2xs h-7 px-2 flex items-center gap-1"
            >
              <Copy size={11} />
              <span>Copy Raw</span>
            </button>
          )}
        </div>

        <div className="p-5">
          {activeTab === "html" && (
            <EmailHtmlRenderer html={message.htmlBody} text={message.textBody} />
          )}

          {activeTab === "text" && (
            <pre className="font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed select-text">
              {message.textBody || "(No plain text body provided)"}
            </pre>
          )}

          {activeTab === "raw" && (
            <pre className="font-mono text-2xs text-zinc-300 bg-zinc-950 p-4 rounded-md border border-zinc-800/80 overflow-x-auto leading-relaxed select-all">
              {rawHeadersString}
            </pre>
          )}
        </div>
      </div>

      {/* Reply Section */}
      {!isViewer && (
        <div className="border border-zinc-800/80 rounded-lg p-5 bg-zinc-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">
              Reply to {message.fromAddress}
            </span>
            <span className="text-2xs text-zinc-500 font-mono">
              Via: {message.mailbox?.emailAddress || "mailbox"}
            </span>
          </div>

          <form onSubmit={handleSendReply} className="space-y-3">
            <textarea
              ref={replyBoxRef}
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 font-sans leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="btn-cf-primary text-xs"
              >
                <PaperPlaneTilt size={13} weight="bold" />
                <span>{isSendingReply ? "Sending..." : "Send Reply"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
