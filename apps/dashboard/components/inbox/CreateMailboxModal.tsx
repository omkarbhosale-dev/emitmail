"use client";

import React, { useState } from "react";
import { X, Plus, Tray, ArrowsClockwise, Globe, Sparkle } from "@phosphor-icons/react";
import { InboundDomainItem, MailboxItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

interface CreateMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: InboundDomainItem[];
  onMailboxCreated: (mailbox: MailboxItem) => void;
}

export function CreateMailboxModal({
  isOpen,
  onClose,
  domains,
  onMailboxCreated,
}: CreateMailboxModalProps) {
  const { toast } = useToast();
  const [selectedDomainId, setSelectedDomainId] = useState<string>(
    domains[0]?.id || ""
  );
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCatchAll, setIsCatchAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeDomain = domains.find((d) => d.id === selectedDomainId) || domains[0];
  const fullAddressPreview = `${localPart.trim().toLowerCase() || "alias"}@${
    activeDomain?.domainName || "example.com"
  }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPart.trim()) {
      setError("Please enter a mailbox alias / local part");
      return;
    }
    if (!selectedDomainId) {
      setError("Please select a verified domain");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.inbox.createMailbox({
        domainId: selectedDomainId,
        localPart: localPart.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        isCatchAll,
      });

      toast({
        title: "Mailbox Created",
        description: `Active mailbox ready at ${created.emailAddress}`,
        type: "success",
      });

      onMailboxCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create mailbox";
      setError(msg);
      toast({
        title: "Creation Failed",
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
      <div className="relative w-full max-w-md bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline bg-kumo-elevated">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                <Tray size={18} weight="bold" />
              </div>
              <h3 className="text-sm font-semibold text-kumo-strong">
                Create Inbound Mailbox
              </h3>
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

          {/* Form Body */}
          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs">
                {error}
              </div>
            )}

            {/* 1. Domain Selector */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Verified Domain
              </label>
              {domains.length === 0 ? (
                <div className="p-3 rounded-lg bg-kumo-recessed border border-kumo-hairline text-xs text-kumo-subtle">
                  No verified domains found. Please verify a domain first under <span className="font-semibold text-kumo-strong">Domains</span>.
                </div>
              ) : (
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange cursor-pointer"
                >
                  {domains.map((dom) => (
                    <option key={dom.id} value={dom.id}>
                      {dom.domainName} {dom.inboundMxVerified ? "(MX Active)" : "(MX Pending)"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Alias / Local Part */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Mailbox Alias (Local Part)
              </label>
              <div className="flex items-center bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 focus-within:border-cf-orange">
                <input
                  type="text"
                  required
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
                  placeholder="support, billing, contact, hello"
                  className="w-full bg-transparent border-0 outline-none text-xs text-kumo-strong placeholder:text-kumo-muted font-mono"
                />
                <span className="text-xs text-kumo-subtle font-mono select-none shrink-0 pl-1">
                  @{activeDomain?.domainName || "domain.com"}
                </span>
              </div>
              <p className="text-[11px] text-kumo-subtle mt-1">
                Enter letters, numbers, dots, or hyphens.
              </p>
            </div>

            {/* 3. Display Name */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Display Name <span className="text-kumo-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. EmitMail Support or Billing Desk"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange"
              />
            </div>

            {/* 4. Live Address Preview Callout */}
            <div className="p-3.5 rounded-xl bg-kumo-recessed border border-kumo-hairline flex items-center justify-between">
              <div>
                <span className="text-[11px] text-kumo-subtle block">Full Inbound Address:</span>
                <span className="text-xs font-mono font-semibold text-cf-orange block mt-0.5 select-all">
                  {fullAddressPreview}
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cf-orange-tint text-cf-orange border border-cf-orange-border/30">
                Live Inbound
              </span>
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
              disabled={isSubmitting || !localPart.trim() || domains.length === 0}
              className="px-4 py-2 rounded-lg bg-cf-orange hover:bg-cf-orange-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus size={14} weight="bold" />
                  <span>Create Mailbox</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
