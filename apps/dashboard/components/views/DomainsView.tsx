"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Check,
  Trash,
  ArrowsClockwise,
  X,
  Star,
  CaretUpDown,
  Info,
  Gear,
  DotsThree,
  Globe,
  Plus,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { ApiDomain } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DisplayDomainItem extends ApiDomain {
  insightsCount: number;
  uniqueVisitors: number;
  plan: "Free" | "Pro" | "Enterprise";
  isStarred?: boolean;
}

export function DomainsView() {
  const { toast } = useToast();
  const { isViewer } = useAuth();
  const [domains, setDomains] = useState<DisplayDomainItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuDomain, setActiveMenuDomain] = useState<DisplayDomainItem | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [newKeySelector, setNewKeySelector] = useState("esp");
  const [newReturnPathSub, setNewReturnPathSub] = useState("send");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [starredDomainIds, setStarredDomainIds] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Close floating dropdown on window scroll or resize
  useEffect(() => {
    const handleClose = () => {
      setActiveMenuDomain(null);
      setMenuCoords(null);
    };
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, []);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, dom: DisplayDomainItem) => {
    e.stopPropagation();
    if (activeMenuDomain?.id === dom.id) {
      setActiveMenuDomain(null);
      setMenuCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 4,
        right: Math.max(16, window.innerWidth - rect.right),
      });
      setActiveMenuDomain(dom);
    }
  };

  const fetchDomains = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.domains.list();
      const enriched: DisplayDomainItem[] = (data || []).map((dom, idx) => ({
        ...dom,
        insightsCount: dom.status === "VERIFIED" ? 5 : 1,
        uniqueVisitors: dom.status === "VERIFIED" ? 230 + (idx * 140) : 0,
        plan: "Free",
        isStarred: starredDomainIds.has(dom.id),
      }));
      setDomains(enriched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load domains from API";
      setFetchError(msg);
      toast({
        title: "Connection Error",
        description: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [starredDomainIds, toast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members are not permitted to register domains.",
        type: "error",
      });
      return;
    }
    if (!newDomainName.trim()) return;

    const cleanDomain = newDomainName.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      const createdDomain = await api.domains.create({
        domainName: cleanDomain,
        dkimSelector: newKeySelector.trim() || "esp",
        returnPathSubdomain: newReturnPathSub.trim() || "send",
      });

      const displayItem: DisplayDomainItem = {
        ...createdDomain,
        insightsCount: 1,
        uniqueVisitors: 0,
        plan: "Free",
        isStarred: false,
      };

      setDomains((prev) => [displayItem, ...prev]);
      setIsAddModalOpen(false);
      setNewDomainName("");

      toast({
        title: "Domain Registered",
        description: `Domain "${cleanDomain}" registered successfully.`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create domain";
      toast({
        title: "Failed to Add Domain",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDomain = async (id: string, name: string) => {
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members are not permitted to delete domains.",
        type: "error",
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will detach all associated API keys and DKIM keys.`)) {
      return;
    }

    try {
      await api.domains.delete(id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
      setActiveMenuDomain(null);
      setMenuCoords(null);
      toast({
        title: "Domain Removed",
        description: `Domain "${name}" has been deleted successfully.`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete domain";
      toast({
        title: "Delete Failed",
        description: msg,
        type: "error",
      });
    }
  };

  const handleVerifyDns = async (domain: DisplayDomainItem) => {
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members cannot trigger DNS verification.",
        type: "error",
      });
      return;
    }
    setIsVerifying(true);
    toast({
      title: "Verifying DNS Propagation",
      description: `Querying DKIM, SPF, MX, and DMARC records for ${domain.domainName}...`,
      type: "info",
    });

    try {
      const result = await api.domains.verify(domain.id);
      const updated = result.domain;

      setDomains((prev) =>
        prev.map((d) =>
          d.id === domain.id
            ? {
                ...d,
                ...updated,
              }
            : d
        )
      );

      if (updated.status === "VERIFIED") {
        toast({
          title: "Domain Verified Successfully",
          description: `All DNS records verified! Domain ${domain.domainName} is active for sending.`,
          type: "success",
        });
      } else {
        toast({
          title: "DNS Verification Pending",
          description: "Some DNS records have not propagated yet. Please ensure all TXT/MX records are published.",
          type: "warning",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification request failed";
      toast({
        title: "Verification Error",
        description: msg,
        type: "error",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRotateDkim = async (domain: DisplayDomainItem) => {
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members cannot rotate DKIM keys.",
        type: "error",
      });
      return;
    }
    const confirm = window.confirm(
      `Regenerate a brand-new 2048-bit RSA DKIM key for "${domain.domainName}"?\n\nThis will invalidate the previous key. You must update your DKIM TXT record in Cloudflare and click Verify.`
    );
    if (!confirm) return;

    try {
      const res = await api.domains.rotateDkim(domain.id);
      if (res && res.domain) {
        setDomains((prev) =>
          prev.map((d) =>
            d.id === domain.id
              ? {
                  ...d,
                  ...res.domain,
                  status: "PENDING",
                  dkimVerified: false,
                }
              : d
          )
        );
        toast({
          title: "2048-bit DKIM Key Generated",
          description: `New 2048-bit DKIM record created for ${domain.domainName}. Please update the TXT record in your DNS provider.`,
          type: "success",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "DKIM Rotation Failed",
        description: err instanceof Error ? err.message : "Failed to rotate DKIM key",
        type: "error",
      });
    }
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredDomainIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setDomains((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isStarred: !d.isStarred } : d))
    );
  };

  const filteredDomains = domains.filter((d) =>
    d.domainName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You can inspect domain records and DKIM status, but cannot add, verify, rotate, or delete domains." />
      )}

      {/* 1. Header (Cloudflare Account Home Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
              Domains
            </h1>
          </div>
          <p className="text-xs text-kumo-subtle mt-1.5">
            Manage authenticated sending domains, DKIM keys, SPF return-paths, and DMARC compliance
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={fetchDomains}
            disabled={isLoading}
            className="btn-cf-secondary flex items-center gap-1.5"
            title="Refresh domains list"
          >
            <ArrowsClockwise size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          {!isViewer && (
            <Link
              href="/domains/add"
              className="btn-cf-primary flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              <span>Add domain</span>
            </Link>
          )}
        </div>
      </div>

      {/* Connection Error Banner if backend fails */}
      {fetchError && (
        <div className="p-3.5 rounded-lg bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} weight="bold" />
            <span>Failed to reach API server: {fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchDomains}
            className="underline hover:text-white font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : domains.length === 0 ? (
        /* 3. Empty State / No Data (Replaces empty table when no domains are available) */
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-10 md:p-14 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#2B2B2B] flex items-center justify-center text-cf-blue mb-4 shadow-inner">
            <Globe size={30} weight="duotone" className="text-cf-blue" />
          </div>
          <h3 className="text-base font-semibold text-kumo-strong mb-1.5">
            No domains registered
          </h3>
          <p className="text-xs text-kumo-subtle max-w-md mb-6 leading-relaxed">
            You haven't configured any sending domains yet. Register your domain to generate 2048-bit DKIM keys, SPF return-paths, and start dispatching emails with 10/10 deliverability.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/domains/add"
              className="btn-cf-primary flex items-center gap-2 px-4 py-2 text-xs"
            >
              <Plus size={15} weight="bold" />
              <span>Add sending domain</span>
            </Link>
            <button
              type="button"
              onClick={fetchDomains}
              className="btn-cf-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
            >
              <ArrowsClockwise size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      ) : (
        /* 4. Domains Available Flow: Search Bar + Full Cloudflare-styled Table */
        <>
          {/* Full-Width Search Bar */}
          <div className="relative w-full">
            <div className="flex items-center bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus-within:border-cf-blue transition-colors">
              <MagnifyingGlass
                size={15}
                className="text-[#6E6E6E] shrink-0"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by domain name..."
                className="w-full bg-transparent border-0 outline-none pl-2.5 pr-6 text-xs text-kumo-strong placeholder:text-[#6E6E6E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[#6E6E6E] hover:text-white mr-2 cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Authentic Cloudflare Domains Table */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium select-none">
                    {/* Domain */}
                    <th className="py-2.5 px-4 font-normal">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-kumo-strong transition-colors">
                        <span>Domain</span>
                        <CaretUpDown size={13} className="text-[#6E6E6E]" />
                      </div>
                    </th>

                    {/* Status */}
                    <th className="py-2.5 px-4 font-normal">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-kumo-strong transition-colors">
                        <span>Status</span>
                        <Info size={13} className="text-[#6E6E6E]" />
                      </div>
                    </th>

                    {/* Date Created */}
                    <th className="py-2.5 px-4 font-normal">
                      <span>Created</span>
                    </th>

                    {/* Actions */}
                    <th className="py-2.5 px-4 text-right font-normal">
                      <Gear size={15} className="text-[#6E6E6E] inline-block" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kumo-hairline">
                  {filteredDomains.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-kumo-subtle">
                        <p className="mb-2">No domains found matching "{searchQuery}".</p>
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="btn-cf-secondary text-xs py-1 px-2.5"
                        >
                          Clear search filter
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredDomains.map((dom) => (
                      <tr
                        key={dom.id}
                        className="hover:bg-kumo-tint/60 transition-colors group"
                      >
                        {/* Domain Name */}
                        <td className="py-3.5 px-4 font-semibold text-kumo-strong">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
                              <Globe size={14} weight="bold" />
                            </div>
                            <Link
                              href={`/domains/${dom.id}`}
                              className="font-mono text-xs font-semibold text-kumo-strong group-hover:text-cf-blue transition-colors truncate"
                            >
                              {dom.domainName}
                            </Link>
                          </div>
                        </td>

                        {/* Status: Active, Partially Failed, Failed, or Pending DNS */}
                        <td className="py-3 px-4">
                          {(() => {
                            const records = dom.dnsRecords || [];
                            const verifiedCount = records.filter((r) => r.status === "VERIFIED").length;
                            const failedCount = records.filter((r) => r.status === "FAILED").length;
                            const pendingCount = records.filter((r) => r.status === "PENDING").length;

                            let statusType: "active" | "partially_failed" | "failed" | "pending" = "pending";

                            if (dom.status === "VERIFIED" || (records.length > 0 && verifiedCount === records.length)) {
                              statusType = "active";
                            } else if (dom.status === "PARTIALLY_FAILED" || (records.length > 0 && verifiedCount > 0 && (failedCount > 0 || pendingCount > 0))) {
                              statusType = "partially_failed";
                            } else if (dom.status === "FAILED" || (records.length > 0 && failedCount === records.length)) {
                              statusType = "failed";
                            } else {
                              // Check flags fallback
                              const flags = [dom.dkimVerified, dom.spfVerified, dom.mxVerified, dom.dmarcVerified].filter((v) => typeof v === "boolean");
                              const passed = flags.filter(Boolean).length;
                              if (passed === flags.length && flags.length > 0) statusType = "active";
                              else if (passed > 0) statusType = "partially_failed";
                              else statusType = "pending";
                            }

                            if (statusType === "active") {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                  <Check size={12} weight="bold" />
                                  <span>Active</span>
                                </div>
                              );
                            }

                            if (statusType === "partially_failed") {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                  <WarningCircle size={12} weight="bold" />
                                  <span>Partially Failed</span>
                                </div>
                              );
                            }

                            if (statusType === "failed") {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                  <X size={12} weight="bold" />
                                  <span>Failed</span>
                                </div>
                              );
                            }

                            return (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                                <span>Pending DNS</span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-kumo-subtle font-mono text-[11px]">
                          {new Date(dom.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions Menu */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMenu(e, dom)}
                            className={cn(
                              "p-1 rounded text-[#8E8E93] hover:text-white hover:bg-[#1E1E22] transition-colors cursor-pointer",
                              activeMenuDomain?.id === dom.id && "bg-[#1E1E22] text-white"
                            )}
                            title="Domain Actions"
                          >
                            <DotsThree size={18} weight="bold" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footnote Count */}
          <div className="text-xs text-[#8E8E93]">
            Showing 1-{filteredDomains.length} of {domains.length} {domains.length === 1 ? "domain" : "domains"}
          </div>
        </>
      )}

      {/* Floating Fixed Dropdown Menu (Anchored to button coords, outside table overflow) */}
      {activeMenuDomain && menuCoords && (
        <>
          {/* Fullscreen transparent backdrop */}
          <div
            className="fixed inset-0 z-50 cursor-default"
            onClick={() => {
              setActiveMenuDomain(null);
              setMenuCoords(null);
            }}
          />
          <div
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
            }}
            className="w-48 bg-kumo-base border border-kumo-line rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            <Link
              href={`/domains/${activeMenuDomain.id}`}
              onClick={() => {
                setActiveMenuDomain(null);
                setMenuCoords(null);
              }}
              className="w-full px-3 py-1.5 text-xs text-left text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong flex items-center gap-2 transition-colors"
            >
              <Gear size={14} />
              <span>Domain Configuration</span>
            </Link>
            {!isViewer && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleVerifyDns(activeMenuDomain);
                    setActiveMenuDomain(null);
                    setMenuCoords(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowsClockwise size={14} />
                  <span>Verify DNS Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRotateDkim(activeMenuDomain);
                    setActiveMenuDomain(null);
                    setMenuCoords(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowsClockwise size={14} className="text-cf-orange" />
                  <span>Rotate DKIM (2048-bit)</span>
                </button>
                <div className="border-t border-kumo-hairline my-1" />
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteDomain(activeMenuDomain.id, activeMenuDomain.domainName);
                    setActiveMenuDomain(null);
                    setMenuCoords(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash size={14} />
                  <span>Delete Domain</span>
                </button>
              </>
            )}
          </div>
        </>
      )}



      {/* 6. Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleAddDomain}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                    <Globe size={18} weight="bold" />
                  </div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    Add Sending Domain
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="example.com or mail.example.com"
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
                  />
                  <p className="text-[11px] text-kumo-subtle mt-1">
                    Enter the apex domain (e.g. <code>example.com</code>) or subdomain (e.g. <code>mail.example.com</code>).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                      DKIM Selector
                    </label>
                    <input
                      type="text"
                      value={newKeySelector}
                      onChange={(e) => setNewKeySelector(e.target.value)}
                      placeholder="esp"
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                      Return-Path Subdomain
                    </label>
                    <input
                      type="text"
                      value={newReturnPathSub}
                      onChange={(e) => setNewReturnPathSub(e.target.value)}
                      placeholder="send"
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-kumo-recessed border border-kumo-hairline flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-cf-blue shrink-0 mt-0.5" />
                  <p className="text-[11px] text-kumo-subtle leading-relaxed">
                    EmitMail will generate an RSA-2048 DKIM keypair and custom SPF alignment records automatically upon creation.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="btn-cf-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDomainName.trim()}
                  className="btn-cf-primary text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowsClockwise size={13} className="animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Domain</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
