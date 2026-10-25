import React from "react";
import { Check, X } from "@phosphor-icons/react/dist/ssr";

interface CheckIndicatorProps {
  verified: boolean;
  name: string;
}

export function CheckIndicator({ verified, name }: CheckIndicatorProps) {
  if (verified) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#ecfdf5] text-[#059669]"
        title={`${name}: Verified`}
        aria-label={`${name}: Verified`}
      >
        <Check size={12} weight="bold" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#fef2f2] text-[#dc2626]"
      title={`${name}: Not verified`}
      aria-label={`${name}: Not verified`}
    >
      <X size={12} weight="bold" aria-hidden="true" />
    </span>
  );
}
