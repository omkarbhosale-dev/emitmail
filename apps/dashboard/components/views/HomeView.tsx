"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  PaperPlaneTilt,
  Globe,
  CaretRight,
  Key,
  Tray,
  CalendarBlank,
  Clock,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useSystemVersion } from "@/context/VersionContext";
import { NavTab, ApiDomain } from "@/types";
import { useModals } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Recent";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 0) return "Just now";
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

interface RecentActivityItem {
  id: string;
  type: "inbox" | "email" | "domain" | "api-key";
  title: string;
  subtitle: string;
  timestamp: string;
  createdAt: string;
  href: string;
  tab: NavTab;
}

interface InteractiveTimeseriesChartProps {
  title: string;
  totalText: string;
  subBadge?: string;
  badgeIcon?: React.ReactNode;
  data: { time: string; val: number }[];
  gradientId: string;
  unitLabel: string;
  strokeColor?: string;
  isLoading?: boolean;
}

function InteractiveTimeseriesChart({
  title,
  totalText,
  subBadge,
  badgeIcon,
  data,
  gradientId,
  unitLabel,
  strokeColor,
  isLoading,
}: InteractiveTimeseriesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasActivity = data.some((d) => d.val > 0);
  const chartWidth = 500;
  const chartHeight = 120;
  const maxVal = Math.max(...data.map((d) => d.val), 5);
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const chartColor = strokeColor || "#FF6600";

  const coords = data.map((d, i) => {
    const x = i * stepX;
    const y = chartHeight - (d.val / maxVal) * (chartHeight - 20) - 10;
    return { x, y, time: d.time, val: d.val };
  });

  const linePath = coords.reduce(
    (acc, curr, i) => `${acc} ${i === 0 ? "M" : "L"} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`,
    ""
  );
  const areaPath = `${linePath} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`;

  const activePoint = hoveredIndex !== null && coords[hoveredIndex] ? coords[hoveredIndex] : null;

  let cardTransform = "translate(-50%, calc(-100% - 14px))";
  if (activePoint) {
    const isNearLeft = activePoint.x < chartWidth * 0.28;
    const isNearRight = activePoint.x > chartWidth * 0.72;
    const isNearTop = activePoint.y < 50;

    if (isNearTop) {
      if (isNearLeft) {
        cardTransform = "translate(10px, 14px)";
      } else if (isNearRight) {
        cardTransform = "translate(calc(-100% - 10px), 14px)";
      } else {
        cardTransform = "translate(-50%, 14px)";
      }
    } else {
      if (isNearLeft) {
        cardTransform = "translate(10px, calc(-100% - 12px))";
      } else if (isNearRight) {
        cardTransform = "translate(calc(-100% - 10px), calc(-100% - 12px))";
      }
    }
  }

  return (
    <div className="border border-zinc-800/80 rounded-lg p-4 bg-zinc-900/40 flex flex-col justify-between min-h-60 relative overflow-hidden transition-colors">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-400">{title}</span>
          <span className="text-xs text-zinc-500 font-mono flex items-center gap-1.5">
            {badgeIcon}
            <span>30-day view</span>
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold text-zinc-100 font-mono tracking-tight leading-none">
              {totalText}
            </span>
          )}
          {subBadge && (
            <span
              className={`text-xs ${
                hasActivity ? "text-emerald-400 font-medium" : "text-zinc-500"
              }`}
            >
              {subBadge}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="w-full h-28 mt-3 rounded-md" />
      ) : !hasActivity ? (
        <div className="relative mt-3 flex-1 flex flex-col justify-center items-center py-6 px-4 rounded-md bg-zinc-950/40 border border-zinc-800/40 select-none text-center">
          <span className="text-xs font-medium text-zinc-300">No activity recorded yet</span>
          <span className="text-2xs text-zinc-500 max-w-64 mt-0.5 leading-relaxed">
            Data over the last 30 days will be plotted here automatically as {unitLabel} are processed.
          </span>
        </div>
      ) : (
        <div className="relative mt-3 pt-2 select-none">
          {/* Y-Axis Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-2xs text-zinc-600 font-mono">
            <div className="border-b border-zinc-800/60 w-full flex justify-between pr-1">
              <span>{maxVal}</span>
            </div>
            <div className="border-b border-zinc-800/60 w-full flex justify-between pr-1">
              <span>{Math.round(maxVal * 0.66)}</span>
            </div>
            <div className="border-b border-zinc-800/60 w-full flex justify-between pr-1">
              <span>{Math.round(maxVal * 0.33)}</span>
            </div>
            <div className="border-b border-zinc-800/60 w-full flex justify-between pr-1">
              <span>0</span>
            </div>
          </div>

          {/* Chart SVG */}
          <div className="relative w-full h-28">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible relative z-10"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                className="transition-all duration-300"
              />

              <path
                d={linePath}
                fill="none"
                stroke={chartColor}
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={0}
                  x2={activePoint.x}
                  y2={chartHeight}
                  stroke={chartColor}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  className="opacity-70 pointer-events-none"
                />
              )}

              {coords.map((pt, i) => {
                const isHovered = hoveredIndex === i;
                return (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4.5 : 2.5}
                    style={{
                      fill: isHovered ? "#ffffff" : chartColor,
                      stroke: "#09090b",
                      strokeWidth: "1.5px",
                    }}
                    className="transition-all duration-150 pointer-events-none"
                  />
                );
              })}

              {coords.map((pt, i) => (
                <rect
                  key={`hitbox-${i}`}
                  x={pt.x - stepX / 2}
                  y={0}
                  width={stepX}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                />
              ))}
            </svg>

            {activePoint && (
              <div
                className="absolute pointer-events-none z-30 transition-all duration-150 ease-out"
                style={{
                  left: `${(activePoint.x / chartWidth) * 100}%`,
                  top: `${(activePoint.y / chartHeight) * 100}%`,
                  transform: cardTransform,
                }}
              >
                <div className="bg-zinc-900 border border-zinc-800 shadow-xl rounded-md p-2.5 min-w-40 select-none text-left">
                  <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-zinc-800 text-2xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <CalendarBlank size={12} className="text-zinc-500" />
                      {activePoint.time}
                    </span>
                    <span>30d</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-xs text-zinc-400 capitalize">{unitLabel}</span>
                    <span className="text-sm font-semibold font-mono text-zinc-100">
                      {activePoint.val.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between text-2xs text-zinc-500 mt-2 font-mono">
            {data.map((d) => (
              <span key={d.time}>{d.time}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface HomeViewProps {
  onNavigateTab?: (tab: NavTab) => void;
  onOpenCommandPalette?: () => void;
}

export function HomeView({ onNavigateTab, onOpenCommandPalette }: HomeViewProps = {}) {
  const router = useRouter();
  const modals = useModals();
  const { isViewer } = useAuth();
  const { isUpdateAvailable, versionData, setIsUpgradeModalOpen } = useSystemVersion();

  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isServerConfigured, setIsServerConfigured] = useState(true);

  const [systemHealth, setSystemHealth] = useState({
    database: true,
    redis: true,
    worker: true,
  });
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);

  const [emailStats, setEmailStats] = useState<{
    total: number;
    delivered: number;
    bounced: number;
    deliveryRate: string;
    bounceRate: string;
    totalInbound?: number;
    unreadInbound?: number;
    chartDispatches?: { time: string; val: number }[];
    chartInbound?: { time: string; val: number }[];
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [recentItems, setRecentItems] = useState<RecentActivityItem[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(true);

  useEffect(() => {
    // 1. Fetch domains
    api.domains
      .list()
      .then((items) => {
        setDomains(items || []);
      })
      .catch((err) => {
        console.error("Failed to load domains in HomeView:", err);
      })
      .finally(() => {
        setIsLoadingDomains(false);
      });

    // Check server config
    api.serverConfig
      .get()
      .then((res) => {
        if (!res?.config || !res.config.vpsPublicIpv4 || res.config.vpsPublicIpv4 === "0.0.0.0") {
          setIsServerConfigured(false);
        } else {
          setIsServerConfigured(true);
        }
      })
      .catch(() => {
        setIsServerConfigured(false);
      });

    // 2. Fetch live system health
    api.system
      .getHealth()
      .then((data: { services?: { database?: string; redis?: string; worker?: string } }) => {
        if (data?.services) {
          setSystemHealth({
            database: data.services.database === "CONNECTED" || data.services.database === "READY",
            redis: data.services.redis === "CONNECTED" || data.services.redis === "READY",
            worker: data.services.worker === "RUNNING" || data.services.worker === "READY",
          });
        }
      })
      .catch((err: unknown) => {
        console.error("Health check failed in HomeView:", err);
      })
      .finally(() => {
        setIsLoadingHealth(false);
      });

    // 3. Fetch real email analytics & timeseries
    api.emails
      .getStats()
      .then((stats) => {
        if (stats) {
          setEmailStats({
            total: stats.total ?? 0,
            delivered: stats.delivered ?? 0,
            bounced: stats.bounced ?? 0,
            deliveryRate: stats.deliveryRate ?? "0%",
            bounceRate: stats.bounceRate ?? "0%",
            totalInbound: stats.totalInbound ?? 0,
            unreadInbound: stats.unreadInbound ?? 0,
            chartDispatches: stats.chartDispatches,
            chartInbound: stats.chartInbound,
          });
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to load email stats in HomeView:", err);
      })
      .finally(() => {
        setIsLoadingStats(false);
      });

    // 4. Fetch recent items across inbox, emails, domains, keys
    async function fetchRecentActivity() {
      try {
        const [emailsRes, inboxRes, domainsRes, keysRes] = await Promise.allSettled([
          api.emails.list({ limit: 4 }),
          api.inbox.listMessages(undefined, { limit: 4 }),
          api.domains.list(),
          api.apiKeys.list(),
        ]);

        const items: RecentActivityItem[] = [];

        if (inboxRes.status === "fulfilled" && inboxRes.value?.messages) {
          for (const msg of inboxRes.value.messages) {
            items.push({
              id: `inbox_${msg.id}`,
              type: "inbox",
              title: msg.subject || "Incoming Message",
              subtitle: `Inbox / ${msg.fromAddress || msg.fromName || "support"}`,
              timestamp: formatRelativeTime(msg.receivedAt || msg.createdAt),
              createdAt: msg.receivedAt || msg.createdAt,
              tab: "inbox",
              href: msg.mailboxId ? `/inbox/${msg.mailboxId}/${msg.id}` : `/inbox`,
            });
          }
        }

        if (emailsRes.status === "fulfilled" && emailsRes.value?.emails) {
          for (const mail of emailsRes.value.emails) {
            const recipient = Array.isArray(mail.to) && mail.to.length > 0
              ? mail.to[0]
              : mail.recipient || "recipient";
            items.push({
              id: `email_${mail.id}`,
              type: "email",
              title: mail.subject || "Dispatched Email",
              subtitle: `Emails / to ${recipient}`,
              timestamp: formatRelativeTime(mail.createdAt),
              createdAt: mail.createdAt,
              tab: "emails",
              href: `/emails`,
            });
          }
        }

        if (domainsRes.status === "fulfilled" && Array.isArray(domainsRes.value)) {
          for (const dom of domainsRes.value.slice(0, 2)) {
            items.push({
              id: `domain_${dom.id}`,
              type: "domain",
              title: dom.domainName,
              subtitle: `Domains / ${dom.status === "VERIFIED" ? "Verified" : dom.status}`,
              timestamp: formatRelativeTime(dom.createdAt),
              createdAt: dom.createdAt,
              tab: "domains",
              href: `/domains/${dom.id}`,
            });
          }
        }

        if (keysRes.status === "fulfilled" && Array.isArray(keysRes.value)) {
          for (const key of keysRes.value.slice(0, 2)) {
            items.push({
              id: `key_${key.id}`,
              type: "api-key",
              title: key.name,
              subtitle: `API Keys / ${key.keyPrefix}••••••`,
              timestamp: formatRelativeTime(key.createdAt),
              createdAt: key.createdAt,
              tab: "api-keys",
              href: `/api-keys`,
            });
          }
        }

        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentItems(items.slice(0, 4));
      } catch (err) {
        console.error("Failed to load recents:", err);
      } finally {
        setIsLoadingRecents(false);
      }
    }

    fetchRecentActivity();
  }, []);

  const handleNavigate = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      router.push(tab === "home" ? "/" : `/${tab}`);
    }
  };

  const handleRecentClick = (item: RecentActivityItem) => {
    if (item.href) {
      router.push(item.href);
    } else {
      handleNavigate(item.tab);
    }
  };

  const handleOpenSearch = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    } else {
      modals.openCommandPalette();
    }
  };

  const displayDomains = domains.slice(0, 3);
  const activeRecents = recentItems;

  const defaultDispatches = [
    { time: "Day 1", val: 0 },
    { time: "Day 7", val: 0 },
    { time: "Day 14", val: 0 },
    { time: "Day 21", val: 0 },
    { time: "Day 30", val: 0 },
  ];

  const emailDispatches = emailStats?.chartDispatches && emailStats.chartDispatches.length > 0
    ? emailStats.chartDispatches
    : defaultDispatches;

  const inboundTraffic = emailStats?.chartInbound && emailStats.chartInbound.length > 0
    ? emailStats.chartInbound
    : defaultDispatches;

  const hasDispatches = Boolean(emailStats && emailStats.total > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Left-Aligned Overview Header */}
      <div className="border-b border-zinc-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
              Overview
            </h1>
            {isUpdateAvailable && versionData && (
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>v{versionData.latestVersion} update</span>
                <ArrowSquareOut size={12} className="text-zinc-500" />
              </button>
            )}
          </div>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Platform delivery telemetry, server services, and quick access.
          </p>
        </div>

        {/* Search Bar / Ctrl + K Trigger */}
        <button
          type="button"
          onClick={handleOpenSearch}
          className="h-10 px-3.5 rounded-md bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 flex items-center justify-between gap-6 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={16} className="text-zinc-500" />
            <span>Search messages, domains, keys...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-zinc-800 rounded text-zinc-400">Ctrl</kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-zinc-800 rounded text-zinc-400">K</kbd>
          </div>
        </button>
      </div>

      {/* Onboarding Banner if server/domain not configured */}
      {(!isServerConfigured || (!isLoadingDomains && domains.length === 0)) && (
        <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Globe size={18} className="text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">
                Setup Required: Primary Sending Domain
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure your mail server hostname and verify DNS records to enable 2048-bit DKIM signing and outbound delivery.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="btn-cf-primary text-xs shrink-0"
          >
            <span>Launch Setup</span>
            <CaretRight size={12} weight="bold" />
          </Link>
        </div>
      )}

      {/* 2. Three Top Cards (Domains, Quick Actions, Recents) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Domains */}
        <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/40 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Domains</span>
              <button
                onClick={() => handleNavigate("domains")}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>View all</span>
                <CaretRight size={11} />
              </button>
            </div>

            {isLoadingDomains ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-7 w-full rounded-md" />
                <Skeleton className="h-7 w-full rounded-md" />
              </div>
            ) : displayDomains.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <span className="text-xs text-zinc-400 block">No domains configured</span>
                <span className="text-2xs text-zinc-500 block">Add a domain to generate 2048-bit DKIM keys</span>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {displayDomains.map((dom) => (
                  <div
                    key={dom.id || dom.domainName}
                    onClick={() => handleNavigate("domains")}
                    className="flex items-center justify-between py-2 hover:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 mr-2 text-zinc-300">
                      <Globe size={14} className="text-zinc-500 shrink-0" />
                      <span className="text-xs font-mono truncate">{dom.domainName}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-2xs font-medium px-2 py-0.5 rounded-md border shrink-0 ${
                        dom.status === "VERIFIED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          dom.status === "VERIFIED" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      {dom.status === "VERIFIED" ? "Verified" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isViewer && (
            <div className="pt-3 border-t border-zinc-800/60 mt-3">
              <Link
                href={displayDomains.length === 0 ? "/onboarding" : "/domains/add"}
                className="btn-cf-secondary text-xs w-full text-center"
              >
                + Add Domain
              </Link>
            </div>
          )}
        </div>

        {/* Card 2: Quick Actions */}
        <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/40 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Quick Actions</span>
            </div>

            <div className="divide-y divide-zinc-800/60">
              <button
                onClick={() => handleNavigate("inbox")}
                className="w-full flex items-center justify-between py-2 text-left cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Tray size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <div>
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors block">
                      Inbox
                    </span>
                    <span className="text-2xs text-zinc-500 block">
                      Inbound streams and mailboxes
                    </span>
                  </div>
                </div>
                <CaretRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </button>

              <button
                onClick={() => handleNavigate("emails")}
                className="w-full flex items-center justify-between py-2 text-left cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PaperPlaneTilt size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <div>
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors block">
                      Processed Emails
                    </span>
                    <span className="text-2xs text-zinc-500 block">
                      Delivery queue and dispatch logs
                    </span>
                  </div>
                </div>
                <CaretRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </button>

              <button
                onClick={() => handleNavigate("api-keys")}
                className="w-full flex items-center justify-between py-2 text-left cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Key size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <div>
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors block">
                      API Keys
                    </span>
                    <span className="text-2xs text-zinc-500 block">
                      Manage credentials and tokens
                    </span>
                  </div>
                </div>
                <CaretRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/40 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Recent Activity</span>
              <span className="text-2xs text-zinc-500">Live</span>
            </div>

            {isLoadingRecents ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-7 w-full rounded-md" />
                <Skeleton className="h-7 w-full rounded-md" />
              </div>
            ) : activeRecents.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <Clock size={16} className="text-zinc-600 mx-auto" />
                <span className="text-xs text-zinc-400 block">No recent events</span>
                <span className="text-2xs text-zinc-500 block">Events will appear here in real time</span>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {activeRecents.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleRecentClick(item)}
                    className="w-full py-2 flex items-center justify-between text-left group cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 mr-2">
                      <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate block">
                        {item.title}
                      </span>
                      <span className="text-2xs text-zinc-500 truncate block">
                        {item.subtitle}
                      </span>
                    </div>
                    <span className="text-2xs font-mono text-zinc-500 shrink-0">
                      {item.timestamp}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Unified Horizontal Metric Strip */}
      <div className="border border-zinc-800/80 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 bg-zinc-900/20 grid grid-cols-2 md:grid-cols-4 overflow-hidden">
        {/* Metric 1: Emails Sent */}
        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Emails Sent</span>
          {isLoadingStats ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {emailStats ? emailStats.total.toLocaleString() : "0"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {hasDispatches && emailStats ? `${emailStats.delivered.toLocaleString()} delivered` : "30-day volume"}
          </span>
        </div>

        {/* Metric 2: Delivery Rate */}
        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Delivery Rate</span>
          {isLoadingStats ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {hasDispatches && emailStats ? emailStats.deliveryRate : "—"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {hasDispatches && emailStats
              ? `${emailStats.delivered} of ${emailStats.total} messages`
              : "No dispatches yet"}
          </span>
        </div>

        {/* Metric 3: Bounce Rate */}
        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Bounce Rate</span>
          {isLoadingStats ? (
            <Skeleton className="h-8 w-20 mt-1.5" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {hasDispatches && emailStats ? emailStats.bounceRate : "—"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {hasDispatches && emailStats ? `${emailStats.bounced} bounces` : "No bounces recorded"}
          </span>
        </div>

        {/* Metric 4: Infrastructure Health */}
        <div className="p-4 sm:p-5">
          <span className="text-sm font-medium text-zinc-400 block">Services</span>
          {isLoadingHealth ? (
            <Skeleton className="h-8 w-24 mt-1.5" />
          ) : (
            <div className="flex items-center gap-3.5 mt-2.5 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemHealth.database ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-zinc-300">DB</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemHealth.redis ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-zinc-300">Redis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemHealth.worker ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-zinc-300">Worker</span>
              </div>
            </div>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1.5 block">
            {systemHealth.database && systemHealth.redis && systemHealth.worker ? "All systems active" : "Check logs"}
          </span>
        </div>
      </div>

      {/* 4. Timeseries Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InteractiveTimeseriesChart
          title="Outbound email volume"
          totalText={emailStats ? emailStats.total.toLocaleString() : "0"}
          subBadge={hasDispatches ? "Live" : undefined}
          data={emailDispatches}
          gradientId="homeOutboundGrad"
          unitLabel="emails"
          isLoading={isLoadingStats}
        />

        <InteractiveTimeseriesChart
          title="Inbound email volume"
          totalText={
            emailStats && emailStats.totalInbound !== undefined
              ? emailStats.totalInbound.toLocaleString()
              : "0"
          }
          subBadge={
            emailStats && emailStats.unreadInbound && emailStats.unreadInbound > 0
              ? `${emailStats.unreadInbound} unread`
              : undefined
          }
          badgeIcon={<Tray size={12} className="text-zinc-400" />}
          data={inboundTraffic}
          gradientId="homeInboundGrad"
          unitLabel="messages"
          strokeColor="#FF6600"
          isLoading={isLoadingStats}
        />
      </div>
    </div>
  );
}
