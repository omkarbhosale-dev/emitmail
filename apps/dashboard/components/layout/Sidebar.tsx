"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Globe,
  PaperPlaneTilt,
  Tray,
  ChartLineUp,
  Key,
  PlugsConnected,
  Gear,
  MagnifyingGlass,
  CaretUpDown,
  X,
  Plus,
  Check,
  SignOut,
  Sparkle,
} from "@phosphor-icons/react";
import { NavTab, ApiDomain } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSystemVersion } from "@/context/VersionContext";
import { api } from "@/lib/api";
import { Facehash } from "facehash";

function PanelLeftClose({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  );
}

function PanelLeftOpen({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </svg>
  );
}

interface SidebarProps {
  currentTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenCommandPalette?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItemConfig[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Core",
    items: [
      { id: "home", label: "Overview", href: "/", icon: House },
      { id: "emails", label: "Emails", href: "/emails", icon: PaperPlaneTilt },
      { id: "inbox", label: "Inbox", href: "/inbox", icon: Tray },
      { id: "domains", label: "Domains", href: "/domains", icon: Globe },
    ],
  },
  {
    label: "Telemetry & Dev",
    items: [
      { id: "analytics", label: "Analytics", href: "/analytics", icon: ChartLineUp },
      { id: "api-keys", label: "API Keys", href: "/api-keys", icon: Key },
      { id: "webhooks", label: "Webhooks", href: "/webhooks", icon: PlugsConnected },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "settings", label: "Settings", href: "/settings", icon: Gear },
    ],
  },
];

export function Sidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenCommandPalette,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { versionData, isUpdateAvailable, setIsUpgradeModalOpen } = useSystemVersion();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [activeDomainName, setActiveDomainName] = useState<string | null>(null);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const domainDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Auto-close mobile drawer strictly on route change
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      onCloseMobile();
      setIsDomainDropdownOpen(false);
      setIsAccountMenuOpen(false);
    }
  }, [pathname, onCloseMobile]);

  // Compute display details
  const displayName =
    currentUser?.fullName ||
    (currentUser?.role === "ADMIN" ? "Administrator" : currentUser?.username) ||
    "Administrator";
  const displayUsername = currentUser?.username || "admin";

  const rawVersion = versionData?.currentVersion || "0.30.8";
  const currentVersionFormatted = rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;
  const latestVer = versionData?.latestVersion || versionData?.currentVersion || "0.30.8";
  const latestVersionFormatted = latestVer.startsWith("v") ? latestVer : `v${latestVer}`;

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        domainDropdownRef.current &&
        !domainDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDomainDropdownOpen(false);
      }
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch domains & unread inbox counts
  useEffect(() => {
    let isMounted = true;

    const fetchDomains = async () => {
      try {
        const domainList = await api.domains.list();
        if (isMounted && Array.isArray(domainList)) {
          setDomains(domainList);
          if (domainList.length > 0) {
            const verified = domainList.find((d) => d.status === "VERIFIED");
            setActiveDomainName(verified ? verified.domainName : domainList[0].domainName);
          } else {
            setActiveDomainName(null);
          }
        }
      } catch {
        if (isMounted) {
          setDomains([]);
          setActiveDomainName(null);
        }
      }
    };

    fetchDomains();

    const fetchUnread = async () => {
      try {
        const mailboxes = await api.inbox.listMailboxes();
        if (isMounted) {
          const count = mailboxes.reduce((acc, m) => acc + (m.unreadCount || 0), 0);
          setUnreadCount(count);
        }
      } catch {
        // Fallback
      }
    };

    fetchUnread();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === "number") {
        setUnreadCount(customEvent.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };

    window.addEventListener("inbox-unread-updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("inbox-unread-updated", handleUpdate);
    };
  }, [pathname]);

  const isRouteActive = (href: string, tabId: NavTab): boolean => {
    if (currentTab) {
      return currentTab === tabId;
    }
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleItemClick = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    onCloseMobile();
    setIsDomainDropdownOpen(false);
    setIsAccountMenuOpen(false);
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* MOBILE EXPERIENCE (< lg)                                       */}
      {/* ------------------------------------------------------------- */}

      {/* Slide-over Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col p-4 shadow-2xl transition-transform duration-200 ease-in-out select-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between shrink-0 pb-4 mb-4 border-b border-zinc-800/80">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center group cursor-pointer"
          >
            <span className="font-logo font-extrabold text-2xl tracking-tight text-[#FF6600] lowercase select-none">
              emitmail
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Search in Mobile Drawer (Above Domain Switcher) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenCommandPalette();
            }}
            className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg px-3 h-9 text-xs text-zinc-400 flex items-center justify-between transition-colors cursor-pointer group mb-3 shrink-0"
            title="Search (Ctrl + K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MagnifyingGlass size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              <span className="truncate">Quick search...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-2xs font-mono text-zinc-400 bg-zinc-800 border border-zinc-700/60 rounded shrink-0">
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Domain Switcher in Mobile Drawer */}
        <div className="shrink-0 mb-4" ref={domainDropdownRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
              title={activeDomainName ? `Domain: ${activeDomainName}` : "Add domain"}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center shrink-0 border border-zinc-700/60">
                  {activeDomainName ? activeDomainName.charAt(0).toUpperCase() : <Plus size={11} weight="bold" />}
                </span>
                <span className="truncate font-medium text-zinc-200">
                  {activeDomainName || "Select Domain"}
                </span>
              </div>
              <CaretUpDown size={14} className="text-zinc-500 shrink-0" />
            </button>

            {isDomainDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-800 shadow-xl py-1 text-xs z-50">
                {domains.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto py-1">
                    {domains.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setActiveDomainName(d.domainName);
                          setIsDomainDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-900 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe size={13} className="text-zinc-500 shrink-0" />
                          <span className="truncate font-mono text-zinc-300">{d.domainName}</span>
                        </div>
                        {activeDomainName === d.domainName && (
                          <Check size={13} className="text-[#FF6600] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-zinc-500 text-xs">No domains configured</div>
                )}
                <div className="border-t border-zinc-800/80 pt-1 mt-1">
                  <Link
                    href="/domains"
                    onClick={() => {
                      setIsDomainDropdownOpen(false);
                      onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:bg-zinc-900 transition-colors font-medium cursor-pointer"
                  >
                    <Plus size={13} weight="bold" />
                    <span>Manage all domains</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                {group.label}
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isRouteActive(item.href, item.id);
                  const isInbox = item.id === "inbox";
                  const showInboxBadge = isInbox && unreadCount > 0;

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => handleItemClick(item.id)}
                        className={cn(
                          "h-10 px-3 rounded-lg flex items-center justify-between text-[15px] font-medium transition-colors cursor-pointer select-none",
                          isActive
                            ? "bg-zinc-900 text-zinc-100 font-semibold border border-zinc-800/80 shadow-sm"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            size={20}
                            weight={isActive ? "fill" : "regular"}
                            className={cn(
                              "shrink-0 transition-colors",
                              isActive ? "text-[#FF6600]" : "text-zinc-400"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {showInboxBadge && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-medium flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Mobile Drawer Footer */}
        <div className="border-t border-zinc-800/80 pt-3 mt-4 shrink-0 space-y-2">
          {isUpdateAvailable && (
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                setIsUpgradeModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-400 hover:bg-emerald-950/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkle size={13} weight="fill" />
                Update available
              </span>
              <span className="font-mono text-2xs">{latestVersionFormatted}</span>
            </button>
          )}

          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-800 bg-zinc-900">
                <Facehash name={displayUsername} size={32} interactive={false} />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm text-zinc-200 truncate leading-tight">{displayName}</div>
                <div className="text-xs text-zinc-400 truncate leading-tight mt-0.5">{currentUser?.email || `@${displayUsername}`}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/settings"
                onClick={onCloseMobile}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                title="Settings"
                aria-label="Settings"
              >
                <Gear size={16} />
              </Link>
              <button
                type="button"
                onClick={() => api.auth.logout()}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                title="Log out"
                aria-label="Log out"
              >
                <SignOut size={16} />
              </button>
            </div>
          </div>

          {/* Current Version Indicator in Mobile Drawer */}
          <div className="text-center text-xs font-mono text-zinc-500 select-none pt-1">
            Version {currentVersionFormatted}
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP EXPERIENCE (lg:flex)                                   */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-full bg-zinc-950 border-r border-zinc-800/80 select-none relative z-20 transition-[width] duration-200 ease-in-out",
          isCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Desktop Brand Header */}
        <div
          className={cn(
            "h-14 px-3 flex items-center shrink-0 border-b border-zinc-800/80",
            isCollapsed ? "justify-center relative" : "justify-between"
          )}
        >
          {isCollapsed ? (
            <>
              <Link
                href="/"
                title="emitmail"
                className="flex items-center justify-center cursor-pointer"
              >
                <span className="font-logo font-extrabold text-2xl text-[#FF6600] lowercase select-none">
                  e
                </span>
              </Link>
              {/* Expand Toggle Button on Edge */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center shadow-md cursor-pointer hover:bg-zinc-800 z-30 transition-transform focus:outline-none"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={12} />
              </button>
            </>
          ) : (
            <>
              <Link href="/" className="flex items-center group cursor-pointer min-w-0">
                <span className="font-logo font-extrabold text-2xl tracking-tight text-[#FF6600] lowercase select-none">
                  emitmail
                </span>
              </Link>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer focus:outline-none"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-4">
          {/* Quick Search Trigger (Above Domain Switcher) */}
          {onOpenCommandPalette && (
            isCollapsed ? (
              <div className="relative group mb-3">
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  aria-label="Quick search (Ctrl + K)"
                  className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <MagnifyingGlass size={18} />
                </button>
                <div className="pointer-events-none fixed left-[74px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                  Quick Search (Ctrl + K)
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg px-2.5 h-9 text-xs text-zinc-400 flex items-center justify-between transition-colors cursor-pointer group mb-3"
                title="Search (Ctrl + K)"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MagnifyingGlass size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
                  <span className="truncate">Quick search...</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-2xs font-mono text-zinc-400 bg-zinc-800 border border-zinc-700/60 rounded shrink-0">
                  Ctrl K
                </kbd>
              </button>
            )
          )}

          {/* Domain Quick Switcher (Expanded only) */}
          {!isCollapsed && (
            <div className="relative" ref={domainDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors group cursor-pointer"
                title={activeDomainName ? `Active domain: ${activeDomainName}` : "Add domain"}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 font-mono text-2xs flex items-center justify-center shrink-0 border border-zinc-700/60">
                    {activeDomainName ? activeDomainName.charAt(0).toUpperCase() : <Plus size={10} weight="bold" />}
                  </span>
                  <span className="truncate font-mono text-zinc-300">
                    {activeDomainName || "Select Domain"}
                  </span>
                </div>
                <CaretUpDown size={13} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              </button>

              {isDomainDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-full rounded-lg bg-zinc-950 border border-zinc-800 shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                  {domains.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto py-1">
                      {domains.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setActiveDomainName(d.domainName);
                            setIsDomainDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-900 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe size={13} className="text-zinc-500 shrink-0" />
                            <span className="truncate font-mono text-zinc-300">{d.domainName}</span>
                          </div>
                          {activeDomainName === d.domainName && (
                            <Check size={13} className="text-[#FF6600] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-zinc-500 text-xs">No domains configured</div>
                  )}
                  <div className="border-t border-zinc-800/80 pt-1 mt-1">
                    <Link
                      href="/domains"
                      onClick={() => {
                        setIsDomainDropdownOpen(false);
                        handleItemClick("domains");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:bg-zinc-900 transition-colors font-medium cursor-pointer"
                    >
                      <Plus size={13} weight="bold" />
                      <span>Manage all domains</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grouped Nav Items */}
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={group.label} className={groupIdx > 0 ? "pt-1" : ""}>
              {!isCollapsed ? (
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                  {group.label}
                </div>
              ) : (
                groupIdx > 0 && <div className="border-t border-zinc-800/60 my-2 mx-1" />
              )}

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isRouteActive(item.href, item.id);
                  const isInbox = item.id === "inbox";
                  const showInboxBadge = isInbox && unreadCount > 0;

                  if (isCollapsed) {
                    return (
                      <li key={item.id} className="relative group">
                        <Link
                          href={item.href}
                          onClick={() => handleItemClick(item.id)}
                          aria-label={item.label}
                          className={cn(
                            "w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-colors cursor-pointer select-none relative",
                            isActive
                              ? "bg-zinc-900 text-zinc-100 border border-zinc-800/80 shadow-sm"
                              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                          )}
                        >
                          <Icon
                            size={20}
                            weight={isActive ? "fill" : "regular"}
                            className={cn(
                              "shrink-0 transition-colors",
                              isActive ? "text-[#FF6600]" : "text-zinc-400 group-hover:text-zinc-200"
                            )}
                          />
                          {showInboxBadge && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6600] ring-2 ring-zinc-950" />
                          )}
                        </Link>

                        {/* Floating Tooltip in Collapsed Mode */}
                        <div className="pointer-events-none fixed left-[74px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                          {item.label}
                          {showInboxBadge && ` (${unreadCount})`}
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => handleItemClick(item.id)}
                        className={cn(
                          "h-10 px-3 rounded-lg flex items-center justify-between text-[15px] font-medium transition-colors select-none group cursor-pointer",
                          isActive
                            ? "bg-zinc-900 text-zinc-100 font-semibold border border-zinc-800/80 shadow-sm"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            size={20}
                            weight={isActive ? "fill" : "regular"}
                            className={cn(
                              "shrink-0 transition-colors",
                              isActive ? "text-[#FF6600]" : "text-zinc-400 group-hover:text-zinc-200"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {showInboxBadge && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-medium flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Desktop Pinned Footer */}
        <div className="border-t border-zinc-800/80 p-3 shrink-0 space-y-2">
          {/* Update Available Badge */}
          {isUpdateAvailable && (
            isCollapsed ? (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  aria-label="Update available"
                  className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60 transition-colors cursor-pointer relative"
                >
                  <Sparkle size={18} weight="fill" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </button>
                <div className="pointer-events-none fixed left-[74px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                  Update available ({latestVersionFormatted})
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-400 hover:bg-emerald-950/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkle size={13} weight="fill" />
                  Update available
                </span>
                <span className="font-mono text-2xs">{latestVersionFormatted}</span>
              </button>
            )
          )}

          {/* User Profile Row */}
          <div className="relative pt-1" ref={accountMenuRef}>
            {isCollapsed ? (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  aria-label="Account menu"
                  aria-expanded={isAccountMenuOpen}
                  className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center hover:bg-zinc-900 transition-colors cursor-pointer focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-800 bg-zinc-900">
                    <Facehash name={displayUsername} size={32} interactive={false} />
                  </div>
                </button>
                <div className="pointer-events-none fixed left-[74px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                  {displayName} (@{displayUsername})
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer group text-left select-none focus:outline-none border border-transparent hover:border-zinc-800"
                aria-label="User account menu"
                aria-expanded={isAccountMenuOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-zinc-800 bg-zinc-900">
                    <Facehash name={displayUsername} size={32} interactive={false} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-zinc-200 truncate leading-tight">
                      {displayName}
                    </div>
                    <div className="text-xs text-zinc-400 truncate leading-tight mt-0.5">
                      {currentUser?.email || `@${displayUsername}`}
                    </div>
                  </div>
                </div>
                <CaretUpDown size={15} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              </button>
            )}

            {/* Profile Dropup Menu */}
            {isAccountMenuOpen && (
              <div
                className={cn(
                  "rounded-lg bg-zinc-950 border border-zinc-800 shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100",
                  isCollapsed ? "absolute bottom-0 left-full ml-3 w-56" : "absolute bottom-full left-0 mb-2 w-full"
                )}
              >
                <div className="px-3 py-2 border-b border-zinc-800/80">
                  <div className="font-medium text-zinc-200 truncate">{displayName}</div>
                  <div className="text-2xs text-zinc-400 font-mono truncate">{currentUser?.email || `@${displayUsername}`}</div>
                </div>
                <Link
                  href="/settings"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    handleItemClick("settings");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
                >
                  <Gear size={14} />
                  <span>Workspace Settings</span>
                </Link>
                <div className="px-3 py-1.5 text-2xs font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-800/60">
                  <span>Version</span>
                  <span>{currentVersionFormatted}</span>
                </div>
                <div className="border-t border-zinc-800/80 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    api.auth.logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                >
                  <SignOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>

          {/* Current Version Indicator below user profile row */}
          {!isCollapsed ? (
            <div className="pt-2 text-center text-xs font-mono text-zinc-500 select-none tracking-tight">
              Version {currentVersionFormatted}
            </div>
          ) : (
            <div
              className="pt-1.5 text-center text-3xs font-mono text-zinc-500 select-none cursor-default"
              title={`EmitMail ${currentVersionFormatted}`}
            >
              {currentVersionFormatted}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
