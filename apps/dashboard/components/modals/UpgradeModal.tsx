"use client";

import React, { useState } from "react";
import {
  X,
  Sparkle,
  ArrowSquareOut,
  ArrowsClockwise,
  Copy,
  Check,
  Terminal,
  CalendarBlank,
  RocketLaunch,
  CircleNotch,
} from "@phosphor-icons/react";
import { useSystemVersion } from "@/context/VersionContext";
import { useToast } from "@/components/ui/Toast";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { versionData, isChecking, refresh, dismissUpdate } = useSystemVersion();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !versionData) return null;

  const updateCommand =
    versionData.updateCommand || "git pull origin main && docker compose up -d --build";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(updateCommand);
      setCopied(true);
      toast({
        title: "Copied to Clipboard",
        description: "Terminal upgrade command ready to paste into your VPS shell.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to Copy",
        description: "Please manually copy the upgrade command.",
        type: "error",
      });
    }
  };

  const handleDismiss = () => {
    dismissUpdate();
    onClose();
    toast({
      title: "Notification Dismissed",
      description: `Updates for v${versionData.latestVersion} will stay hidden until the next release.`,
      type: "info",
    });
  };

  const handleRefresh = async () => {
    await refresh(true);
    toast({
      title: "Version Check Complete",
      description: "Fetched latest release telemetry from GitHub.",
      type: "info",
    });
  };

  const formattedDate = versionData.publishedAt
    ? new Date(versionData.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-kumo-hairline">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cf-orange/10 border border-cf-orange/20 flex items-center justify-center text-cf-orange shrink-0 mt-0.5">
              <RocketLaunch size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-cf-orange animate-pulse" />
                  New Release Available
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-kumo-recessed text-kumo-subtle border border-kumo-hairline">
                  v{versionData.currentVersion} → v{versionData.latestVersion}
                </span>
              </div>
              <h2 className="text-lg font-bold text-kumo-strong tracking-tight">
                {versionData.releaseName || `EmitMail v${versionData.latestVersion}`}
              </h2>
              {formattedDate && (
                <p className="text-xs text-kumo-subtle flex items-center gap-1.5 mt-0.5">
                  <CalendarBlank size={13} />
                  Published {formattedDate}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-recessed transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Release Notes / Changelog */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle">
                Release Notes & Changelog
              </span>
              <a
                href={versionData.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cf-orange hover:underline inline-flex items-center gap-1 font-medium"
              >
                GitHub Tag
                <ArrowSquareOut size={12} />
              </a>
            </div>
            <div className="bg-kumo-recessed border border-kumo-hairline rounded-xl p-4 text-xs font-mono text-kumo-default max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
              {versionData.releaseNotes && versionData.releaseNotes.trim().length > 0 ? (
                versionData.releaseNotes
              ) : (
                <div className="text-kumo-subtle italic py-3 text-center">
                  No release notes provided for this version. Check GitHub releases for commits.
                </div>
              )}
            </div>
          </div>

          {/* Upgrade Terminal Command Block */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle flex items-center gap-1.5">
                <Terminal size={14} />
                Host Upgrade Command
              </span>
              <span className="text-xs text-kumo-subtle">Run on your VPS host terminal</span>
            </div>
            <div className="relative group bg-kumo-canvas border border-kumo-line rounded-xl p-3 flex items-center justify-between gap-3">
              <code className="font-mono text-xs text-kumo-strong break-all select-all">
                {updateCommand}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-kumo-base hover:bg-kumo-recessed border border-kumo-hairline text-kumo-default hover:text-kumo-strong transition-all cursor-pointer shadow-xs active:scale-95"
                title="Copy command"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-cf-success" weight="bold" />
                    <span className="text-cf-success font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-kumo-recessed/40 border-t border-kumo-hairline flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kumo-default hover:text-kumo-strong hover:bg-kumo-recessed border border-kumo-hairline transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowsClockwise
                size={14}
                className={isChecking ? "animate-spin" : ""}
              />
              <span>Check again</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-kumo-subtle hover:text-kumo-default px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Dismiss for this version
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={versionData.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-cf-orange text-white hover:bg-cf-orange-hover transition-colors shadow-sm cursor-pointer"
            >
              <span>View on GitHub</span>
              <ArrowSquareOut size={14} weight="bold" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

