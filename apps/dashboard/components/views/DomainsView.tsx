"use client";

import React, { useState } from "react";
import {
  MagnifyingGlass,
  Check,
  Trash,
  ArrowsClockwise,
  X,
  FileCode,
  Star,
  CaretUpDown,
  Info,
  Gear,
  DotsThree,
  ArrowSquareOut,
  Globe,
} from "@phosphor-icons/react";
import { DomainItem } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface ExtendedDomainItem extends DomainItem {
  insightsCount: number;
  uniqueVisitors: number;
  plan: "Free" | "Pro" | "Enterprise";
  isStarred?: boolean;
}

const INITIAL_DOMAINS: ExtendedDomainItem[] = [
  {
    id: "dom-1",
    name: "omkarbhosale.dev",
    status: "verified",
    dkimStatus: "verified",
    spfStatus: "verified",
    region: "us-east (Virginia)",
    createdAt: "Oct 20, 2026",
    dkimKey: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0X12fG...91AQAB",
    spfRecord: "v=spf1 include:_spf.emitmail.net ~all",
    mxRecord: "10 feedback-smtp.emitmail.net",
    insightsCount: 5,
    uniqueVisitors: 238,
    plan: "Free",
    isStarred: true,
  },
  {
    id: "dom-2",
    name: "emitmail.dev",
    status: "verified",
    dkimStatus: "verified",
    spfStatus: "verified",
    region: "eu-west (Frankfurt)",
    createdAt: "Oct 22, 2026",
    dkimKey: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3Y81aB...87BQAB",
    spfRecord: "v=spf1 include:_spf.emitmail.net ~all",
    mxRecord: "10 feedback-smtp.emitmail.net",
    insightsCount: 3,
    uniqueVisitors: 1420,
    plan: "Pro",
    isStarred: false,
  },
  {
    id: "dom-3",
    name: "preview.mailflow.io",
    status: "pending",
    dkimStatus: "pending",
    spfStatus: "verified",
    region: "us-east (Virginia)",
    createdAt: "Oct 25, 2026",
    dkimKey: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8U73cA...44CQAB",
    spfRecord: "v=spf1 include:_spf.emitmail.net ~all",
    mxRecord: "10 feedback-smtp.emitmail.net",
    insightsCount: 1,
    uniqueVisitors: 64,
    plan: "Free",
    isStarred: false,
  },
];

export function DomainsView() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<ExtendedDomainItem[]>(INITIAL_DOMAINS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainForRecords, setSelectedDomainForRecords] = useState<ExtendedDomainItem | null>(null);
  const [activeMenuDomainId, setActiveMenuDomainId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [newKeyStrength, setNewKeyStrength] = useState("2048-bit RSA");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    const cleanDomain = newDomainName.trim().toLowerCase();
    const newEntry: ExtendedDomainItem = {
      id: `dom-${Date.now()}`,
      name: cleanDomain,
      status: "pending",
      dkimStatus: "pending",
      spfStatus: "pending",
      region: "us-east (Virginia)",
      createdAt: "Just now",
      dkimKey: `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A${Math.random().toString(36).substring(2, 15)}...emitmail`,
      spfRecord: "v=spf1 include:_spf.emitmail.net ~all",
      mxRecord: "10 feedback-smtp.emitmail.net",
      insightsCount: 0,
      uniqueVisitors: 0,
      plan: "Free",
      isStarred: false,
    };

    setDomains((prev) => [newEntry, ...prev]);
    setIsAddModalOpen(false);
    setNewDomainName("");
    setSelectedDomainForRecords(newEntry);
    toast({
      title: "Domain Added",
      description: `Domain ${cleanDomain} added. Configure the DNS records below to activate.`,
      type: "info",
    });
  };

  const handleDeleteDomain = (id: string, name: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setActiveMenuDomainId(null);
    toast({
      title: "Domain Removed",
      description: `Domain ${name} has been detached.`,
      type: "info",
    });
  };

  const handleVerifyDns = (domain: ExtendedDomainItem) => {
    toast({
      title: "Verifying DNS Propagation",
      description: `Querying DKIM & SPF TXT records for ${domain.name}...`,
      type: "info",
    });

    setIsLoading(true);
    setTimeout(() => {
      setDomains((prev) =>
        prev.map((d) =>
          d.id === domain.id
            ? { ...d, status: "verified", dkimStatus: "verified", spfStatus: "verified" }
            : d
        )
      );
      setIsLoading(false);
      toast({
        title: "Domain Verified Successfully",
        description: `DKIM & SPF alignment confirmed for ${domain.name}.`,
        type: "success",
      });
    }, 800);
  };

  const handleBuyDomain = () => {
    toast({
      title: "Cloudflare Registrar",
      description: "Search and register custom top-level domains at wholesale at-cost pricing.",
      type: "info",
    });
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDomains((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isStarred: !d.isStarred } : d))
    );
  };

  const filteredDomains = domains.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header (Exact Cloudflare Screenshot 2 Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
              Domains
            </h1>
            <a
              href="https://github.com/omkarbhosale-dev/emitmail"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1C1C1E] border border-[#2B2B2B] text-[#A1A1A1] hover:text-white hover:border-[#3E3E3E] transition-colors"
            >
              <span>View docs</span>
            </a>
          </div>
          <p className="text-xs text-kumo-subtle mt-1.5">
            Speed up and protect your sites and apps
          </p>
        </div>

        {/* Top Right Buttons: Buy domain (secondary) + Add domain (solid blue primary) */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleBuyDomain}
            className="btn-cf-secondary"
          >
            Buy domain
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-cf-primary"
          >
            Add domain
          </button>
        </div>
      </div>

      {/* 2. Full-Width Search Bar (Exact Cloudflare Screenshot 2) */}
      <div className="relative w-full">
        <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md px-3 py-2 text-xs text-kumo-strong focus-within:border-[#3E3E3E] transition-colors">
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
          <button
            type="button"
            className="text-[#6E6E6E] hover:text-cf-amber transition-colors ml-auto cursor-pointer"
            title="Filter starred domains"
          >
            <Star size={16} />
          </button>
        </div>
      </div>

      {/* 3. Cloudflare Authentic Table Container */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-md overflow-hidden shadow-2xs">
        {isLoading ? (
          <TableSkeleton rows={3} cols={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#0C0C0C] text-[#8E8E93] font-normal select-none">
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
                      <CaretUpDown size={13} className="text-[#6E6E6E]" />
                    </div>
                  </th>

                  {/* Security insights */}
                  <th className="py-2.5 px-4 font-normal">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-kumo-strong transition-colors">
                      <span>Security insights</span>
                      <Info size={13} className="text-[#6E6E6E]" />
                    </div>
                  </th>

                  {/* Unique visitors */}
                  <th className="py-2.5 px-4 font-normal">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-kumo-strong transition-colors">
                      <span>Unique visitors</span>
                      <Info size={13} className="text-[#6E6E6E]" />
                    </div>
                  </th>

                  {/* Tags */}
                  <th className="py-2.5 px-4 font-normal">
                    <span>Tags</span>
                  </th>

                  {/* Plan */}
                  <th className="py-2.5 px-4 font-normal">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-kumo-strong transition-colors">
                      <span>Plan</span>
                      <CaretUpDown size={13} className="text-[#6E6E6E]" />
                    </div>
                  </th>

                  {/* Settings */}
                  <th className="py-2.5 px-4 text-right font-normal">
                    <Gear size={15} className="text-[#6E6E6E] inline-block" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {filteredDomains.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-kumo-subtle">
                      No domains found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredDomains.map((dom) => (
                    <tr
                      key={dom.id}
                      className="hover:bg-[#141414] transition-colors group"
                    >
                      {/* Domain Name */}
                      <td className="py-3 px-4 font-medium text-white">
                        <button
                          onClick={() => setSelectedDomainForRecords(dom)}
                          className="hover:underline text-left font-medium text-white cursor-pointer select-text"
                        >
                          {dom.name}
                        </button>
                      </td>

                      {/* Status: Active (with checkmark) or Pending DNS */}
                      <td className="py-3 px-4">
                        {dom.status === "verified" ? (
                          <div className="flex items-center gap-1.5 text-white">
                            <Check size={14} weight="bold" className="text-white" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-cf-amber">
                            <span className="w-2 h-2 rounded-full bg-cf-amber animate-pulse" />
                            <span>Pending DNS</span>
                          </div>
                        )}
                      </td>

                      {/* Security insights Pill Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1C1C1E] border border-[#2B2B2B] text-[#D4D4D8]">
                          {dom.insightsCount} {dom.insightsCount === 1 ? "insight" : "insights"}
                        </span>
                      </td>

                      {/* Unique visitors with mini Blue Wave Sparkline SVG */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Mini Blue Sparkline Wave */}
                          <svg
                            width="64"
                            height="18"
                            viewBox="0 0 64 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0"
                          >
                            <path
                              d="M0 14 C10 14, 14 6, 20 2 C26 -2, 28 14, 38 14 C48 14, 52 4, 64 2"
                              fill="none"
                              stroke="#0066FF"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="font-mono text-xs text-white">
                            {dom.uniqueVisitors}
                          </span>
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="py-3 px-4 text-[#8E8E93]">
                        —
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4 text-white">
                        {dom.plan}
                      </td>

                      {/* Actions Menu */}
                      <td className="py-3 px-4 text-right relative">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDomainForRecords(dom)}
                            className="px-2 py-0.5 rounded text-[11px] font-medium text-kumo-subtle hover:text-white hover:bg-kumo-tint transition-colors cursor-pointer mr-1"
                            title="Inspect DNS Records"
                          >
                            DNS Records
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuDomainId((prev) =>
                                  prev === dom.id ? null : dom.id
                                )
                              }
                              className="p-1 rounded text-[#8E8E93] hover:text-white hover:bg-[#1E1E22] transition-colors cursor-pointer"
                              title="Domain Actions"
                            >
                              <DotsThree size={18} weight="bold" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuDomainId === dom.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-[#141414] border border-[#2B2B2B] rounded-lg shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDomainForRecords(dom);
                                    setActiveMenuDomainId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-left text-white hover:bg-[#1E1E22] flex items-center gap-2"
                                >
                                  <FileCode size={14} />
                                  <span>View DNS Records</span>
                                </button>
                                {dom.status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleVerifyDns(dom);
                                      setActiveMenuDomainId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left text-cf-blue hover:bg-[#1E1E22] flex items-center gap-2"
                                  >
                                    <ArrowsClockwise size={14} />
                                    <span>Verify DNS Now</span>
                                  </button>
                                )}
                                <div className="border-t border-[#262626] my-1" />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDomain(dom.id, dom.name)}
                                  className="w-full px-3 py-1.5 text-xs text-left text-kumo-danger hover:bg-kumo-danger-tint flex items-center gap-2"
                                >
                                  <Trash size={14} />
                                  <span>Delete Domain</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Footnote Count (Exact Cloudflare Screenshot 2) */}
      <div className="text-xs text-[#8E8E93]">
        Showing 1-{filteredDomains.length} of {domains.length}
      </div>

      {/* 5. DNS Records Inspector Modal */}
      {selectedDomainForRecords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedDomainForRecords(null)}
          />
          <div className="relative w-full max-w-2xl bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                  <FileCode size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    DNS Records for {selectedDomainForRecords.name}
                  </h3>
                  <p className="text-[11px] text-kumo-subtle">
                    Add these TXT and MX records to your DNS provider (Cloudflare, Route53, etc.)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDomainForRecords(null)}
                className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Record 1: DKIM */}
              <div className="p-3.5 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-kumo-strong">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cf-blue/10 text-cf-blue text-[10px] font-mono border border-cf-blue/20">
                      TXT (DKIM)
                    </span>
                    <span>Name / Host</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `emitmail._domainkey.${selectedDomainForRecords.name}`,
                        "DKIM Host Name"
                      )
                    }
                    className="btn-cf-secondary text-[11px] py-1 px-2"
                  >
                    <span>Copy Host</span>
                  </button>
                </div>
                <div className="font-mono text-xs bg-kumo-base p-2 rounded border border-kumo-line text-kumo-strong break-all select-all">
                  emitmail._domainkey.{selectedDomainForRecords.name}
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-kumo-strong pt-2">
                  <span>Value / Target</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(selectedDomainForRecords.dkimKey, "DKIM Public Key Value")
                    }
                    className="btn-cf-secondary text-[11px] py-1 px-2"
                  >
                    {copiedKey === "DKIM Public Key Value" ? (
                      <Check size={13} className="text-cf-success" />
                    ) : null}
                    <span>Copy Value</span>
                  </button>
                </div>
                <div className="font-mono text-xs bg-kumo-base p-2 rounded border border-kumo-line text-kumo-strong break-all select-all">
                  {selectedDomainForRecords.dkimKey}
                </div>
              </div>

              {/* Record 2: SPF */}
              <div className="p-3.5 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-kumo-strong">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cf-blue/10 text-cf-blue text-[10px] font-mono border border-cf-blue/20">
                      TXT (SPF)
                    </span>
                    <span>Name: @</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(selectedDomainForRecords.spfRecord, "SPF Record Value")
                    }
                    className="btn-cf-secondary text-[11px] py-1 px-2"
                  >
                    <span>Copy Value</span>
                  </button>
                </div>
                <div className="font-mono text-xs bg-kumo-base p-2 rounded border border-kumo-line text-kumo-strong select-all">
                  {selectedDomainForRecords.spfRecord}
                </div>
              </div>

              {/* Record 3: MX */}
              <div className="p-3.5 rounded-xl bg-kumo-recessed border border-kumo-hairline space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-kumo-strong">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cf-blue/10 text-cf-blue text-[10px] font-mono border border-cf-blue/20">
                      MX
                    </span>
                    <span>Name: @ (Priority 10)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(selectedDomainForRecords.mxRecord, "MX Record Value")
                    }
                    className="btn-cf-secondary text-[11px] py-1 px-2"
                  >
                    <span>Copy Value</span>
                  </button>
                </div>
                <div className="font-mono text-xs bg-kumo-base p-2 rounded border border-kumo-line text-kumo-strong select-all">
                  {selectedDomainForRecords.mxRecord}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-between">
              <span className="text-[11px] text-kumo-subtle">
                DNS propagation usually completes within 60 seconds on Cloudflare.
              </span>
              <button
                type="button"
                onClick={() => {
                  handleVerifyDns(selectedDomainForRecords);
                  setSelectedDomainForRecords(null);
                }}
                className="btn-cf-primary"
              >
                Verify Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
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
                  className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
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
                    placeholder="mail.yourcompany.com"
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue"
                  />
                  <p className="text-[11px] text-kumo-subtle mt-1">
                    Use either an apex domain (`example.com`) or a dedicated subdomain (`mail.example.com`).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    DKIM Key Strength
                  </label>
                  <select
                    value={newKeyStrength}
                    onChange={(e) => setNewKeyStrength(e.target.value)}
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue cursor-pointer"
                  >
                    <option value="2048-bit RSA">2048-bit RSA (Industry Standard - High Deliverability)</option>
                    <option value="1024-bit RSA">1024-bit RSA (Legacy Support)</option>
                  </select>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-cf-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cf-primary"
                >
                  Add Domain & View Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
