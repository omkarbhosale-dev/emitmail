"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Globe,
  EnvelopeSimple,
  Tray,
  ChartLineUp,
  Key,
  PlugsConnected,
  Gear,
  MagnifyingGlass,
  CaretUpDown,
  CaretUp,
  X,
  Plus,
  Check,
  SignOut,
  Sun,
  Moon,
  PaperPlaneTilt,
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

function RefreshCw({
  size = 18,
  className = "",
  weight,
}: {
  size?: number;
  className?: string;
  weight?: "regular" | "bold" | "fill";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight === "fill" || weight === "bold" ? "2.25" : "1.85"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
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
  badge?: string;
  onClick?: () => void;
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { id: "home", label: "Home", href: "/", icon: House },
  { id: "emails", label: "Email", href: "/emails", icon: EnvelopeSimple },
  { id: "inbox", label: "Inbox", href: "/inbox", icon: Tray },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: ChartLineUp },
  { id: "domains", label: "Domains", href: "/domains", icon: Globe },
  { id: "api-keys", label: "API Keys", href: "/api-keys", icon: Key },
  { id: "webhooks", label: "Webhooks", href: "/webhooks", icon: PlugsConnected, badge: "Live" },
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
  const { versionData, isUpgradeModalOpen, setIsUpgradeModalOpen } = useSystemVersion();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [activeDomainName, setActiveDomainName] = useState<string | null>(null);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [themeMounted, setThemeMounted] = useState(false);

  const domainDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Compute display details matching the reference design
  const displayName =
    currentUser?.fullName ||
    (currentUser?.role === "ADMIN" ? "Administrator" : currentUser?.username) ||
    "Administrator";
  const displayUsername = currentUser?.username || "admin";

  // Initialize theme mode & listen for theme events
  useEffect(() => {
    queueMicrotask(() => {
      setThemeMounted(true);
      const currentMode =
        (document.documentElement.getAttribute("data-mode") as "dark" | "light") || "dark";
      setThemeMode(currentMode);
    });

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setThemeMode(customEvent.detail);
      }
    };
    window.addEventListener("theme-changed", handleThemeChange);
    return () => window.removeEventListener("theme-changed", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    document.documentElement.setAttribute("data-mode", nextMode);
    localStorage.setItem("emitmail-theme-mode", nextMode);
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: nextMode }));
  };

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
        // Fallback or offline dev mode
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

  const getActiveTab = (path: string): NavTab => {
    if (path === "/") return "home";
    if (path.startsWith("/emails")) return "emails";
    if (path.startsWith("/inbox")) return "inbox";
    if (path.startsWith("/analytics")) return "analytics";
    if (path.startsWith("/domains")) return "domains";
    if (path.startsWith("/api-keys")) return "api-keys";
    if (path.startsWith("/webhooks")) return "webhooks";
    if (path.startsWith("/settings")) return "settings";
    if (path.startsWith("/update")) return "update";
    return "home";
  };

  const activeTab = currentTab ?? getActiveTab(pathname || "/");

  const handleItemClick = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    onCloseMobile();
    setIsDomainDropdownOpen(false);
    setIsAccountMenuOpen(false);
  };

  const renderNavItem = (item: NavItemConfig, collapsed: boolean) => {
    const IconComponent = item.icon;
    const isActive = (item.id === "update" && isUpgradeModalOpen) || activeTab === item.id;
    const isInbox = item.id === "inbox";
    const showInboxBadge = isInbox && unreadCount > 0;

    const title = showInboxBadge
      ? `${item.label} (${unreadCount} unread)`
      : item.badge
      ? `${item.label} (${item.badge})`
      : item.label;

    if (collapsed) {
      const content = (
        <>
          <IconComponent
            size={19}
            weight={isActive ? "fill" : "regular"}
            className={cn("shrink-0 transition-colors", isActive ? "text-cf-orange" : "")}
          />
          {showInboxBadge && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0066FF] ring-2 ring-kumo-canvas" />
          )}
        </>
      );

      const collapsedClassName = cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 relative select-none mx-auto cursor-pointer",
        isActive
          ? "bg-[var(--cf-sidebar-active)] text-cf-orange shadow-2xs font-medium"
          : "text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-strong"
      );

      if (item.onClick) {
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                handleItemClick(item.id);
                item.onClick?.();
              }}
              title={title}
              className={collapsedClassName}
            >
              {content}
            </button>
          </li>
        );
      }

      return (
        <li key={item.id}>
          <Link
            href={item.href}
            onClick={() => handleItemClick(item.id)}
            title={title}
            className={collapsedClassName}
          >
            {content}
          </Link>
        </li>
      );
    }

    const expandedClassName = cn(
      "w-full flex items-center justify-between px-3 py-2 transition-all duration-150 rounded-lg group select-none text-[13px] relative cursor-pointer",
      isActive
        ? "bg-[var(--cf-sidebar-active)] text-kumo-strong font-medium shadow-2xs"
        : "text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong"
    );

    const expandedContent = (
      <>
        <div className="flex items-center gap-2.5 min-w-0">
          <IconComponent
            size={18}
            weight={isActive ? "fill" : "regular"}
            className={cn(
              "shrink-0 transition-colors",
              isActive ? "text-cf-orange" : "text-kumo-subtle group-hover:text-kumo-strong"
            )}
          />
          <span className="truncate">{item.label}</span>
        </div>

        {showInboxBadge ? (
          <span className="min-w-5 h-5 px-1 rounded-full bg-[#0066FF] text-white text-[11px] font-bold flex items-center justify-center shrink-0 leading-none shadow-xs">
            {unreadCount}
          </span>
        ) : (
          item.badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cf-orange-tint text-cf-orange border border-cf-orange-border/40">
              {item.badge}
            </span>
          )
        )}
      </>
    );

    if (item.onClick) {
      return (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => {
              handleItemClick(item.id);
              item.onClick?.();
            }}
            title={item.label}
            className={expandedClassName}
          >
            {expandedContent}
          </button>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <Link
          href={item.href}
          onClick={() => handleItemClick(item.id)}
          title={item.label}
          className={expandedClassName}
        >
          {expandedContent}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile Slide-Over Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Mobile Slide-Over Drawer Panel */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-kumo-canvas border-r border-kumo-hairline flex flex-col p-4 transition-transform duration-200 ease-in-out select-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 1. Mobile Branding (24–28px vertical spacing below branding: mb-7) */}
        <div className="flex items-center justify-between shrink-0 mb-7">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-cf-orange flex items-center justify-center text-white shrink-0 shadow-xs">
              <PaperPlaneTilt size={18} weight="fill" />
            </div>
            <span className="font-logo font-extrabold text-xl text-cf-orange leading-none">
              emitmail
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Workspace actions */}
        <div className="shrink-0 mb-7">
          {/* Add Domain Action (12–16px spacing before search: mb-3.5) */}
          <div className="relative mb-3.5">
            <button
              type="button"
              onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-medium text-kumo-strong transition-colors shadow-2xs cursor-pointer"
              title={activeDomainName ? `Active domain: ${activeDomainName}` : "Add domain"}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-cf-orange/15 text-cf-orange font-bold text-[11px] flex items-center justify-center shrink-0">
                  {activeDomainName ? activeDomainName.charAt(0).toUpperCase() : <Plus size={12} weight="bold" />}
                </span>
                <span className="truncate font-semibold text-kumo-strong">
                  {activeDomainName || "Add Domain"}
                </span>
              </div>
              <CaretUpDown size={14} className="text-kumo-subtle shrink-0" />
            </button>

            {isDomainDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-40">
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
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-kumo-tint text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe size={14} className="text-kumo-subtle shrink-0" />
                          <span className="truncate font-medium text-kumo-default">{d.domainName}</span>
                        </div>
                        {activeDomainName === d.domainName && (
                          <Check size={14} className="text-cf-orange shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-kumo-muted text-[11px]">No domains configured yet</div>
                )}
                <div className="border-t border-kumo-hairline/60 pt-1 mt-1">
                  <Link
                    href="/domains"
                    onClick={() => handleItemClick("domains")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-cf-orange hover:bg-cf-orange/10 transition-colors font-medium cursor-pointer"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Manage all domains</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Search Input */}
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenCommandPalette?.();
            }}
            className="w-full bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg px-2.5 py-2 text-xs text-kumo-subtle flex items-center justify-between hover:border-cf-orange transition-colors cursor-pointer shadow-2xs"
            title="Search (Ctrl + K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MagnifyingGlass size={15} className="text-kumo-muted" />
              <span className="truncate">Quick search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-kumo-recessed border border-kumo-line rounded text-kumo-muted font-mono">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* 3. Primary Navigation (consistent 6–8px spacing: space-y-2) */}
        <nav className="shrink-0">
          <ul className="space-y-2">
            {PRIMARY_NAV_ITEMS.map((item) => renderNavItem(item, false))}
          </ul>
        </nav>

        {/* Flexible vertical spacer between main navigation and bottom section */}
        <div className="flex-1 min-h-6" aria-hidden="true" />

        {/* 4. Bottom Section: Update + Settings & Administrator Account Card */}
        <div className="shrink-0 space-y-2">
          <ul className="space-y-2">
            {renderNavItem(
              {
                id: "update",
                label: "Update",
                href: "/update",
                icon: RefreshCw,
                onClick: () => setIsUpgradeModalOpen(true),
              },
              false
            )}
            {renderNavItem(
              { id: "settings", label: "Settings", href: "/settings", icon: Gear },
              false
            )}
          </ul>

          {/* Administrator Account Card */}
          <div className="relative pt-0">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-kumo-base border border-kumo-hairline shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-kumo-hairline/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Facehash
                    name={displayUsername}
                    size={36}
                    interactive={false}
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] text-kumo-strong truncate leading-tight">
                    {displayName}
                  </div>
                  <div className="text-xs text-kumo-muted truncate leading-tight mt-0.5">
                    @{displayUsername}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-md hover:bg-kumo-elevated text-kumo-subtle hover:text-kumo-strong transition-colors cursor-pointer"
                title={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} mode`}
              >
                {themeMounted && themeMode === "dark" ? (
                  <Sun size={15} weight="bold" />
                ) : (
                  <Moon size={15} weight="bold" />
                )}
              </button>
            </div>

            {/* Emitmail Dashboard · v1.0.0 footer string */}
            <div className="text-center text-[11px] text-kumo-muted select-none pt-2 pb-0.5 font-normal tracking-wide">
              Emitmail Dashboard · v{versionData?.currentVersion || "1.0.0"}
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Fixed Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-full bg-kumo-canvas border-r border-kumo-hairline transition-all duration-200 select-none relative z-20",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Collapse/Expand Edge-Attached Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "transition-all duration-200 cursor-pointer flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-cf-orange",
            isCollapsed
              ? "absolute top-3.5 -right-3.5 z-30 w-7 h-7 rounded-md bg-kumo-base border border-kumo-line shadow-xs text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-elevated"
              : "absolute top-3.5 right-2.5 z-30 p-1.5 rounded-md text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-elevated"
          )}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Unified Full-Height Flex Container with Flexible Spacer */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col p-3">
          {/* 1. Branding (24–28px vertical spacing below branding: mb-7 = 28px) */}
          <div
            className={cn(
              "h-10 flex items-center shrink-0 mb-7",
              isCollapsed ? "justify-center" : "justify-start px-0.5"
            )}
          >
            {isCollapsed ? (
              <Link
                href="/"
                title="EmitMail"
                className="w-10 h-10 rounded-lg flex items-center justify-center group cursor-pointer mx-auto transition-transform hover:scale-105"
              >
                <div className="w-8 h-8 rounded-lg bg-cf-orange flex items-center justify-center text-white shrink-0 shadow-xs">
                  <PaperPlaneTilt size={18} weight="fill" />
                </div>
              </Link>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-2.5 group cursor-pointer min-w-0 pr-8"
              >
                <div className="w-8 h-8 rounded-lg bg-cf-orange flex items-center justify-center text-white shrink-0 shadow-xs">
                  <PaperPlaneTilt size={18} weight="fill" />
                </div>
                <span className="font-logo font-extrabold tracking-tight text-xl text-cf-orange leading-none truncate">
                  emitmail
                </span>
              </Link>
            )}
          </div>

          {/* 2. Workspace actions */}
          <div className="shrink-0 mb-7">
            {/* Add Domain Action (12–16px vertical spacing before search: mb-3.5 = 14px) */}
            <div className="relative mb-3.5" ref={domainDropdownRef}>
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                  title={activeDomainName ? `Domain: ${activeDomainName}` : "Add domain"}
                  aria-label={activeDomainName ? `Domain: ${activeDomainName}` : "Add domain"}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-bold text-cf-orange transition-colors mx-auto shadow-2xs cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-md bg-cf-orange/15 flex items-center justify-center">
                    {activeDomainName ? (
                      activeDomainName.charAt(0).toUpperCase()
                    ) : (
                      <Plus size={14} weight="bold" />
                    )}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-medium text-kumo-strong transition-colors group cursor-pointer shadow-2xs"
                  title={activeDomainName ? `Active domain: ${activeDomainName}` : "Add domain"}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-cf-orange/15 text-cf-orange font-bold text-[11px] flex items-center justify-center shrink-0">
                      {activeDomainName ? (
                        activeDomainName.charAt(0).toUpperCase()
                      ) : (
                        <Plus size={12} weight="bold" />
                      )}
                    </span>
                    <span className="truncate font-semibold text-kumo-strong">
                      {activeDomainName || "Add Domain"}
                    </span>
                  </div>
                  <CaretUpDown
                    size={14}
                    className="text-kumo-subtle shrink-0 group-hover:text-kumo-strong transition-transform"
                  />
                </button>
              )}

              {/* Dropdown Menu for Domain Selection / Addition */}
              {isDomainDropdownOpen && (
                <div
                  className={cn(
                    "rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-40 animate-in fade-in zoom-in-95 duration-100",
                    isCollapsed
                      ? "absolute top-0 left-full ml-2 w-56"
                      : "absolute top-full left-0 mt-1.5 w-full"
                  )}
                >
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
                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-kumo-tint text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe size={14} className="text-kumo-subtle shrink-0" />
                            <span className="truncate font-medium text-kumo-default">
                              {d.domainName}
                            </span>
                          </div>
                          {activeDomainName === d.domainName && (
                            <Check size={14} className="text-cf-orange shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-kumo-muted text-[11px]">
                      No domains configured yet
                    </div>
                  )}
                  <div className="border-t border-kumo-hairline/60 pt-1 mt-1">
                    <Link
                      href="/domains"
                      onClick={() => {
                        setIsDomainDropdownOpen(false);
                        onSelectTab?.("domains");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-cf-orange hover:bg-cf-orange/10 transition-colors font-medium cursor-pointer"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Manage all domains</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Search Input (24–28px spacing after search handled by parent mb-7) */}
            {isCollapsed ? (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Search (Ctrl + K)"
                aria-label="Search"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-kumo-subtle hover:text-cf-orange hover:border-cf-orange transition-colors mx-auto shadow-2xs cursor-pointer"
              >
                <MagnifyingGlass size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="w-full bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg px-2.5 py-2 text-xs text-kumo-subtle flex items-center justify-between hover:border-cf-orange transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MagnifyingGlass
                    size={15}
                    className="text-kumo-muted group-hover:text-cf-orange transition-colors shrink-0"
                  />
                  <span className="truncate">Quick search...</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-kumo-muted bg-kumo-recessed border border-kumo-hairline rounded shrink-0">
                  Ctrl K
                </kbd>
              </button>
            )}
          </div>

          {/* 3. Primary Navigation (consistent 6–8px vertical spacing between items: space-y-2) */}
          <nav className="shrink-0">
            <ul className="space-y-2">
              {PRIMARY_NAV_ITEMS.map((item) => renderNavItem(item, isCollapsed))}
            </ul>
          </nav>

          {/* Flexible vertical spacer between main navigation and bottom section */}
          <div className="flex-1 min-h-6" aria-hidden="true" />

          {/* 4. Bottom Section: Update + Settings + Administrator account card + version string (No separator borders/lines!) */}
          <div className="shrink-0 space-y-2 pt-2">
            {/* Update & Settings */}
            <ul className="space-y-2">
              {renderNavItem(
                {
                  id: "update",
                  label: "Update",
                  href: "/update",
                  icon: RefreshCw,
                  onClick: () => setIsUpgradeModalOpen(true),
                },
                isCollapsed
              )}
              {renderNavItem(
                { id: "settings", label: "Settings", href: "/settings", icon: Gear },
                isCollapsed
              )}
            </ul>

            {/* Administrator Account Card */}
            <div className="relative pt-0" ref={accountMenuRef}>
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  title={`${displayName} (@${displayUsername})`}
                  aria-label="Account menu"
                  aria-expanded={isAccountMenuOpen}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-kumo-base hover:bg-kumo-elevated border border-kumo-hairline hover:border-kumo-line transition-all cursor-pointer mx-auto shadow-2xs focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-kumo-hairline shrink-0 shadow-2xs">
                    <Facehash
                      name={displayUsername}
                      size={32}
                      interactive={false}
                    />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-kumo-base hover:bg-kumo-elevated border border-kumo-hairline hover:border-kumo-line transition-all cursor-pointer group text-left shadow-2xs select-none focus:outline-none"
                  aria-label="User account menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-kumo-hairline/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <Facehash
                        name={displayUsername}
                        size={36}
                        interactive={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] text-kumo-strong truncate leading-tight">
                        {displayName}
                      </div>
                      <div className="text-xs text-kumo-muted truncate leading-tight mt-0.5">
                        @{displayUsername}
                      </div>
                    </div>
                  </div>
                  <CaretUp
                    size={16}
                    weight="bold"
                    className={cn(
                      "text-kumo-muted group-hover:text-kumo-strong transition-transform shrink-0",
                      isAccountMenuOpen && "rotate-180"
                    )}
                  />
                </button>
              )}

              {/* Profile & Settings Dropdown Menu (Anchored upwards) */}
              {isAccountMenuOpen && (
                <div
                  className={cn(
                    "rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100",
                    isCollapsed
                      ? "absolute bottom-0 left-full ml-2 w-56"
                      : "absolute bottom-full left-0 mb-2 w-full"
                  )}
                >
                  {/* User Identity Header */}
                  <div className="px-3 py-2.5 border-b border-kumo-hairline/60 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-kumo-hairline shrink-0 shadow-2xs">
                      <Facehash
                        name={displayUsername}
                        size={32}
                        interactive
                        enableBlink
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-kumo-strong truncate max-w-[100px]">
                          {displayName}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded tracking-wide uppercase",
                            currentUser?.role === "ADMIN"
                              ? "bg-cf-orange/10 text-cf-orange border border-cf-orange/20"
                              : currentUser?.role === "MEMBER"
                              ? "bg-cf-chart-blue/10 text-cf-chart-blue border border-cf-chart-blue/20"
                              : "bg-kumo-elevated text-kumo-subtle border border-kumo-hairline"
                          )}
                        >
                          {currentUser?.role === "VIEWER" ? "VIEW ONLY" : (currentUser?.role || "ADMIN")}
                        </span>
                      </div>
                      <div className="text-[10px] text-kumo-muted font-mono truncate mt-0.5">
                        {currentUser?.email || `@${displayUsername}`}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links to Settings */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSelectTab?.("settings");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong transition-colors cursor-pointer"
                    >
                      <Gear size={14} />
                      <span>Workspace Settings</span>
                    </Link>
                  </div>

                  {/* Relocated Theme Mode Toggle */}
                  <div className="border-t border-kumo-hairline/60 py-1">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        {themeMounted && themeMode === "dark" ? (
                          <Sun size={14} className="text-cf-orange" />
                        ) : (
                          <Moon size={14} className="text-cf-orange" />
                        )}
                        <span>Theme Mode</span>
                      </div>
                      <span className="text-[11px] font-mono text-kumo-muted capitalize">
                        {themeMode}
                      </span>
                    </button>
                  </div>

                  {/* Log Out Action */}
                  <div className="border-t border-kumo-hairline/60 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        api.auth.logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                    >
                      <SignOut size={14} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Emitmail Dashboard · v1.0.0 footer string (No divider line) */}
            {!isCollapsed && (
              <div className="text-center text-[11px] text-kumo-muted select-none pt-1.5 pb-0.5 font-normal tracking-wide">
                Emitmail Dashboard · v{versionData?.currentVersion || "1.0.0"}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
