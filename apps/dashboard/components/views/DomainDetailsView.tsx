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
  WarningCircle,
  ArrowUpRight,
  CaretDown,
} from "@phosphor-icons/react";
import { ApiDomain, DnsRecordItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

interface DomainDetailsViewProps {
  domainId: string;
}

export function DomainDetailsView({ domainId }: DomainDetailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [domain, setDomain] = useState<ApiDomain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRotatingDkim, setIsRotatingDkim] = useState(false);
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

      // Auto-collapse if all records are properly configured and verified
      const records = data.dnsRecords || [];
      const verified =
        data.status === "VERIFIED" ||
        (records.length > 0 && records.every((r) => r.status === "VERIFIED")) ||
        (data.dkimVerified && data.spfVerified && data.mxVerified && data.dmarcVerified);
      setIsDnsCollapsed(Boolean(verified));
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
      description: text.length > 50 ? `${text.slice(0, 47)}...` : text,
      type: "success",
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerifyDns = async () => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to verify DNS records.",
        type: "warning",
      });
      return;
    }
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

  const handleRotateDkim = async () => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to rotate DKIM keys.",
        type: "warning",
      });
      return;
    }
    if (!domain) return;
    const confirm = window.confirm(
      `Regenerate a brand-new 2048-bit RSA DKIM key for "${domain.domainName}"?\n\nThis will invalidate the previous key. You must update the DKIM TXT record in your DNS provider (Cloudflare) and click "Verify DNS Now".`
    );
    if (!confirm) return;

    setIsRotatingDkim(true);
    try {
      const res = await api.domains.rotateDkim(domain.id);
      if (res && res.domain) {
        setDomain(res.domain);
        setIsDnsCollapsed(false);
        toast({
          title: "2048-bit DKIM Key Generated",
          description: `New 2048-bit DKIM record created for ${domain.domainName}. Please update the TXT record in Cloudflare and verify.`,
          type: "success",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rotate DKIM key";
      toast({
        title: "DKIM Rotation Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsRotatingDkim(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to delete domains.",
        type: "warning",
      });
      return;
    }
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

  // Calculate status breakdown
  const rawRecords: DnsRecordItem[] = domain.dnsRecords && domain.dnsRecords.length > 0
    ? domain.dnsRecords
    : [
        {
          type: "TXT",
          host: `${domain.dkimSelector}._domainkey`,
          fqdn: `${domain.dkimSelector}._domainkey.${domain.domainName}`,
          value: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
          status: domain.dkimVerified ? "VERIFIED" : "PENDING",
        },
        {
          type: "TXT",
          host: domain.returnPathSubdomain,
          fqdn: `${domain.returnPathSubdomain}.${domain.domainName}`,
          value: `v=spf1 a mx ~all`,
          status: domain.spfVerified ? "VERIFIED" : "PENDING",
        },
        {
          type: "MX",
          host: domain.returnPathSubdomain,
          fqdn: `${domain.returnPathSubdomain}.${domain.domainName}`,
          value: `mail.${domain.domainName}`,
          status: domain.mxVerified ? "VERIFIED" : "PENDING",
        },
        {
          type: "TXT",
          host: "_dmarc",
          fqdn: `_dmarc.${domain.domainName}`,
          value: domain.dmarcPolicy || `v=DMARC1; p=none; rua=mailto:dmarc@${domain.domainName}; aspf=r; adkim=r;`,
          status: domain.dmarcVerified ? "VERIFIED" : "PENDING",
        },
      ];

  const verifiedCount = rawRecords.filter((r) => r.status === "VERIFIED").length;
  const failedCount = rawRecords.filter((r) => r.status === "FAILED").length;
  const isAllVerified = verifiedCount === rawRecords.length || domain.status === "VERIFIED";
  const isPartiallyFailed = verifiedCount > 0 && !isAllVerified;
  const isAllFailed = failedCount === rawRecords.length || (domain.status === "FAILED" && verifiedCount === 0);

  // Group records by section
  const dkimRecords = rawRecords.filter(
    (r) => r.host.includes("_domainkey") || r.fqdn.includes("_domainkey")
  );
  const spfRecords = rawRecords.filter(
    (r) =>
      !r.host.includes("_domainkey") &&
      !r.host.includes("_dmarc") &&
      (r.host === domain.returnPathSubdomain || r.host === "@" || r.value.includes("v=spf1") || r.type === "MX")
  );
  const dmarcRecords = rawRecords.filter(
    (r) => r.host.includes("_dmarc") || r.fqdn.includes("_dmarc")
  );

  const renderDnsTable = (title: string, records: DnsRecordItem[]) => {
    if (records.length === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span>{title}</span>
            <ArrowUpRight size={14} className="text-kumo-subtle" />
            {title === "DKIM" && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cf-orange/15 text-cf-orange border border-cf-orange/30">
                2048-bit RSA
              </span>
            )}
          </div>
          {title === "DKIM" && !isViewer && (
            <button
              type="button"
              onClick={handleRotateDkim}
              disabled={isRotatingDkim || isVerifying}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate a brand-new 2048-bit RSA DKIM key"
            >
              <ArrowsClockwise size={12} className={isRotatingDkim ? "animate-spin text-cf-orange" : ""} />
              <span>{isRotatingDkim ? "Generating..." : "Regenerate 2048-bit Key"}</span>
            </button>
          )}
        </div>

        <div className="bg-kumo-base border border-kumo-line rounded-xl overflow-hidden shadow-2xs">
          {/* Table Header matching the screenshot */}
          <div className="bg-kumo-elevated border-b border-kumo-line px-4 py-2.5 grid grid-cols-12 gap-3 text-xs text-kumo-subtle font-medium items-center select-none">
            <div className="col-span-2 sm:col-span-1">Type</div>
            <div className="col-span-3 sm:col-span-3">Name</div>
            <div className="col-span-4 sm:col-span-5">Content</div>
            <div className="col-span-1 sm:col-span-1">TTL</div>
            <div className="col-span-2 sm:col-span-2 text-right">Status</div>
          </div>

          {/* Table Rows with click-to-copy on Name and Content */}
          <div className="divide-y divide-kumo-hairline">
            {records.map((rec, idx) => {
              const isRecVerified = rec.status === "VERIFIED";
              const isRecFailed = rec.status === "FAILED";
              const hostVal = rec.host || rec.fqdn;
              const contentVal = rec.value;
              const isNameCopied = copiedKey === `name-${rec.type}-${hostVal}`;
              const isContentCopied = copiedKey === `content-${rec.type}-${hostVal}`;

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-3 px-4 py-3.5 text-xs items-center hover:bg-kumo-recessed transition-colors"
                >
                  {/* Type */}
                  <div className="col-span-2 sm:col-span-1 font-mono text-white text-xs font-semibold">
                    {rec.type}
                  </div>

                  {/* Name - Click to Copy */}
                  <div
                    onClick={() => copyToClipboard(hostVal, `name-${rec.type}-${hostVal}`)}
                    title="Click to copy Name"
                    className="col-span-3 sm:col-span-3 font-mono text-white text-xs cursor-pointer hover:text-cf-orange transition-colors flex items-center gap-2 group/name truncate select-none"
                  >
                    <span className="truncate">{hostVal}</span>
                    {isNameCopied ? (
                      <span className="text-xs text-emerald-400 font-sans flex items-center gap-0.5 shrink-0 bg-emerald-500/10 px-1 rounded">
                        <Check size={11} />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <Copy
                        size={13}
                        className="text-kumo-subtle opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0"
                      />
                    )}
                  </div>

                  {/* Content - Click to Copy */}
                  <div
                    onClick={() => copyToClipboard(contentVal, `content-${rec.type}-${hostVal}`)}
                    title="Click to copy Content"
                    className="col-span-4 sm:col-span-5 font-mono text-kumo-default text-xs cursor-pointer hover:text-white transition-colors flex items-center justify-between gap-2 group/content select-none"
                  >
                    <span className="truncate font-mono">{contentVal}</span>
                    {isContentCopied ? (
                      <span className="text-xs text-emerald-400 font-sans flex items-center gap-0.5 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <Check size={11} />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <Copy
                        size={13}
                        className="text-kumo-subtle opacity-0 group-hover/content:opacity-100 transition-opacity shrink-0"
                      />
                    )}
                  </div>

                  {/* TTL */}
                  <div className="col-span-1 sm:col-span-1 font-mono text-kumo-subtle text-xs">
                    Auto
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-2 sm:col-span-2 flex justify-end">
                    {isRecVerified ? (
                      <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                        Verified
                      </span>
                    ) : isRecFailed ? (
                      <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-medium bg-rose-950/60 border border-rose-500/30 text-rose-400">
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-500/30 text-amber-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

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

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot verify DNS, rotate DKIM, or delete this domain." />
      )}

      {/* Domain Top Header Card */}
      <div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {domain.domainName}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isAllVerified
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : isPartiallyFailed
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    : isAllFailed
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                    : "bg-zinc-500/10 border-zinc-500/25 text-zinc-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAllVerified
                      ? "bg-emerald-400"
                      : isPartiallyFailed
                      ? "bg-amber-400 animate-pulse"
                      : isAllFailed
                      ? "bg-rose-400"
                      : "bg-zinc-400 animate-pulse"
                  }`}
                />
                {isAllVerified
                  ? "Active"
                  : isPartiallyFailed
                  ? `Partially Failed (${verifiedCount}/${rawRecords.length} Verified)`
                  : isAllFailed
                  ? "Failed"
                  : "Pending DNS"}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-kumo-subtle flex-wrap">
              <span>
                Selector: <strong className="text-white font-mono">{domain.dkimSelector}</strong>
              </span>
              <span>•</span>
              <span>
                Return-Path: <strong className="text-white font-mono">{domain.returnPathSubdomain}.{domain.domainName}</strong>
              </span>
              <span>•</span>
              <span>
                Added on: <span className="text-kumo-default">{new Date(domain.createdAt).toLocaleDateString()}</span>
              </span>
              {domain.lastVerifiedAt && (
                <>
                  <span>•</span>
                  <span>
                    Last checked: <span className="text-kumo-default">{new Date(domain.lastVerifiedAt).toLocaleTimeString()}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!isViewer && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRotateDkim}
                disabled={isRotatingDkim || isVerifying}
                className="h-9 px-3.5 rounded-md bg-kumo-elevated hover:bg-kumo-interact text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 border border-kumo-line shadow-sm transition-all duration-120 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
                title="Regenerate a brand-new 2048-bit RSA DKIM key"
              >
                <ArrowsClockwise
                  size={14}
                  className={isRotatingDkim ? "animate-spin text-cf-orange" : "text-kumo-subtle"}
                />
                <span>{isRotatingDkim ? "Rotating DKIM..." : "Rotate DKIM (2048-bit)"}</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={isVerifying}
                className="h-9 px-3.5 rounded-md bg-cf-blue hover:bg-cf-blue-hover text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 shadow-sm transition-all duration-120 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
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
                className="h-9 px-3.5 rounded-md bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 border border-red-500/40 shadow-sm transition-all duration-120 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
                title="Delete Domain"
              >
                <Trash size={14} />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Bordered DNS Records Card (Collapsible) */}
      <div className="bg-kumo-base border border-kumo-line rounded-2xl overflow-hidden shadow-sm">
        {/* Card Header with Collapsible Trigger */}
        <div
          onClick={() => setIsDnsCollapsed(!isDnsCollapsed)}
          className="px-6 py-4.5 border-b border-kumo-line flex items-center justify-between cursor-pointer hover:bg-kumo-recessed transition-colors select-none"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-white tracking-tight">
              Domain Verification
            </h2>
            {isAllVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                <Check size={12} weight="bold" />
                <span>All Records Verified</span>
              </span>
            ) : isPartiallyFailed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
                <WarningCircle size={12} weight="bold" />
                <span>{verifiedCount} of {rawRecords.length} Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/25 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <span>Awaiting DNS Publication</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
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

        {/* Card Body with DNS Record Tables */}
        {!isDnsCollapsed && (
          <div className="p-6 space-y-6 animate-in fade-in duration-150">
            {/* Warning Banner if not fully verified */}
            {!isAllVerified && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5">
                <WarningCircle size={17} weight="bold" className="text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white font-semibold">Sending is not affected:</strong> Your emails are still being sent. Add or fix the DNS records below to finish verifying this domain. {!isViewer && (
                    <>
                      Once fixed,{" "}
                      <button
                        type="button"
                        onClick={handleVerifyDns}
                        className="underline hover:text-white font-medium cursor-pointer"
                      >
                        restart verification
                      </button>.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 1. DKIM Section Table */}
            {renderDnsTable("DKIM", dkimRecords)}

            {/* 2. SPF Section Table */}
            {renderDnsTable("SPF", spfRecords)}

            {/* 3. DMARC Section Table */}
            {renderDnsTable("DMARC", dmarcRecords)}
          </div>
        )}
      </div>
    </div>
  );
}
