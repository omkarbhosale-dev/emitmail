import React from "react";
import type { DomainStatus } from "@/lib/api/types";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react/dist/ssr";

interface StatusPillProps {
  status: DomainStatus | string;
}

export function StatusPill({ status }: StatusPillProps) {
  const norm = status.toUpperCase();

  if (norm === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[9999px] border border-[#d1fae5] bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-medium text-[#065f46]">
        <CheckCircle size={13} weight="bold" />
        <span>Verified</span>
      </span>
    );
  }

  if (norm === "PENDING" || norm === "VERIFYING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[9999px] border border-[#fef3c7] bg-[#fffbeb] px-2 py-0.5 text-[11px] font-medium text-[#92400e]">
        <Clock size={13} weight="bold" />
        <span>{norm === "VERIFYING" ? "Verifying" : "Pending"}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-[9999px] border border-[#fee2e2] bg-[#fef2f2] px-2 py-0.5 text-[11px] font-medium text-[#991b1b]">
      <XCircle size={13} weight="bold" />
      <span>Failed</span>
    </span>
  );
}
