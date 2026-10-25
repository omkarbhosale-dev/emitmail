"use client";

import { useEffect } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md rounded-[4px] border border-[#fee2e2] bg-white p-6 sm:p-8">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#fef2f2] text-[#dc2626]">
          <WarningCircle size={22} weight="bold" />
        </div>
        <h2 className="mt-4 text-[20px] font-normal tracking-tight text-[#262626]">
          Failed to load dashboard data
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#595959]">
          {error.message || "An unexpected error occurred while communicating with the EmitMail API."}
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center gap-2 rounded-[2px] bg-[#ff5e1f] px-4 text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#ff7038]"
          >
            <ArrowClockwise size={14} weight="bold" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
