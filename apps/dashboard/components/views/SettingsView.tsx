"use client";

import React, { useState, useEffect } from "react";
import {
  Gear,
  Cpu,
  PaintBrush,
  Warning,
  Check,
  Sun,
  Moon,
  Desktop,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";

export function SettingsView() {
  const { toast } = useToast();
  const [workspaceName, setWorkspaceName] = useState("omkarbhosale.dev");
  const [defaultSender, setDefaultSender] = useState("notifications@omkarbhosale.dev");
  const [timezone, setTimezone] = useState("UTC (Coordinated Universal Time)");
  const [workerConcurrency, setWorkerConcurrency] = useState(12);
  const [maxRetries, setMaxRetries] = useState(3);
  const [exponentialBackoff, setExponentialBackoff] = useState(true);
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("emitmail-theme-mode") as "dark" | "light" | null;
    if (saved) {
      setThemeMode(saved);
    } else {
      setThemeMode("dark");
    }

    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setThemeMode(customEvent.detail);
      }
    };
    window.addEventListener("theme-changed", handleThemeEvent);
    return () => window.removeEventListener("theme-changed", handleThemeEvent);
  }, []);

  const handleThemeChange = (mode: "dark" | "light" | "system") => {
    setThemeMode(mode);
    let resolved = mode;
    if (mode === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-mode", resolved);
    try {
      localStorage.setItem("emitmail-theme-mode", resolved);
      window.dispatchEvent(new CustomEvent("theme-changed", { detail: resolved }));
    } catch {}
    toast({
      title: "Theme Updated",
      description: `Active color mode set to ${mode}.`,
      type: "info",
    });
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Workspace Settings Saved",
      description: "Default sender identity and timezone updated.",
      type: "success",
    });
  };

  const handleSaveQueue = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "BullMQ Engine Configured",
      description: `Worker concurrency updated to ${workerConcurrency} threads per node.`,
      type: "success",
    });
  };

  const handlePurgeQueue = () => {
    toast({
      title: "Failed Jobs Purged",
      description: "Cleared 0 dead-letter queue records from Redis.",
      type: "warning",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-4xl">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
          Workspace Settings
        </h1>
        <p className="text-xs text-kumo-subtle mt-1">
          Manage your EmitMail instance configuration, SMTP relay defaults, and BullMQ worker concurrency.
        </p>
      </div>

      {/* 2. General Settings Card */}
      <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
          <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
            <Gear size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-kumo-strong">
              General Settings
            </h3>
            <p className="text-[11px] text-kumo-subtle">
              Global workspace identity and default sender headers
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Default Sender Address
              </label>
              <input
                type="email"
                value={defaultSender}
                onChange={(e) => setDefaultSender(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
              Workspace Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full sm:w-80 bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange cursor-pointer"
            >
              <option value="UTC (Coordinated Universal Time)">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York (EST)">America/New_York (EST)</option>
              <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
              <option value="Europe/London (GMT)">Europe/London (GMT)</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn-cf-primary"
            >
              Save General Changes
            </button>
          </div>
        </form>
      </section>

      {/* 3. Worker & Queue Engine Settings */}
      <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
          <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
            <Cpu size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-kumo-strong">
              Worker & Queue Engine (BullMQ)
            </h3>
            <p className="text-[11px] text-kumo-subtle">
              Redis queue worker concurrency, retry backoff algorithms, and rate limits
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveQueue} className="space-y-5 pt-1">
          {/* Concurrency Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-kumo-strong">
                BullMQ Worker Concurrency per Node
              </label>
              <span className="font-mono text-xs font-bold text-cf-orange bg-cf-orange-tint px-2 py-0.5 rounded border border-cf-orange-border/40">
                {workerConcurrency} Workers
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={workerConcurrency}
              onChange={(e) => setWorkerConcurrency(Number(e.target.value))}
              className="w-full accent-cf-orange cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-kumo-muted mt-1 font-mono">
              <span>1 Worker (Low memory)</span>
              <span>25 Workers</span>
              <span>50 Workers (10,000 req/sec)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Maximum Retry Attempts
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-kumo-recessed border border-kumo-hairline cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={exponentialBackoff}
                  onChange={(e) => setExponentialBackoff(e.target.checked)}
                  className="accent-cf-orange"
                />
                <span className="font-medium text-kumo-strong">
                  Enable Exponential Backoff (10s, 30s, 90s)
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn-cf-primary"
            >
              Update Queue Configuration
            </button>
          </div>
        </form>
      </section>

      {/* 4. Appearance Preference Cards */}
      <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
          <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
            <PaintBrush size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-kumo-strong">
              Appearance Preference
            </h3>
            <p className="text-[11px] text-kumo-subtle">
              Toggle between Cloudflare Pitch-Black Dark Mode and Crisp Light Mode
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              themeMode === "dark"
                ? "border-cf-orange bg-cf-orange-tint/40 shadow-xs ring-1 ring-cf-orange"
                : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#0C0C0C] border border-[#1E1E1E] flex items-center justify-center text-[#E5E5E5]">
                <Moon size={16} weight="bold" />
              </div>
              {themeMode === "dark" && (
                <span className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center text-[10px]">
                  <Check size={12} weight="bold" />
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-kumo-strong block">
              Dark Mode
            </span>
            <span className="text-[11px] text-kumo-subtle block mt-0.5">
              Pitch black canvas (#050505) with dark charcoal cards
            </span>
          </button>

          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              themeMode === "light"
                ? "border-cf-orange bg-cf-orange-tint/40 shadow-xs ring-1 ring-cf-orange"
                : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E5E5E5] flex items-center justify-center text-[#111111]">
                <Sun size={16} weight="bold" />
              </div>
              {themeMode === "light" && (
                <span className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center text-[10px]">
                  <Check size={12} weight="bold" />
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-kumo-strong block">
              Light Mode
            </span>
            <span className="text-[11px] text-kumo-subtle block mt-0.5">
              Crisp off-white canvas (#FBFBFB) with pure white cards
            </span>
          </button>

          {/* System Mode Card */}
          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              themeMode === "system"
                ? "border-cf-orange bg-cf-orange-tint/40 shadow-xs ring-1 ring-cf-orange"
                : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-kumo-elevated border border-kumo-hairline flex items-center justify-center text-kumo-default">
                <Desktop size={16} weight="bold" />
              </div>
              {themeMode === "system" && (
                <span className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center text-[10px]">
                  <Check size={12} weight="bold" />
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-kumo-strong block">
              System Preference
            </span>
            <span className="text-[11px] text-kumo-subtle block mt-0.5">
              Automatically synchronize with OS color scheme
            </span>
          </button>
        </div>
      </section>

      {/* 5. Danger Zone */}
      <section className="bg-kumo-danger-tint/20 border border-kumo-danger/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-danger/20">
          <div className="w-8 h-8 rounded-lg bg-kumo-danger/10 border border-kumo-danger/30 flex items-center justify-center text-kumo-danger">
            <Warning size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-kumo-danger">
              Danger Zone
            </h3>
            <p className="text-[11px] text-kumo-subtle">
              Destructive actions affecting queues, Redis buffers, and workspace credentials
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-kumo-base border border-kumo-hairline">
            <div>
              <span className="text-xs font-semibold text-kumo-strong block">
                Purge Dead Letter Queue (DLQ)
              </span>
              <span className="text-[11px] text-kumo-subtle block mt-0.5">
                Permanently purge all stalled or failed message jobs without triggering retry attempts.
              </span>
            </div>
            <button
              onClick={handlePurgeQueue}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors shrink-0"
            >
              Purge Failed Jobs
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-kumo-base border border-kumo-hairline">
            <div>
              <span className="text-xs font-semibold text-kumo-strong block">
                Rotate Workspace Master Key
              </span>
              <span className="text-[11px] text-kumo-subtle block mt-0.5">
                Invalidates all active developer session cookies and triggers re-authentication.
              </span>
            </div>
            <button
              onClick={() => {
                toast({
                  title: "Master Secret Rotated",
                  description: "Workspace session token renewed.",
                  type: "warning",
                });
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors shrink-0"
            >
              Rotate Key
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
