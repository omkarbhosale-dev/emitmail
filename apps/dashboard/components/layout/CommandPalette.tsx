"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  House,
  Globe,
  EnvelopeSimple,
  Tray,
  ChartLineUp,
  Key,
  PlugsConnected,
  Gear,
  PaperPlaneTilt,
  X,
  ArrowRight,
} from "@phosphor-icons/react";
import { NavTab } from "@/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: NavTab) => void;
  onTriggerSendTestEmail: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectTab,
  onTriggerSendTestEmail,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // open command palette
          const event = new CustomEvent("open-command-palette");
          window.dispatchEvent(event);
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    {
      id: "send-test",
      label: "Send Test Email",
      category: "Action",
      icon: PaperPlaneTilt,
      action: () => {
        onClose();
        onTriggerSendTestEmail();
      },
    },
    {
      id: "nav-home",
      label: "Navigate to Home / Overview",
      category: "Navigation",
      icon: House,
      action: () => {
        router.push("/");
        onClose();
        onSelectTab?.("home");
      },
    },
    {
      id: "nav-emails",
      label: "Navigate to Email Dispatches",
      category: "Navigation",
      icon: EnvelopeSimple,
      action: () => {
        router.push("/emails");
        onClose();
        onSelectTab?.("emails");
      },
    },
    {
      id: "nav-inbox",
      label: "Navigate to Inbox & Inbound Feed",
      category: "Navigation",
      icon: Tray,
      action: () => {
        router.push("/inbox");
        onClose();
        onSelectTab?.("inbox");
      },
    },
    {
      id: "nav-analytics",
      label: "Navigate to Analytics & Timeseries",
      category: "Navigation",
      icon: ChartLineUp,
      action: () => {
        router.push("/analytics");
        onClose();
        onSelectTab?.("analytics");
      },
    },
    {
      id: "nav-domains",
      label: "Navigate to Domains & DNS Records",
      category: "Navigation",
      icon: Globe,
      action: () => {
        router.push("/domains");
        onClose();
        onSelectTab?.("domains");
      },
    },
    {
      id: "nav-api-keys",
      label: "Navigate to API Keys",
      category: "Navigation",
      icon: Key,
      action: () => {
        router.push("/api-keys");
        onClose();
        onSelectTab?.("api-keys");
      },
    },
    {
      id: "nav-webhooks",
      label: "Navigate to Webhooks",
      category: "Navigation",
      icon: PlugsConnected,
      action: () => {
        router.push("/webhooks");
        onClose();
        onSelectTab?.("webhooks");
      },
    },
    {
      id: "nav-settings",
      label: "Workspace Settings & Queue Concurrency",
      category: "Navigation",
      icon: Gear,
      action: () => {
        router.push("/settings");
        onClose();
        onSelectTab?.("settings");
      },
    },
  ];

  const filtered = actions.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Card */}
      <div className="relative w-full max-w-xl bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-kumo-hairline">
          <MagnifyingGlass size={18} className="text-cf-orange mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, destinations, or actions..."
            className="w-full bg-transparent text-sm text-kumo-strong placeholder:text-kumo-subtle focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="text-kumo-muted hover:text-kumo-strong p-1"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="px-1.5 py-0.5 text-[10px] bg-kumo-recessed border border-kumo-line rounded text-kumo-muted font-mono">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-kumo-subtle">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-kumo-elevated group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-kumo-control border border-kumo-hairline flex items-center justify-center text-kumo-subtle group-hover:text-cf-orange group-hover:border-cf-orange/40 transition-colors shrink-0">
                      <IconComp size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-kumo-strong block">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-kumo-subtle">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-kumo-muted group-hover:text-kumo-strong group-hover:translate-x-0.5 transition-all"
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-between text-[11px] text-kumo-subtle">
          <span>Navigate with mouse or keyboard</span>
          <span className="font-mono text-[10px]">EmitMail v1.0 • BullMQ</span>
        </div>
      </div>
    </div>
  );
}
