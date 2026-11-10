"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Info,
} from "@phosphor-icons/react";
import { StandardDnsRecord } from "@/lib/dnsRecords";
import { useToast } from "@/components/ui/Toast";

interface DnsRecordsTableProps {
  sendingRecords: StandardDnsRecord[];
  inboundRecords: StandardDnsRecord[];
  onRotateDkim?: () => void;
  isRotatingDkim?: boolean;
  isViewer?: boolean;
  showInboundToggleNote?: boolean;
}

export function DnsRecordsTable({
  sendingRecords,
  inboundRecords,
  showInboundToggleNote = true,
}: DnsRecordsTableProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const renderTableSection = (
    title: string,
    subtitle: string,
    records: StandardDnsRecord[],
    groupType: "sending" | "inbound"
  ) => {
    return (
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base md:text-lg font-semibold text-zinc-100">
              {title}
            </h3>
            <span className="text-2xs font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
              {groupType === "sending" ? "Required for Sending" : "Inbound Mail"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>

        {/* Informational Callout for Inbound MX */}
        {groupType === "inbound" && showInboundToggleNote && (
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-2.5 leading-relaxed">
            <Info size={15} className="text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-zinc-200">
                Inbound Mail Routing:{" "}
              </span>
              Add this record to receive incoming emails and process replies on your root domain (
              <code className="text-2xs font-mono text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">@</code>
              ). If you route incoming mail through Google Workspace, Microsoft 365, or another provider, you can leave your existing MX records intact without affecting outbound delivery.
            </div>
          </div>
        )}

        {/* DNS Table Container */}
        <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
          {/* Header Row */}
          <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-4 py-3.5 grid grid-cols-12 gap-3 text-xs uppercase tracking-wider text-zinc-400 font-semibold items-center select-none">
            <div className="col-span-2 sm:col-span-1">Type</div>
            <div className="col-span-3 sm:col-span-3">Host / Name</div>
            <div className="col-span-4 sm:col-span-5">Value / Content</div>
            <div className="col-span-1 sm:col-span-1 hidden sm:block">TTL</div>
            <div className="col-span-3 sm:col-span-2 text-right">Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-800/60">
            {records.map((rec) => {
              const isRecVerified = rec.status === "VERIFIED";
              const isRecFailed = rec.status === "FAILED";
              const isNameCopied = copiedKey === `name-${rec.id}`;
              const isContentCopied = copiedKey === `val-${rec.id}`;

              return (
                <div
                  key={rec.id}
                  className="grid grid-cols-12 gap-3 px-4 py-3.5 min-h-[52px] text-sm items-center hover:bg-zinc-800/30 transition-colors group"
                >
                  {/* 1. Type & Priority */}
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-0.5">
                    <span className="font-mono text-[13px] md:text-sm font-semibold text-zinc-200">
                      {rec.type}
                    </span>
                    {rec.type === "MX" && rec.priority && (
                      <span className="text-3xs font-mono text-zinc-400">
                        (Pri {rec.priority})
                      </span>
                    )}
                  </div>

                  {/* 2. Host / Name (Click to copy) */}
                  <div
                    onClick={() => copyToClipboard(rec.host, `name-${rec.id}`)}
                    title={`Click to copy: ${rec.host}`}
                    className="col-span-3 sm:col-span-3 font-mono text-[13px] md:text-sm cursor-pointer hover:text-zinc-100 transition-colors flex items-center gap-1.5 min-w-0 select-none group/name"
                  >
                    <span className="truncate font-medium text-zinc-300 group-hover/name:text-zinc-100">
                      {rec.host}
                    </span>
                    {isNameCopied ? (
                      <span className="text-3xs text-emerald-400 font-sans flex items-center gap-0.5 shrink-0 bg-emerald-500/10 px-1 py-0.5 rounded">
                        <Check size={10} />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <Copy
                        size={12}
                        className="text-zinc-500 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0"
                      />
                    )}
                  </div>

                  {/* 3. Value / Content (Click to copy) */}
                  <div
                    onClick={() => copyToClipboard(rec.value, `val-${rec.id}`)}
                    title={`Click to copy: ${rec.value}`}
                    className="col-span-4 sm:col-span-5 font-mono text-[13px] md:text-sm cursor-pointer hover:text-white transition-colors flex items-center justify-between gap-2 min-w-0 select-none group/val"
                  >
                    <span className="truncate text-zinc-300 group-hover/val:text-white font-mono">
                      {rec.value}
                    </span>
                    {isContentCopied ? (
                      <span className="text-3xs text-emerald-400 font-sans flex items-center gap-0.5 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <Check size={10} />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <Copy
                        size={12}
                        className="text-zinc-500 opacity-0 group-hover/val:opacity-100 transition-opacity shrink-0"
                      />
                    )}
                  </div>

                  {/* 4. TTL */}
                  <div className="col-span-1 sm:col-span-1 font-mono text-zinc-400 text-xs md:text-sm hidden sm:block">
                    Auto
                  </div>

                  {/* 5. Status Badge */}
                  <div className="col-span-3 sm:col-span-2 flex justify-end">
                    {isRecVerified ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        title={rec.reason || "Record successfully verified"}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Verified</span>
                      </span>
                    ) : isRecFailed ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 cursor-help"
                        title={rec.reason || "DNS record check failed or not propagated yet"}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-help"
                        title={rec.reason || "Awaiting DNS record publication or propagation"}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>Pending</span>
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
    <div className="space-y-6">
      {/* Group 1: Sending & Deliverability Records */}
      {renderTableSection(
        "Sending Records",
        "Mandatory records required for cryptographic signing, return-path SPF alignment, and DMARC enforcement.",
        sendingRecords,
        "sending"
      )}

      {/* Group 2: Inbound Email Receiving Record */}
      {renderTableSection(
        "Inbound Routing",
        "MX record for receiving inbound emails and processing direct replies on the root apex (@).",
        inboundRecords,
        "inbound"
      )}
    </div>
  );
}
