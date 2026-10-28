"use client";

import React, { useState } from "react";
import { X, PaperPlaneTilt, ArrowsClockwise } from "@phosphor-icons/react";
import { MailboxItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailboxes: MailboxItem[];
  defaultMailboxId?: string;
  onSent?: () => void;
}

export function ComposeEmailModal({
  isOpen,
  onClose,
  mailboxes,
  defaultMailboxId,
  onSent,
}: ComposeEmailModalProps) {
  const { toast } = useToast();
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>(
    defaultMailboxId || mailboxes[0]?.id || ""
  );
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeMailbox = mailboxes.find((m) => m.id === selectedMailboxId) || mailboxes[0];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMailboxId) {
      setError("Please select a sender mailbox");
      return;
    }
    if (!to.trim()) {
      setError("Please enter a recipient email address");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter an email subject");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.inbox.sendMailbox(selectedMailboxId, {
        to: to.trim(),
        subject: subject.trim(),
        html: body.trim(),
        text: body.trim(),
      });

      toast({
        title: "Email Dispatched",
        description: `Message queued for delivery from ${activeMailbox?.emailAddress}`,
        type: "success",
      });

      if (onSent) onSent();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch email";
      setError(msg);
      toast({
        title: "Delivery Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <form onSubmit={handleSend}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline bg-kumo-elevated">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                <PaperPlaneTilt size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-strong">
                  Compose Email
                </h3>
                <span className="text-[11px] text-kumo-subtle">
                  Send transactional or reply email from custom domain
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs">
                {error}
              </div>
            )}

            {/* From (Sender Mailbox) */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                From (Mailbox)
              </label>
              <select
                value={selectedMailboxId}
                onChange={(e) => setSelectedMailboxId(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange cursor-pointer font-mono"
              >
                {mailboxes.map((mb) => (
                  <option key={mb.id} value={mb.id}>
                    {mb.displayName ? `${mb.displayName} <${mb.emailAddress}>` : mb.emailAddress}
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                To (Recipient)
              </label>
              <input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange font-mono"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important account update, confirmation, etc."
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange font-medium"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Message Body
              </label>
              <textarea
                required
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body here (HTML or plain text supported)..."
                className="w-full bg-kumo-control border border-kumo-line rounded-lg p-3 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange leading-relaxed"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-kumo-elevated border-t border-kumo-hairline flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-cf-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !to.trim() || !subject.trim()}
              className="px-4 py-2 rounded-lg bg-cf-orange hover:bg-cf-orange-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={14} weight="bold" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
