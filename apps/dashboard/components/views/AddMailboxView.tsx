"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  Plus,
  ArrowsClockwise,
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
        // Fallback
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
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back Button */}
      <div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <CaretLeft size={13} />
          <span>Back to Inboxes</span>
        </Link>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access and cannot create new mailbox aliases." />
      )}

      {/* Main Form Container */}
      <div className="border border-zinc-800/80 rounded-lg p-6 bg-zinc-900/20">
        <div className="border-b border-zinc-800/80 pb-4 mb-5">
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-100 tracking-tight">
            Create Inbound Mailbox
          </h1>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Set up an email address to receive incoming messages and process replies.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1.5">
              Mailbox Address <span className="text-zinc-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                required
                disabled={isViewer}
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value)}
                placeholder="support"
                className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-md px-3 h-10 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono disabled:opacity-60"
              />
              <span className="text-zinc-500 font-mono text-xs">@</span>
              <select
                disabled={isViewer || isLoadingDomains}
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 h-10 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono cursor-pointer disabled:opacity-60"
              >
                {domains.map((dom) => (
                  <option key={dom.id} value={dom.id}>
                    {dom.domainName}
                  </option>
                ))}
                {domains.length === 0 && (
                  <option value="" disabled>No domains found</option>
                )}
              </select>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Inbound address: {localPart.trim() || "alias"}@{activeDomain?.domainName || "example.com"}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1.5">
              Display Name <span className="text-zinc-500 text-2xs font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              disabled={isViewer}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Customer Support"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 h-10 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 disabled:opacity-60"
            />
          </div>

          {/* Catch-all toggle */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="catchAll"
              disabled={isViewer}
              checked={isCatchAll}
              onChange={(e) => setIsCatchAll(e.target.checked)}
              className="mt-0.5 rounded border-zinc-800 text-zinc-100 bg-zinc-900 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="catchAll" className="text-xs text-zinc-300 cursor-pointer select-none">
              <span className="font-medium block">Catch-all route</span>
              <span className="text-2xs text-zinc-500 block">
                Receive emails sent to any unassigned alias on this domain.
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2.5">
            <Link
              href="/inbox"
              className="btn-cf-secondary text-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isViewer || !localPart.trim() || !selectedDomainId}
              className="btn-cf-primary text-xs"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus size={13} weight="bold" />
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
