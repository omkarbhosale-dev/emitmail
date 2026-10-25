import React from "react";
import type { DomainStatus } from "@/lib/api/types";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react/dist/ssr";

interface StatusPillProps {
  status: DomainStatus | string;
}

const BASE =
  "inline-flex h-7 items-center gap-1.5 rounded-[9999px] border px-2.5 text-meta font-medium whitespace-nowrap";

export function StatusPill({ status }: StatusPillProps) {
  const norm = status.toUpperCase();

  if (norm === "VERIFIED") {
    return (
      <span className={`${BASE} border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]`}>
        <CheckCircle size={16} weight="bold" aria-hidden="true" />
        <span>Verified</span>
      </span>
    );
  }

  if (norm === "PENDING" || norm === "VERIFYING") {
    return (
      <span className={`${BASE} border-[#fde68a] bg-[#fffbeb] text-[#92400e]`}>
        <Clock size={16} weight="bold" aria-hidden="true" />
        <span>{norm === "VERIFYING" ? "Verifying" : "Pending"}</span>
      </span>
    );
  }

  return (
    <span className={`${BASE} border-[#fecaca] bg-[#fef2f2] text-[#991b1b]`}>
      <XCircle size={16} weight="bold" aria-hidden="true" />
      <span>Failed</span>
    </span>
  );
}
