"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowsClockwise,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { ApiDomain } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";
import { getStandardDnsRecords } from "@/lib/dnsRecords";
import { DnsRecordsTable } from "@/components/dns/DnsRecordsTable";

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
  const [error, setError] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<{
    mailServerHostname?: string;
    vpsPublicIpv4?: string;
    spfIncludeDomain?: string;
  } | null>(null);

  const fetchDomain = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, configRes] = await Promise.all([
        api.domains.getById(domainId),
        api.serverConfig.get().catch(() => null),
      ]);
      setDomain(data);

      const cfg = configRes?.serverConfig || configRes?.config;
      if (cfg) {
        setServerConfig(cfg);
      }
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

      toast({
        title: allPassed ? "Domain Fully Verified" : "DNS Verification Updated",
        description: allPassed
          ? "DKIM, SPF, MX, and DMARC records are all verified."
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
      `Regenerate a brand-new 2048-bit RSA DKIM key for "${domain.domainName}"?\n\nThis will invalidate the previous key. You must update the DKIM TXT record in your DNS provider and click "Verify DNS Now".`
    );
    if (!confirm) return;

    setIsRotatingDkim(true);
    try {
      const res = await api.domains.rotateDkim(domain.id);
      if (res && res.domain) {
        setDomain(res.domain);
        toast({
          title: "2048-bit DKIM Key Generated",
          description: `New 2048-bit DKIM record created for ${domain.domainName}. Please update the TXT record in your DNS provider and verify.`,
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
        <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <WarningCircle size={24} weight="fill" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Domain Not Found</h2>
        <p className="text-xs text-zinc-400">
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

  // Standardized DNS records calculation (single source of truth with dynamic server config)
  const standardDns = getStandardDnsRecords({
    domain,
    vpsIp: serverConfig?.vpsPublicIpv4,
    mailHostname: serverConfig?.mailServerHostname,
    spfIncludeDomain: serverConfig?.spfIncludeDomain,
  });
  const isAllVerified = standardDns.isAllSendingVerified || domain.status === "VERIFIED";
  const verifiedCount = standardDns.sendingVerifiedCount;
  const totalSendingCount = standardDns.sendingRecords.length;
  const failedCount = standardDns.sendingRecords.filter((r) => r.status === "FAILED").length;
  const isPartiallyFailed = verifiedCount > 0 && !isAllVerified;
  const isAllFailed = failedCount === totalSendingCount || (domain.status === "FAILED" && verifiedCount === 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link
          href="/domains"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>Domains</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium">{domain.domainName}</span>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot verify DNS, rotate DKIM, or delete this domain." />
      )}

      {/* Flattened Domain Header Bar (Directly on canvas) */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-zinc-100">
                {domain.domainName}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border ${
                  isAllVerified
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : isPartiallyFailed
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : isAllFailed
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-zinc-800/60 border-zinc-700/50 text-zinc-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAllVerified
                      ? "bg-emerald-400"
                      : isPartiallyFailed
                      ? "bg-amber-400 animate-pulse"
                      : isAllFailed
                      ? "bg-red-400"
                      : "bg-zinc-400 animate-pulse"
                  }`}
                />
                {isAllVerified
                  ? "Active"
                  : isPartiallyFailed
                  ? `Partially Verified (${verifiedCount}/${totalSendingCount})`
                  : isAllFailed
                  ? "Failed"
                  : "Pending DNS"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm text-zinc-400 flex-wrap">
              <span>
                Selector: <strong className="text-zinc-200 font-mono font-medium">{domain.dkimSelector}</strong>
              </span>
              <span>•</span>
              <span>
                Return-Path: <strong className="text-zinc-200 font-mono font-medium">{domain.returnPathSubdomain}.{domain.domainName}</strong>
              </span>
              <span>•</span>
              <span>
                Added on: <span className="text-zinc-300">{new Date(domain.createdAt).toLocaleDateString()}</span>
              </span>
              {domain.lastVerifiedAt && (
                <>
                  <span>•</span>
                  <span>
                    Last checked: <span className="text-zinc-300">{new Date(domain.lastVerifiedAt).toLocaleTimeString()}</span>
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
                className="btn-cf-secondary text-xs"
                title="Regenerate a brand-new 2048-bit RSA DKIM key"
              >
                <ArrowsClockwise
                  size={14}
                  className={isRotatingDkim ? "animate-spin text-zinc-400" : "text-zinc-400"}
                />
                <span>{isRotatingDkim ? "Rotating..." : "Rotate DKIM (2048-bit)"}</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={isVerifying}
                className="btn-cf-primary text-xs"
              >
                <ArrowsClockwise
                  size={14}
                  className={isVerifying ? "animate-spin" : ""}
                />
                <span>{isVerifying ? "Verifying..." : "Verify DNS Now"}</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteDomain}
                disabled={isDeleting}
                className="btn-cf-danger text-xs"
                title="Delete Domain"
              >
                <Trash size={14} />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner if sending is not fully verified */}
      {!isAllVerified && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
          <WarningCircle size={16} weight="bold" className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-200 font-medium">Sending configuration required:</strong> Publish the sending DNS records below in your DNS provider to complete verification and ensure high deliverability. {!isViewer && (
              <>
                Once published,{" "}
                <button
                  type="button"
                  onClick={handleVerifyDns}
                  className="underline hover:text-amber-100 font-medium cursor-pointer"
                >
                  verify DNS records now
                </button>.
              </>
            )}
          </div>
        </div>
      )}

      {/* Standardized Unified DNS Records (Group 1: Sending, Group 2: Inbound) */}
      <DnsRecordsTable
        sendingRecords={standardDns.sendingRecords}
        inboundRecords={standardDns.inboundRecords}
        showInboundToggleNote={true}
      />
    </div>
  );
}
