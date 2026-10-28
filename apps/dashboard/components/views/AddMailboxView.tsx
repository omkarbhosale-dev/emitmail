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
import { api } from "@/lib/api";

const INITIAL_FALLBACK_DOMAINS: InboundDomainItem[] = [
  {
    id: "dom_omkar",
    domainName: "omkarbhosale.dev",
    inboundEnabled: true,
    inboundMxVerified: false,
    createdAt: "2026-10-28T10:00:00.000Z",
    requiredMxRecord: {
      type: "MX",
      host: "@",
      value: "mail.omkarbhosale.dev",
      priority: 10,
      ttl: "Auto",
      status: "PENDING",
    },
  },
];

export function AddMailboxView() {
  const router = useRouter();
  const { toast } = useToast();

  const [domains, setDomains] = useState<InboundDomainItem[]>(INITIAL_FALLBACK_DOMAINS);
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
        } else if (isMounted) {
          setSelectedDomainId(INITIAL_FALLBACK_DOMAINS[0].id);
        }
      } catch {
        if (isMounted) {
          setSelectedDomainId(INITIAL_FALLBACK_DOMAINS[0].id);
        }
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
      const created = await api.inbox.createMailbox({
        domainId: selectedDomainId,
        localPart: cleanAlias,
        displayName: displayName.trim() || undefined,
        isCatchAll,
      });

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
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-kumo-subtle">
        <Link
          href="/inbox"
          className="hover:text-kumo-strong transition-colors flex items-center gap-1.5"
        >
          <CaretLeft size={14} />
          <span>Inbox</span>
        </Link>
        <span>/</span>
        <span className="text-kumo-strong font-medium">Add Mailbox</span>
      </div>

      {/* Page Header */}
      <div className="border-b border-kumo-hairline pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cf-orange/10 border border-cf-orange/20 flex items-center justify-center text-cf-orange">
            <Tray size={20} weight="bold" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
              Create Inbound Mailbox
            </h1>
            <p className="text-xs text-kumo-subtle mt-0.5">
              Create a custom mailbox alias (e.g., support@yourdomain.com) to receive emails directly in EmitMail.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl p-6 sm:p-7 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs flex items-center gap-2">
              <WarningCircle size={16} weight="bold" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Verified Domain Selector */}
          <div>
            <label className="block text-xs font-semibold text-kumo-strong mb-1.5">
              Domain
            </label>
            {isLoadingDomains ? (
              <div className="h-9 bg-kumo-control border border-kumo-line rounded-lg animate-pulse" />
            ) : domains.length === 0 ? (
              <div className="p-3 rounded-lg bg-kumo-control border border-kumo-line text-xs text-kumo-subtle">
                No sending domains found. Please register and verify a domain first under{" "}
                <Link href="/domains/add" className="text-cf-blue underline font-semibold">
                  Domains
                </Link>.
              </div>
            ) : (
              <select
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer font-mono"
              >
                {domains.map((dom) => (
                  <option key={dom.id} value={dom.id}>
                    {dom.domainName} {dom.inboundMxVerified ? "(MX Verified)" : "(MX Pending)"}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-kumo-subtle mt-1">
              Select the authenticated domain on which this mailbox will reside.
            </p>
          </div>

          {/* 2. Mailbox Alias / Local Part */}
          <div>
            <label className="block text-xs font-semibold text-kumo-strong mb-1.5">
              Mailbox Alias (Local Part)
            </label>
            <div className="flex items-center bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 focus-within:border-cf-blue">
              <input
                type="text"
                required
                value={localPart}
                onChange={(e) =>
                  setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))
                }
                placeholder="support, billing, contact, hello"
                className="w-full bg-transparent border-0 outline-none text-xs text-kumo-strong placeholder:text-kumo-muted font-mono"
              />
              <span className="text-xs text-kumo-subtle font-mono select-none shrink-0 pl-1">
                @{activeDomain?.domainName || "domain.com"}
              </span>
            </div>
            <p className="text-[11px] text-kumo-subtle mt-1">
              Enter letters, numbers, periods, or hyphens.
            </p>
          </div>

          {/* 3. Display Name */}
          <div>
            <label className="block text-xs font-semibold text-kumo-strong mb-1.5">
              Display Name <span className="text-kumo-muted font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. EmitMail Support or Billing Desk"
              className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
            />
            <p className="text-[11px] text-kumo-subtle mt-1">
              Shown to recipients when replying to incoming messages from this mailbox.
            </p>
          </div>

          {/* 4. Live Address Preview Callout */}
          <div className="p-4 rounded-xl bg-kumo-control border border-kumo-line flex items-center justify-between">
            <div>
              <span className="text-[11px] text-kumo-subtle block font-sans">Full Inbound Address:</span>
              <span className="text-sm font-mono font-bold text-cf-orange block mt-0.5 select-all">
                {fullAddressPreview}
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cf-orange-tint text-cf-orange border border-cf-orange-border/30">
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
              disabled={isSubmitting || !localPart.trim() || domains.length === 0}
              className="btn-cf-primary flex items-center gap-1.5 text-xs"
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
