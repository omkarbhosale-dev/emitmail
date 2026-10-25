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
      <div className="max-w-md rounded-[4px] border border-[#fecaca] bg-white p-6 sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fef2f2] text-[#dc2626]">
          <WarningCircle size={26} weight="bold" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-section text-[#262626]">Failed to load dashboard data</h2>
        <p className="mt-2 text-support text-[#595959]">
          {error.message || "An unexpected error occurred while communicating with the EmitMail API."}
        </p>

        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => reset()} className="btn btn-primary">
            <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
