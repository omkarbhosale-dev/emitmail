"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowsClockwise,
  Trash,
  Check,
  Copy,
  CheckCircle,
  WarningCircle,
  Clock,
  FileCode,
  CaretDown,
} from "@phosphor-icons/react";
import { ApiDomain } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

interface DomainDetailsViewProps {
  domainId: string;
}

export function DomainDetailsView({ domainId }: DomainDetailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [domain, setDomain] = useState<ApiDomain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDnsCollapsed, setIsDnsCollapsed] = useState(false);

  const fetchDomain = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.domains.getById(domainId);
      setDomain(data);

      // Auto-collapse DNS records if domain is completely verified
      const verified =
        data.status === "VERIFIED" ||
        (data.dkimVerified && data.spfVerified && data.mxVerified && data.dmarcVerified);
      setIsDnsCollapsed(verified);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load domain details";
      setError(msg);
      toast({
        title: "Domain Not Found",
        description: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [domainId, toast]);

  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({
      title: "Copied to Clipboard",
      description: label,
      type: "success",
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerifyDns = async () => {
    if (!domain) return;
    setIsVerifying(true);
    try {
      const result = await api.domains.verify(domain.id);
      setDomain(result.domain);
      const summary = result.verificationSummary;
      const allPassed =
        summary.dkimVerified &&
        summary.spfVerified &&
        summary.mxVerified &&
        summary.dmarcVerified;

      // If all passed, collapse records
      if (allPassed) {
        setIsDnsCollapsed(true);
      }

      toast({
        title: allPassed ? "Domain Fully Verified (10/10 Score)" : "DNS Verification Updated",
        description: allPassed
          ? "DKIM, SPF, MX, and DMARC are all verified and active."
          : `DKIM: ${summary.dkimVerified ? "✓" : "✗"} • SPF: ${summary.spfVerified ? "✓" : "✗"} • MX: ${summary.mxVerified ? "✓" : "✗"} • DMARC: ${summary.dmarcVerified ? "✓" : "✗"}`,
        type: allPassed ? "success" : "warning",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast({
        title: "Verification Request Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!domain) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${domain.domainName}"? This will revoke DKIM keys and disable outbound email sending for this domain.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await api.domains.delete(domain.id);
      toast({
        title: "Domain Deleted",
        description: `Successfully deleted ${domain.domainName}.`,
        type: "info",
      });
      router.push("/domains");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete domain";
      toast({
        title: "Delete Failed",
        description: msg,
        type: "error",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-kumo-line rounded animate-pulse" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger mx-auto flex items-center justify-center">
          <WarningCircle size={28} weight="fill" />
        </div>
        <h2 className="text-xl font-bold text-kumo-strong">Domain Not Found</h2>
        <p className="text-xs text-kumo-subtle">
          {error || "The requested sending domain could not be loaded or has been deleted."}
        </p>
        <div className="pt-2">
          <Link href="/domains" className="btn-cf-secondary text-xs">
            &larr; Back to Domains
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = domain.status === "VERIFIED";
  const isFullyVerified =
    domain.status === "VERIFIED" ||
    (domain.dkimVerified && domain.spfVerified && domain.mxVerified && domain.dmarcVerified);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-kumo-subtle">
        <Link
          href="/domains"
          className="hover:text-kumo-strong transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>Domains</span>
        </Link>
        <span>/</span>
        <span className="text-kumo-strong font-medium">{domain.domainName}</span>
      </div>

      {/* Domain Header Card */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-kumo-strong">
                {domain.domainName}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isFullyVerified
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : domain.status === "FAILED"
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFullyVerified
                      ? "bg-emerald-400"
                      : domain.status === "FAILED"
                      ? "bg-rose-400"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                {isFullyVerified
                  ? "Verified & Ready"
                  : domain.status === "FAILED"
                  ? "DNS Verification Failed"
                  : "Pending DNS Propagation"}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-kumo-subtle flex-wrap">
              <span>
                Selector: <strong className="text-kumo-strong font-mono">{domain.dkimSelector}</strong>
              </span>
              <span>•</span>
              <span>
                Return-Path: <strong className="text-kumo-strong font-mono">{domain.returnPathSubdomain}.{domain.domainName}</strong>
              </span>
              <span>•</span>
              <span>
                Added on: <span className="text-kumo-strong">{new Date(domain.createdAt).toLocaleDateString()}</span>
              </span>
              {domain.lastVerifiedAt && (
                <>
                  <span>•</span>
                  <span>
                    Last checked: <span className="text-kumo-strong">{new Date(domain.lastVerifiedAt).toLocaleTimeString()}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleVerifyDns}
              disabled={isVerifying}
              className="btn-cf-primary text-xs flex items-center gap-1.5"
            >
              <ArrowsClockwise
                size={14}
                className={isVerifying ? "animate-spin" : ""}
              />
              <span>{isVerifying ? "Verifying DNS..." : "Verify DNS Now"}</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteDomain}
              disabled={isDeleting}
              className="btn-cf-secondary text-xs text-kumo-danger hover:bg-kumo-danger-tint hover:border-kumo-danger/40 flex items-center gap-1.5"
              title="Delete Domain"
            >
              <Trash size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* DNS Configuration Table with Auto-Collapse for Verified Domains */}
      <div className="bg-kumo-base border border-kumo-hairline rounded-2xl overflow-hidden shadow-sm">
        {/* Clickable Header for Collapsing / Expanding */}
        <div
          onClick={() => setIsDnsCollapsed(!isDnsCollapsed)}
          className="px-6 py-4.5 border-b border-kumo-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-kumo-tint/40 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
              <FileCode size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm font-bold text-kumo-strong">
                  DNS Configuration Records ({domain.dnsRecords?.length || 0})
                </h2>
                {isFullyVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle size={12} weight="fill" />
                    <span>All Records Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <Clock size={12} />
                    <span>Awaiting DNS Publication</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-kumo-subtle mt-0.5">
                {isDnsCollapsed
                  ? "All records are active and validated on authoritative nameservers. Click to view configuration details."
                  : "Add these exact records to your DNS provider (Cloudflare, AWS Route53, Namecheap, GoDaddy)."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDnsCollapsed(!isDnsCollapsed);
              }}
              className="btn-cf-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
            >
              <span>{isDnsCollapsed ? "Show Records" : "Collapse"}</span>
              <CaretDown
                size={14}
                className={`transition-transform duration-200 ${isDnsCollapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>
        </div>

        {/* DNS Records List Body (Collapsible) */}
        {!isDnsCollapsed && (
          <div className="p-6 space-y-4 animate-in fade-in duration-150">
            {domain.dnsRecords && domain.dnsRecords.length > 0 ? (
              domain.dnsRecords.map((rec, index) => {
                const isRecordVerified = rec.status === "VERIFIED";
                const hostLabel = rec.host || rec.fqdn;
                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-kumo-control border border-kumo-hairline space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-cf-blue/15 text-cf-blue text-xs font-mono font-semibold border border-cf-blue/25">
                          {rec.type} {rec.priority !== undefined ? `(Priority ${rec.priority})` : ""}
                        </span>
                        <span className="text-xs text-kumo-subtle">Name / Host:</span>
                        <span className="font-mono text-kumo-strong text-xs font-semibold px-2 py-0.5 rounded bg-kumo-base border border-kumo-hairline">
                          {hostLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            isRecordVerified
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          }`}
                        >
                          {isRecordVerified ? "Verified" : "Pending DNS"}
                        </span>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(hostLabel, `${rec.type} Host Name`)}
                          className="btn-cf-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                        >
                          <Copy size={13} />
                          <span>Copy Host</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-kumo-subtle font-medium">Value / Content:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(rec.value, `${rec.type} Record Value`)}
                          className="btn-cf-secondary text-xs py-0.5 px-2 flex items-center gap-1"
                        >
                          {copiedKey === `${rec.type} Record Value` ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{copiedKey === `${rec.type} Record Value` ? "Copied" : "Copy Value"}</span>
                        </button>
                      </div>

                      <div className="font-mono text-xs bg-kumo-base p-3 rounded-lg border border-kumo-line text-kumo-strong break-all select-all leading-relaxed">
                        {rec.value}
                      </div>
                    </div>

                    {rec.reason && (
                      <div className="text-[11px] text-kumo-subtle flex items-center gap-1.5 pt-1">
                        <span className="text-kumo-muted">Status Note:</span>
                        <span className="italic">{rec.reason}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-kumo-subtle text-xs">
                No DNS records generated for this domain.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
