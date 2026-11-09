"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  Tray,
  Plus,
  ArrowsClockwise,
  WarningCircle,
  Globe,
  CheckCircle,
} from "@phosphor-icons/react";
import { InboundDomainItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

export function AddMailboxView() {
  const router = useRouter();
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [domains, setDomains] = useState<InboundDomainItem[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCatchAll, setIsCatchAll] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDomains = async () => {
      try {
        const list = await api.inbox.listDomains();
        if (isMounted && list && list.length > 0) {
          setDomains(list);
          setSelectedDomainId(list[0].id);
        }
      } catch {
        // Continue with empty domains list
      } finally {
        if (isMounted) setIsLoadingDomains(false);
      }
    };
    loadDomains();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeDomain = domains.find((d) => d.id === selectedDomainId) || domains[0];
  const fullAddressPreview = `${localPart.trim().toLowerCase() || "alias"}@${
    activeDomain?.domainName || "example.com"
  }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members are not permitted to create mailboxes.",
        type: "error",
      });
      return;
    }

    const cleanAlias = localPart.trim().toLowerCase();

    if (!cleanAlias) {
      setErrorMessage("Please enter a mailbox alias / local part");
      return;
    }

    if (!selectedDomainId) {
      setErrorMessage("Please select a domain");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.inbox.createMailbox({
        domainId: selectedDomainId,
        localPart: cleanAlias,
        displayName: displayName.trim() || undefined,
        isCatchAll,
      });

      const created = (res as any)?.mailbox || res;

      toast({
        title: "Mailbox Created",
        description: `Ready to receive emails at ${created.emailAddress}`,
        type: "success",
      });

      router.push(`/inbox/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create mailbox";
      setErrorMessage(msg);
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
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back Button */}
      <div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 text-xs text-kumo-subtle hover:text-kumo-strong transition-colors"
        >
          <CaretLeft size={14} />
          <span>Back to Inboxes</span>
        </Link>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access and cannot create new mailbox aliases." />
      )}

      {/* Main Form Container */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-kumo-hairline bg-kumo-recessed/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
            <Tray size={20} weight="bold" />
          </div>
          <div>
            <h1 className="text-base font-bold text-kumo-strong">
              Create Inbound Mailbox
            </h1>
            <p className="text-xs text-kumo-subtle mt-0.5">
              Create a custom mailbox alias (e.g., support@yourdomain.com) to receive emails directly in EmitMail.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <WarningCircle size={15} weight="fill" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Select Domain */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-kumo-strong flex items-center gap-1.5">
              <Globe size={14} className="text-cf-blue" />
              <span>Select Receiving Domain</span> <span className="text-cf-orange">*</span>
            </label>

            {isLoadingDomains ? (
              <div className="h-9 w-full bg-kumo-control border border-kumo-line rounded-lg animate-pulse" />
            ) : domains.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 flex items-center justify-between">
                <span>No verified domains found. Please configure a domain first.</span>
                <Link href="/domains/add" className="font-semibold underline">
                  Add Domain &rarr;
                </Link>
              </div>
            ) : (
              <select
                disabled={isViewer}
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer disabled:opacity-60"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.domainName} {d.inboundMxVerified ? "✓ (MX Active)" : "(MX Unverified)"}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-kumo-subtle">
              Receives incoming emails directed to this domain via MX records.
            </p>
          </div>

          {/* 2. Mailbox Local Part / Alias */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-kumo-strong">
              Mailbox Alias (Local Part) <span className="text-cf-orange">*</span>
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  disabled={isViewer}
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                  placeholder="support"
                  className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong font-mono focus:outline-none focus:border-cf-blue disabled:opacity-60"
                  required
                />
              </div>

              <span className="text-kumo-muted font-mono text-xs">@</span>

              <div className="w-48 px-3 py-2 bg-kumo-control border border-kumo-line rounded-lg text-xs text-kumo-subtle font-mono truncate select-none">
                {activeDomain?.domainName || "yourdomain.com"}
              </div>
            </div>

            <p className="text-xs text-kumo-subtle">
              Examples: <code className="text-kumo-strong">support</code>, <code className="text-kumo-strong">billing</code>, <code className="text-kumo-strong">contact</code>, <code className="text-kumo-strong">hello</code>.
            </p>
          </div>

          {/* 3. Display Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-kumo-strong">
              Display Name (Optional)
            </label>
            <input
              type="text"
              disabled={isViewer}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. EmitMail Support or Billing Desk"
              className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue disabled:opacity-60"
            />
            <p className="text-xs text-kumo-subtle">
              Friendly sender name displayed on outbound reply threads.
            </p>
          </div>

          {/* Preview Box */}
          <div className="p-4 rounded-xl bg-kumo-control border border-kumo-line flex items-center justify-between">
            <div>
              <span className="text-xs text-kumo-subtle block font-sans">Full Inbound Address:</span>
              <span className="text-sm font-mono font-bold text-cf-blue block mt-0.5 select-all">
                {fullAddressPreview}
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cf-blue/10 text-cf-blue border border-cf-blue/20">
              Inbound Alias
            </span>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-kumo-hairline flex items-center justify-end gap-2.5">
            <Link href="/inbox" className="btn-cf-secondary text-xs">
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !localPart.trim() || domains.length === 0 || isViewer}
              title={isViewer ? "View-only members cannot create mailboxes" : undefined}
              className="btn-cf-primary flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" />
                  <span>Creating Mailbox...</span>
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
