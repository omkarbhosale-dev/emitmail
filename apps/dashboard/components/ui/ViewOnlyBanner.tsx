"use client";

import React from "react";
import { Eye, Lock } from "@phosphor-icons/react";

interface ViewOnlyBannerProps {
  message?: string;
  className?: string;
}

export function ViewOnlyBanner({
  message = "You are currently in View-Only mode. You can view all analytics, logs, and configurations, but cannot create, modify, or delete resources.",
  className = "",
}: ViewOnlyBannerProps) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-kumo-elevated border border-kumo-hairline text-kumo-subtle text-xs ${className}`}
    >
      <div className="w-5 h-5 rounded-md bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
        <Eye size={13} weight="bold" />
      </div>
      <span className="leading-snug flex-1 font-medium text-kumo-default">
        {message}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-kumo-recessed border border-kumo-hairline text-kumo-subtle shrink-0">
        <Lock size={10} weight="bold" />
        View Only
      </span>
    </div>
  );
}
