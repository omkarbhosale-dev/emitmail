"use client";

import React from "react";
import { Sparkle, ArrowRight, X, RocketLaunch } from "@phosphor-icons/react";
import { useSystemVersion } from "@/context/VersionContext";

export function SystemUpdateBanner() {
  const {
    versionData,
    isUpdateAvailable,
    setIsUpgradeModalOpen,
    dismissUpdate,
  } = useSystemVersion();

  if (!isUpdateAvailable || !versionData) {
    return null;
  }

  return (
    <div className="relative isolate flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-cf-orange/10 via-cf-orange/5 to-transparent border-b border-cf-orange/20 select-none text-xs transition-all">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cf-orange/15 text-cf-orange shrink-0">
          <Sparkle size={14} weight="fill" className="animate-pulse" />
        </div>

        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cf-orange text-white shadow-2xs">
            <RocketLaunch size={11} weight="fill" />
            New Update Available (v{versionData.latestVersion})
          </span>
          <span className="text-kumo-strong font-medium truncate hidden sm:inline">
            A new version of EmitMail is ready to install (current: v{versionData.currentVersion}).
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsUpgradeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-cf-orange hover:bg-cf-orange-hover text-white transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <span>Download & Install Update</span>
          <ArrowRight size={12} weight="bold" />
        </button>

        <button
          type="button"
          onClick={dismissUpdate}
          className="p-1 rounded-md text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-recessed transition-colors cursor-pointer"
          title="Dismiss notification for this release"
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

