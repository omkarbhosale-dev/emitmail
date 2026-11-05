"use client";

import { useSystemVersion } from "@/context/VersionContext";

import React from "react";
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
  SidebarSimple,
  ArrowCircleUp,
  CaretUpDown,
  X,
} from "@phosphor-icons/react";
import { NavTab } from "@/types";
import { cn } from "@/lib/utils";

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
}

const TOP_NAV_ITEMS: NavItemConfig[] = [
  { id: "home", label: "Home", href: "/", icon: House },
  { id: "emails", label: "Email", href: "/emails", icon: EnvelopeSimple },
  { id: "inbox", label: "Inbox", href: "/inbox", icon: Tray },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: ChartLineUp },
  { id: "domains", label: "Domains", href: "/domains", icon: Globe },
  { id: "api-keys", label: "API Key", href: "/api-keys", icon: Key },
  { id: "webhooks", label: "Webhooks", href: "/webhooks", icon: PlugsConnected, badge: "Live" },
];

const BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  { id: "settings", label: "Settings", href: "/settings", icon: Gear },
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
  const { versionData, isUpdateAvailable, setIsUpgradeModalOpen } = useSystemVersion();
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [activeDomainName, setActiveDomainName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchDomains = async () => {
      try {
        const { api } = await import("@/lib/api");
        const domains = await api.domains.list();
        if (isMounted && Array.isArray(domains) && domains.length > 0) {
          const verified = domains.find((d) => d.status === "VERIFIED");
          setActiveDomainName(verified ? verified.domainName : domains[0].domainName);
        } else if (isMounted) {
          setActiveDomainName(null);
        }
      } catch {
        if (isMounted) setActiveDomainName(null);
      }
    };

    fetchDomains();

    const fetchUnread = async () => {
      try {
        const { api } = await import("@/lib/api");
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
    return "home";
  };

  const activeTab = currentTab ?? getActiveTab(pathname || "/");

  const handleItemClick = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    onCloseMobile();
  };

  const renderNavList = (items: NavItemConfig[], collapsedState: boolean) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id;
        const isInbox = item.id === "inbox";
        const showInboxBadge = isInbox && unreadCount > 0;

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={() => handleItemClick(item.id)}
              title={item.label}
              className={cn(
                "w-full flex items-center transition-all duration-150 rounded-lg group select-none text-[13px] relative",
                collapsedState
                  ? "justify-center p-2.5"
                  : "justify-between px-3 py-2",
                isActive
                  ? "bg-[var(--cf-sidebar-active)] text-kumo-strong font-medium shadow-2xs"
                  : "text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2.5",
                  collapsedState && "justify-center"
                )}
              >
                <IconComponent
                  size={18}
                  weight={isActive ? "fill" : "regular"}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive
                      ? "text-cf-orange"
                      : "text-kumo-subtle group-hover:text-kumo-strong"
                  )}
                />
                {!collapsedState && <span>{item.label}</span>}
              </div>

              {/* Collapsed dot indicator for inbox */}
              {collapsedState && showInboxBadge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0066FF] ring-2 ring-kumo-canvas" />
              )}

              {/* Expanded Badges */}
              {!collapsedState && showInboxBadge ? (
                <span className="min-w-5 h-5 px-1 rounded-full bg-[#0066FF] text-white text-[11px] font-bold flex items-center justify-center shrink-0 leading-none shadow-xs">
                  {unreadCount}
                </span>
              ) : (
                !collapsedState && item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cf-orange-tint text-cf-orange border border-cf-orange-border/40">
                    {item.badge}
                  </span>
                )
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

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
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-kumo-canvas border-r border-kumo-hairline flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out select-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-kumo-hairline mb-3">
            <span className="font-logo font-extrabold text-xl text-cf-orange">
              emitmail
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
            >
              <X size={18} />
            </button>
          </div>

          {/* Domain Selector above search bar */}
          <div className="mb-2">
            <Link
              href="/domains"
              onClick={() => handleItemClick("domains")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-medium text-kumo-strong transition-colors"
              title={activeDomainName ? `Active domain: ${activeDomainName}` : "Add domain"}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-cf-orange/15 text-cf-orange font-bold text-[11px] flex items-center justify-center shrink-0">
                  {activeDomainName ? activeDomainName.charAt(0).toUpperCase() : "+"}
                </span>
                <span className="truncate font-semibold text-kumo-strong">
                  {activeDomainName || "Add Domain"}
                </span>
              </div>
              <CaretUpDown size={14} className="text-kumo-subtle shrink-0" />
            </Link>
          </div>

          {/* Quick Search */}
          <button
            onClick={() => {
              onCloseMobile();
              onOpenCommandPalette?.();
            }}
            className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-subtle flex items-center justify-between mb-4 hover:border-cf-orange transition-colors"
          >
            <div className="flex items-center gap-2">
              <MagnifyingGlass size={15} />
              <span>Quick search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-kumo-recessed border border-kumo-line rounded text-kumo-muted font-mono">
              Ctrl K
            </kbd>
          </button>

          {/* Nav Destinations */}
          {renderNavList(TOP_NAV_ITEMS, false)}
        </div>

        {/* Bottom Pinned Settings */}
        <div className="pt-3 border-t border-kumo-hairline shrink-0">
          {renderNavList(BOTTOM_NAV_ITEMS, false)}
        </div>
      </aside>

      {/* Desktop Persistent Fixed Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col justify-between shrink-0 h-full bg-kumo-canvas border-r border-kumo-hairline transition-all duration-200 select-none",
          isCollapsed ? "w-16 p-2" : "w-60 p-3"
        )}
      >
        {/* Top Scrollable/Action Area */}
        <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto">
          {/* Domain Selector above search bar */}
          {isCollapsed ? (
            <Link
              href="/domains"
              onClick={() => onSelectTab?.("domains")}
              title={activeDomainName ? `Domain: ${activeDomainName}` : "Add domain"}
              className="w-full h-9 flex items-center justify-center rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-bold text-cf-orange transition-colors"
            >
              <span className="w-6 h-6 rounded-md bg-cf-orange/15 flex items-center justify-center">
                {activeDomainName ? activeDomainName.charAt(0).toUpperCase() : "+"}
              </span>
            </Link>
          ) : (
            <Link
              href="/domains"
              onClick={() => onSelectTab?.("domains")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-medium text-kumo-strong transition-colors group cursor-pointer"
              title={activeDomainName ? `Active domain: ${activeDomainName}` : "No domains configured"}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-cf-orange/15 text-cf-orange font-bold text-[11px] flex items-center justify-center shrink-0">
                  {activeDomainName ? activeDomainName.charAt(0).toUpperCase() : "+"}
                </span>
                <span className="truncate font-semibold text-kumo-strong">
                  {activeDomainName || "Add Domain"}
                </span>
              </div>
              <CaretUpDown size={14} className="text-kumo-subtle shrink-0 group-hover:text-kumo-strong" />
            </Link>
          )}

          {/* Quick Search Button */}
          {isCollapsed ? (
            <button
              onClick={onOpenCommandPalette}
              title="Search (Ctrl + K)"
              className="w-full h-9 flex items-center justify-center rounded-lg bg-kumo-control border border-kumo-line text-kumo-subtle hover:text-kumo-strong hover:border-cf-orange transition-colors"
            >
              <MagnifyingGlass size={16} />
            </button>
          ) : (
            <button
              onClick={onOpenCommandPalette}
              className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-1.5 text-xs text-kumo-subtle flex items-center justify-between hover:border-cf-orange transition-colors"
            >
              <div className="flex items-center gap-2">
                <MagnifyingGlass size={14} className="text-kumo-subtle" />
                <span>Quick search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-kumo-recessed border border-kumo-line rounded text-kumo-muted font-mono">
                Ctrl K
              </kbd>
            </button>
          )}

          {/* Core Destinations List */}
          <div className="pt-1">
            {renderNavList(TOP_NAV_ITEMS, isCollapsed)}
          </div>
        </div>

        {/* Bottom Pinned Area: Settings + Collapse Rail Toggle */}
        <div className="space-y-1.5 pt-2 border-t border-kumo-hairline shrink-0">
          {renderNavList(BOTTOM_NAV_ITEMS, isCollapsed)}

          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "w-full flex items-center rounded-lg text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-tint transition-colors text-[13px]",
              isCollapsed
                ? "justify-center p-2.5"
                : "justify-between px-3 py-2"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2.5",
                isCollapsed && "justify-center"
              )}
            >
              <SidebarSimple
                size={18}
                className={cn(
                  "shrink-0 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
              {!isCollapsed && <span>Collapse sidebar</span>}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
