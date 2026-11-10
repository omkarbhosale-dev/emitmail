"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  ArrowsClockwise,
  ShieldCheck,
  EnvelopeSimple,
  Info,
  WarningCircle,
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
  onRotateDkim,
  isRotatingDkim = false,
  isViewer = false,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {groupType === "sending" ? (
                <div className="w-6 h-6 rounded-md bg-cf-orange/15 text-cf-orange flex items-center justify-center shrink-0">
                  <ShieldCheck size={14} weight="bold" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-md bg-cf-blue/15 text-cf-blue flex items-center justify-center shrink-0">
                  <EnvelopeSimple size={14} weight="bold" />
                </div>
              )}
              <h3 className="text-sm font-semibold text-kumo-strong">
                {title}
              </h3>
              <span
                className={`text-2xs font-mono font-medium px-2 py-0.5 rounded-full ${
                  groupType === "sending"
                    ? "bg-cf-orange/10 text-cf-orange border border-cf-orange/20"
                    : "bg-cf-blue/10 text-cf-blue border border-cf-blue/20"
                }`}
              >
                {groupType === "sending" ? "Required for Sending" : "Inbound Mail"}
              </span>
            </div>
            <p className="text-xs text-kumo-subtle mt-0.5">{subtitle}</p>
          </div>

          {/* Optional DKIM Regenerate button in sending header */}
          {groupType === "sending" && onRotateDkim && !isViewer && (
            <button
              type="button"
              onClick={onRotateDkim}
              disabled={isRotatingDkim}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-kumo-elevated hover:bg-kumo-control border border-kumo-line text-kumo-strong flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
              title="Regenerate a brand-new 2048-bit RSA DKIM key"
            >
              <ArrowsClockwise
                size={12}
                className={isRotatingDkim ? "animate-spin text-cf-orange" : ""}
              />
              <span>{isRotatingDkim ? "Generating..." : "Regenerate 2048-bit Key"}</span>
            </button>
          )}
        </div>

        {/* Informational Callout for Inbound MX */}
        {groupType === "inbound" && showInboundToggleNote && (
          <div className="p-3 rounded-xl bg-kumo-control/60 border border-kumo-line/80 text-xs text-kumo-subtle flex items-start gap-2.5 leading-relaxed">
            <Info size={16} className="text-cf-blue shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-kumo-strong">
                Receiving Email Notice:{" "}
              </span>
              Add this record if you want EmitMail to receive incoming emails and replies on your root domain (
              <code className="text-2xs font-mono text-cf-orange">@</code>
              ). If you already route inbound mail to an external provider (such as Google Workspace or Microsoft 365), you can keep your existing MX records without affecting outbound sending.
            </div>
          </div>
        )}

        {/* DNS Table Container */}
        <div className="border border-kumo-line rounded-xl overflow-hidden bg-kumo-base shadow-2xs">
          {/* Header Row */}
          <div className="bg-kumo-elevated/70 border-b border-kumo-line px-4 py-2.5 grid grid-cols-12 gap-3 text-2xs uppercase tracking-wider text-kumo-subtle font-medium items-center select-none">
            <div className="col-span-2 sm:col-span-1">Type</div>
            <div className="col-span-3 sm:col-span-3">Host / Name</div>
            <div className="col-span-4 sm:col-span-5">Value / Content</div>
            <div className="col-span-1 sm:col-span-1 hidden sm:block">TTL</div>
            <div className="col-span-3 sm:col-span-2 text-right">Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-kumo-hairline">
            {records.map((rec) => {
              const isRecVerified = rec.status === "VERIFIED";
              const isRecFailed = rec.status === "FAILED";
              const isNameCopied = copiedKey === `name-${rec.id}`;
              const isContentCopied = copiedKey === `val-${rec.id}`;

              return (
                <div
                  key={rec.id}
                  className="grid grid-cols-12 gap-3 px-4 py-3 text-xs items-center hover:bg-kumo-recessed/50 transition-colors group"
                >
                  {/* 1. Type & Priority */}
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-semibold text-kumo-strong">
                      {rec.type}
                    </span>
                    {rec.type === "MX" && rec.priority && (
                      <span className="text-3xs font-mono text-kumo-subtle">
                        (Pri {rec.priority})
                      </span>
                    )}
                  </div>

                  {/* 2. Host / Name (Click to copy) */}
                  <div
                    onClick={() => copyToClipboard(rec.host, `name-${rec.id}`)}
                    title={`Click to copy: ${rec.host}`}
                    className="col-span-3 sm:col-span-3 font-mono text-xs cursor-pointer hover:text-cf-orange transition-colors flex items-center gap-1.5 min-w-0 select-none group/name"
                  >
                    <span className="truncate font-medium text-kumo-strong group-hover/name:text-cf-orange">
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
                        className="text-kumo-subtle opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0"
                      />
                    )}
                  </div>

                  {/* 3. Value / Content (Click to copy) */}
                  <div
                    onClick={() => copyToClipboard(rec.value, `val-${rec.id}`)}
                    title={`Click to copy: ${rec.value}`}
                    className="col-span-4 sm:col-span-5 font-mono text-xs cursor-pointer hover:text-white transition-colors flex items-center justify-between gap-2 min-w-0 select-none group/val"
                  >
                    <span className="truncate text-kumo-default group-hover/val:text-white font-mono">
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
                        className="text-kumo-subtle opacity-0 group-hover/val:opacity-100 transition-opacity shrink-0"
                      />
                    )}
                  </div>

                  {/* 4. TTL */}
                  <div className="col-span-1 sm:col-span-1 font-mono text-kumo-subtle text-xs hidden sm:block">
                    Auto
                  </div>

                  {/* 5. Status Badge */}
                  <div className="col-span-3 sm:col-span-2 flex justify-end">
                    {isRecVerified ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-emerald-950/60 border border-emerald-500/30 text-emerald-400"
                        title={rec.reason || "Record successfully verified"}
                      >
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        <span>Verified</span>
                      </span>
                    ) : isRecFailed ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-rose-950/60 border border-rose-500/30 text-rose-400 cursor-help"
                        title={rec.reason || "DNS record check failed or not propagated yet"}
                      >
                        <span className="w-1 h-1 rounded-full bg-rose-400" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-amber-950/60 border border-amber-500/30 text-amber-400 cursor-help"
                        title={rec.reason || "Awaiting DNS record publication or propagation"}
                      >
                        <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
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
        "Group 1: Sending & Deliverability Records",
        "Mandatory records required for cryptographic signing, return-path SPF alignment, and DMARC enforcement.",
        sendingRecords,
        "sending"
      )}

      {/* Group 2: Inbound Email Receiving Record */}
      {renderTableSection(
        "Group 2: Inbound Email Receiving Record",
        "MX record for receiving inbound emails and processing direct replies on the root apex (@).",
        inboundRecords,
        "inbound"
      )}
    </div>
  );
}

