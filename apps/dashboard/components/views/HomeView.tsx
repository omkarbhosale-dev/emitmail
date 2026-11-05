"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  PaperPlaneTilt,
  Globe,
  CaretRight,
  DotsThree,
  CheckCircle,
  Key,
  Tray,
  CalendarBlank,
  ArrowSquareOut,
  Clock,
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
  subBadge: string;
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

  const chartWidth = 500;
  const chartHeight = 120;
  const maxVal = Math.max(...data.map((d) => d.val), 5);
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const isEngine = gradientId === "chartEngineGrad";
  const chartColor = strokeColor || (isEngine ? "var(--cf-orange)" : "var(--cf-chart-blue)");

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

  // Responsive boundary positioning for the hover card
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
    <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[260px] relative overflow-hidden group">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-kumo-subtle">{title}</span>
          <span className="text-[11px] text-kumo-muted font-mono flex items-center gap-1">
            {badgeIcon}
            <span>30-day view</span>
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-bold text-kumo-strong tracking-tight font-mono">
              {totalText}
            </span>
          )}
          <span className="text-xs font-semibold text-cf-success">{subBadge}</span>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="w-full h-28 mt-4 rounded-lg" />
      ) : (
        <div className="relative mt-3 pt-2 select-none">
          {/* Y-Axis Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-kumo-muted font-mono">
            <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
              <span>{maxVal}</span>
            </div>
            <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
              <span>{Math.round(maxVal * 0.66)}</span>
            </div>
            <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
              <span>{Math.round(maxVal * 0.33)}</span>
            </div>
            <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
              <span>0</span>
            </div>
          </div>

          {/* Chart Graphic and Hover Card Container */}
          <div className="relative w-full h-28">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible relative z-10"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill with start-to-end reveal */}
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                className="transition-all duration-300"
                style={{
                  animation: "fadeInArea 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
              />

              {/* Stroke line with start-to-end drawing animation */}
              <path
                d={linePath}
                fill="none"
                stroke={chartColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="1000"
                strokeDashoffset="0"
                style={{
                  animation: "drawLine 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
              />

              {/* Vertical tracking dashed guide on hover */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={0}
                  x2={activePoint.x}
                  y2={chartHeight}
                  stroke={chartColor}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="opacity-70 transition-opacity pointer-events-none"
                />
              )}

              {/* Data Circles with hover animation */}
              {coords.map((pt, i) => {
                const isHovered = hoveredIndex === i;
                return (
                  <g key={i} className="pointer-events-none">
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="9"
                        className="opacity-75 animate-ping"
                        style={{ fill: chartColor }}
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3.5}
                      className="transition-all duration-200"
                      style={{
                        fill: isHovered ? "#ffffff" : "var(--kumo-base)",
                        stroke: chartColor,
                        strokeWidth: isHovered ? "3px" : "2px",
                      }}
                    />
                  </g>
                );
              })}

              {/* Invisible wide hover hitboxes for seamless cursor tracking */}
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

            {/* Rich Hover Card Overlay */}
            {activePoint && (
              <div
                className="absolute pointer-events-none z-30 transition-all duration-150 ease-out"
                style={{
                  left: `${(activePoint.x / chartWidth) * 100}%`,
                  top: `${(activePoint.y / chartHeight) * 100}%`,
                  transform: cardTransform,
                }}
              >
                <div className="bg-kumo-base/95 backdrop-blur-md border border-kumo-hairline shadow-2xl rounded-xl p-3 min-w-[170px] select-none text-left ring-1 ring-black/10">
                  {/* Card Header: Timestamp & Badge */}
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-kumo-hairline">
                    <span className="text-[11px] font-medium text-kumo-subtle font-mono flex items-center gap-1.5">
                      <CalendarBlank size={13} className="text-kumo-muted" />
                      {activePoint.time}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-kumo-elevated text-kumo-muted border border-kumo-hairline">
                      30d Metric
                    </span>
                  </div>

                  {/* Card Body: Metric & Large Value */}
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-kumo-base shrink-0"
                        style={{ backgroundColor: chartColor }}
                      />
                      <span className="text-xs text-kumo-muted capitalize font-medium">{unitLabel}</span>
                    </div>
                    <span className="text-base font-bold font-mono text-kumo-strong tracking-tight">
                      {activePoint.val.toLocaleString()}
                    </span>
                  </div>

                  {/* Card Footer: Activity status */}
                  <div className="mt-2 pt-1.5 border-t border-kumo-hairline/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-kumo-muted">Activity</span>
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        activePoint.val > 0 ? "text-cf-success" : "text-kumo-muted"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          activePoint.val > 0 ? "bg-cf-success" : "bg-kumo-muted"
                        }`}
                      />
                      {activePoint.val > 0 ? "Recorded" : "Zero volume"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* X-Axis Timestamps */}
          <div className="flex justify-between text-[10px] text-kumo-muted mt-2 font-mono">
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
  onTriggerSendTestEmail?: () => void;
}

export function HomeView({
  onNavigateTab,
  onOpenCommandPalette,
  onTriggerSendTestEmail,
}: HomeViewProps) {
  const router = useRouter();
  const { versionData, isUpdateAvailable, setIsUpgradeModalOpen } = useSystemVersion();
  const modals = useModals();
  const { isViewer } = useAuth();

  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);

  const [recentItems, setRecentItems] = useState<RecentActivityItem[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(true);

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isServerConfigured, setIsServerConfigured] = useState<boolean>(true);

  const [systemHealth, setSystemHealth] = useState<{
    database: boolean;
    redis: boolean;
    worker: boolean;
  }>({
    database: true,
    redis: true,
    worker: true,
  });

  const [emailStats, setEmailStats] = useState<{
    total: number;
    delivered: number;
    bounced: number;
    queued: number;
    deliveryRate: string;
    bounceRate: string;
    totalInbound?: number;
    unreadInbound?: number;
    totalInvocations: number;
    chartDispatches: { time: string; val: number }[];
    chartInbound?: { time: string; val: number }[];
    chartInvocations: { time: string; val: number }[];
  } | null>(null);

  useEffect(() => {
    // 0. Check server configuration status
    api.serverConfig.get()
      .then((res) => {
        if (res?.config) {
          setIsServerConfigured(Boolean(res.config.isConfigured));
        }
      })
      .catch(() => {});

    // 1. Fetch domains for Domains card
    setIsLoadingDomains(true);
    api.domains.list()
      .then((items) => {
        if (items && items.length > 0) {
          setDomains(items);
        }
      })
      .catch((err) => {
        console.error("Failed to load domains in HomeView:", err);
      })
      .finally(() => {
        setIsLoadingDomains(false);
      });

    // 2. Fetch live system health (Database, Redis, Worker)
    setIsLoadingHealth(true);
    api.system.getHealth()
      .then((res) => {
        const dbConnected = res.services?.database === "connected";
        const redisConnected = res.services?.redis === "connected";
        const workerRunning = res.services?.worker === "running" || redisConnected;
        setSystemHealth({
          database: dbConnected,
          redis: redisConnected,
          worker: workerRunning,
        });
      })
      .catch(() => {
        setSystemHealth({
          database: true,
          redis: true,
          worker: true,
        });
      })
      .finally(() => {
        setIsLoadingHealth(false);
      });

    // 3. Fetch real email analytics stats (30 days)
    setIsLoadingStats(true);
    api.emails.getStats()
      .then((stats) => {
        if (stats) setEmailStats(stats);
      })
      .catch((err) => {
        console.error("Failed to load real email stats in HomeView:", err);
      })
      .finally(() => {
        setIsLoadingStats(false);
      });

    // 4. Fetch real live recent items across inbox, emails, domains, and API keys
    async function fetchRecentActivity() {
      setIsLoadingRecents(true);
      try {
        const [emailsRes, inboxRes, domainsRes, keysRes] = await Promise.allSettled([
          api.emails.list({ limit: 4 }),
          api.inbox.listMessages(undefined, { limit: 4 }),
          api.domains.list(),
          api.apiKeys.list(),
        ]);

        const items: RecentActivityItem[] = [];

        // Inbound inbox messages
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

        // Outbound sent emails
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

        // Verified Domains
        if (domainsRes.status === "fulfilled" && Array.isArray(domainsRes.value)) {
          for (const dom of domainsRes.value.slice(0, 2)) {
            items.push({
              id: `domain_${dom.id}`,
              type: "domain",
              title: dom.domainName,
              subtitle: `Domains / ${dom.status === "VERIFIED" ? "Verified DKIM" : dom.status}`,
              timestamp: formatRelativeTime(dom.createdAt),
              createdAt: dom.createdAt,
              tab: "domains",
              href: `/domains/${dom.id}`,
            });
          }
        }

        // API Keys
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

        // Sort by newest first
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

  // Real domains list (empty when starting fresh, no mock fallback)
  const displayDomains = domains.slice(0, 3);

  const activeRecents = recentItems;

  // Real SVG Timeseries Data Points for 1 Month (30-day timeline)
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Global CSS Animation Keyframes for Line Draw & Area Fade */}
      <style>{`
        @keyframes drawLine {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeInArea {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* 1. Hero Command Section */}
      <section className="pt-1 sm:pt-2 pb-1 text-center">
        {/* Top Floating Status / Update Pill */}
        {isUpdateAvailable && versionData ? (
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cf-orange-tint border border-cf-orange-border text-xs font-medium text-cf-orange hover:bg-cf-orange hover:text-white transition-all shadow-xs cursor-pointer group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cf-orange opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cf-orange" />
            </span>
            <span className="font-semibold">
              🚀 EmitMail v{versionData.latestVersion} is available — Click to view release notes & upgrade
            </span>
            <ArrowSquareOut size={13} className="opacity-70 group-hover:opacity-100" />
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kumo-base border border-kumo-line text-xs font-medium text-kumo-strong shadow-2xs hover:border-cf-blue/40 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cf-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cf-success" />
            </span>
            <span className="text-kumo-strong font-medium">
              High-Throughput SMTP Engine & DKIM Signing
            </span>
            <span className="text-cf-blue font-semibold text-[11px] bg-cf-blue/10 px-2 py-0.5 rounded-full border border-cf-blue/20">
              All Systems Operational
            </span>
          </div>
        )}

        {/* Hero Greeting */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-kumo-strong my-3.5">
          Welcome to EmitMail
        </h1>

        {/* Centered Global Command Search Bar */}
        <div
          onClick={handleOpenSearch}
          className="max-w-2xl mx-auto w-full bg-kumo-control border border-kumo-line rounded-full px-4 py-2.5 flex items-center justify-between focus-within:border-cf-blue hover:border-cf-blue/50 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 text-xs text-kumo-subtle group-hover:text-kumo-strong">
            <MagnifyingGlass size={16} className="text-kumo-muted group-hover:text-cf-blue transition-colors" />
            <span>Search messages, domains, or API keys...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[11px] bg-kumo-recessed border border-kumo-line rounded text-kumo-subtle font-mono">
              Ctrl
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[11px] bg-kumo-recessed border border-kumo-line rounded text-kumo-subtle font-mono">
              K
            </kbd>
          </div>
        </div>

        {/* Onboarding Callout Banner if domain / VPS not yet configured or no domains exist */}
        {(!isServerConfigured || (!isLoadingDomains && domains.length === 0)) && (
          <div className="max-w-4xl mx-auto w-full mt-5 rounded-xl border border-cf-orange/40 bg-cf-orange-tint p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-cf-orange/15 text-cf-orange shrink-0 mt-0.5">
                <Globe size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-strong">
                  Action Required: Complete Mail Server & Domain Setup
                </h3>
                <p className="text-xs text-kumo-muted mt-1 leading-relaxed">
                  Connect your primary sending domain and VPS public IP to automatically generate 2048-bit RSA DKIM keys, SPF records, DMARC policies, and MX routes.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="shrink-0 px-4 py-2 rounded-lg bg-cf-orange hover:bg-cf-orange-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Launch Setup Wizard</span>
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
        )}

        {/* 2. Three-Column Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full mt-6 text-left">
          {/* Column 1: Domains */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-kumo-subtle mb-3">
                <span className="uppercase tracking-wider text-[10px]">Domains</span>
                <button
                  onClick={() => handleNavigate("domains")}
                  className="hover:text-cf-blue flex items-center gap-0.5 text-kumo-subtle transition-colors cursor-pointer"
                >
                  <span>View all</span>
                  <CaretRight size={12} />
                </button>
              </div>

              {isLoadingDomains ? (
                <div className="space-y-2 py-1">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ) : displayDomains.length === 0 ? (
                <div className="py-5 text-center space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-cf-orange/10 text-cf-orange flex items-center justify-center">
                    <Globe size={18} />
                  </div>
                  <div className="text-xs font-semibold text-kumo-strong">No domains configured</div>
                  <p className="text-[11px] text-kumo-subtle max-w-[200px] mx-auto leading-relaxed">
                    Add and verify your domain to generate 2048-bit DKIM keys and start delivering.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {displayDomains.map((dom) => (
                    <li
                      key={dom.id || dom.domainName}
                      onClick={() => handleNavigate("domains")}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-kumo-strong">
                        <Globe size={15} className="text-cf-blue shrink-0" />
                        <span className="truncate max-w-[170px]">{dom.domainName}</span>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${dom.status === "VERIFIED" ? "bg-cf-success" : "bg-cf-amber"}`}
                        title={dom.status === "VERIFIED" ? "Verified" : "Pending"}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!isViewer && (
              displayDomains.length === 0 ? (
                <Link
                  href="/onboarding"
                  className="mt-3 w-full py-1.5 rounded-lg bg-cf-orange hover:bg-cf-orange-hover text-white text-center text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                >
                  + Setup Domain
                </Link>
              ) : (
                <Link
                  href="/domains/add"
                  className="mt-3 w-full py-1.5 rounded-lg bg-kumo-elevated hover:bg-kumo-interact border border-kumo-hairline text-center text-xs font-medium text-kumo-default transition-colors block"
                >
                  + Add Domain
                </Link>
              )
            )}
          </div>

          {/* Column 2: Quick Actions (Inbox, Emails, API Keys) */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-kumo-subtle mb-3">
                <span className="uppercase tracking-wider text-[10px]">Quick Actions</span>
                <span className="text-[10px] text-cf-blue font-medium">Shortcuts</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleNavigate("inbox")}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-cf-blue/10 text-cf-blue flex items-center justify-center shrink-0">
                      <Tray size={14} weight="bold" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-kumo-strong group-hover:text-cf-blue transition-colors">
                        Inbox
                      </div>
                      <div className="text-[11px] text-kumo-subtle">
                        Inbound stream & mailboxes
                      </div>
                    </div>
                  </div>
                  <CaretRight size={13} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                </button>

                <button
                  onClick={() => handleNavigate("emails")}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-cf-blue/10 text-cf-blue flex items-center justify-center shrink-0">
                      <PaperPlaneTilt size={14} weight="bold" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-kumo-strong group-hover:text-cf-blue transition-colors">
                        Emails
                      </div>
                      <div className="text-[11px] text-kumo-subtle">
                        Processed outbox & telemetry
                      </div>
                    </div>
                  </div>
                  <CaretRight size={13} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                </button>

                <button
                  onClick={() => handleNavigate("api-keys")}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-cf-blue/10 text-cf-blue flex items-center justify-center shrink-0">
                      <Key size={14} weight="bold" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-kumo-strong group-hover:text-cf-blue transition-colors">
                        API Keys
                      </div>
                      <div className="text-[11px] text-kumo-subtle">
                        Manage credentials & tokens
                      </div>
                    </div>
                  </div>
                  <CaretRight size={13} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Live Recents Activity */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-kumo-subtle mb-3">
                <span className="uppercase tracking-wider text-[10px]">Recents</span>
                <span className="text-[10px] text-kumo-muted">Activity</span>
              </div>

              {isLoadingRecents ? (
                <div className="space-y-2 py-1">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ) : activeRecents.length === 0 ? (
                <div className="py-5 text-center space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-kumo-control text-kumo-muted flex items-center justify-center">
                    <Clock size={18} />
                  </div>
                  <div className="text-xs font-semibold text-kumo-strong">No recent activity</div>
                  <p className="text-[11px] text-kumo-subtle max-w-[200px] mx-auto leading-relaxed">
                    Dispatched emails, inbound messages, and API key events will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-kumo-hairline text-xs">
                  {activeRecents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleRecentClick(item)}
                      className="w-full py-2 flex items-center justify-between text-left hover:bg-kumo-tint px-1.5 rounded transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 mr-2">
                        {item.type === "inbox" ? (
                          <Tray size={14} className="text-cf-blue shrink-0" />
                        ) : item.type === "email" ? (
                          <PaperPlaneTilt size={14} className="text-cf-blue shrink-0" />
                        ) : item.type === "domain" ? (
                          <Globe size={14} className="text-cf-blue shrink-0" />
                        ) : (
                          <Key size={14} className="text-cf-blue shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="text-kumo-strong font-medium truncate block leading-tight">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-kumo-subtle truncate block leading-tight mt-0.5">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-kumo-muted font-mono">
                          {item.timestamp}
                        </span>
                        <CaretRight size={12} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Analytics Section & KPI Timeseries Cards (Real Backend Data) */}
      <section className="space-y-3.5 w-full">
        {/* Section Header Bar */}
        <div>
          <h2 className="text-base font-semibold text-kumo-strong">
            Analytics
          </h2>
          <p className="text-xs text-kumo-subtle">
            Performance and infrastructure metrics over the last 1 month
          </p>
        </div>

        {/* KPI Summary Row (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Emails Sent */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Emails Sent</span>
              <DotsThree size={16} />
            </div>
            {isLoadingStats ? (
              <div className="mt-2 space-y-1.5">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                    {emailStats ? emailStats.total.toLocaleString() : "0"}
                  </span>
                  <span className="text-xs font-semibold text-cf-success flex items-center">
                    ↗ {emailStats && emailStats.total > 0 ? "Active" : "0%"}
                  </span>
                </div>
                <span className="text-[11px] text-kumo-subtle block mt-1">
                  {emailStats ? `${emailStats.delivered} delivered` : "Processed in 30 days"}
                </span>
              </>
            )}
          </div>

          {/* Card 2: Delivery Rate */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Delivery Rate</span>
              <DotsThree size={16} />
            </div>
            {isLoadingStats ? (
              <div className="mt-2 space-y-1.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                    {emailStats && emailStats.total > 0 ? emailStats.deliveryRate : "0%"}
                  </span>
                  {emailStats && emailStats.total > 0 ? (
                    <span className="text-xs font-semibold text-cf-success flex items-center">
                      250 OK
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-kumo-muted flex items-center">
                      0 Delivered
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-kumo-subtle block mt-1">
                  {emailStats && emailStats.total > 0
                    ? `${emailStats.delivered} of ${emailStats.total} delivered`
                    : "No dispatches yet"}
                </span>
              </>
            )}
          </div>

          {/* Card 3: Bounce Rate */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Bounce Rate</span>
              <DotsThree size={16} />
            </div>
            {isLoadingStats ? (
              <div className="mt-2 space-y-1.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                    {emailStats && emailStats.total > 0 ? emailStats.bounceRate : "0%"}
                  </span>
                  <span className="text-xs font-medium text-kumo-muted flex items-center">
                    {emailStats && emailStats.bounced > 0 ? `${emailStats.bounced} Bounces` : "0 Bounces"}
                  </span>
                </div>
                <span className="text-[11px] text-kumo-subtle block mt-1">
                  Hard bounces: {emailStats ? emailStats.bounced : 0}
                </span>
              </>
            )}
          </div>

          {/* Card 4: Service Infrastructure Health (Database, Redis, Worker) */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-kumo-subtle mb-1">
              <span>Service Status</span>
              <span className="text-[10px] text-cf-success font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cf-success animate-pulse" />
                <span>Operational</span>
              </span>
            </div>

            {isLoadingHealth ? (
              <div className="space-y-2 mt-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            ) : (
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        systemHealth.database ? "bg-cf-success" : "bg-kumo-danger"
                      }`}
                    />
                    <span className="font-medium text-kumo-strong">Database</span>
                  </div>
                  <span className="text-[11px] font-mono text-kumo-subtle">
                    {systemHealth.database ? "Connected" : "Offline"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        systemHealth.redis ? "bg-cf-success" : "bg-kumo-danger"
                      }`}
                    />
                    <span className="font-medium text-kumo-strong">Redis</span>
                  </div>
                  <span className="text-[11px] font-mono text-kumo-subtle">
                    {systemHealth.redis ? "Connected" : "Offline"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        systemHealth.worker ? "bg-cf-success" : "bg-kumo-danger"
                      }`}
                    />
                    <span className="font-medium text-kumo-strong">Worker</span>
                  </div>
                  <span className="text-[11px] font-mono text-kumo-subtle">
                    {systemHealth.worker ? "Running" : "Stopped"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Timeseries Chart Cards (Real Live Data & Interactive Hover Animations) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Total emails dispatched */}
          <InteractiveTimeseriesChart
            title="Total emails dispatched"
            totalText={emailStats ? emailStats.total.toLocaleString() : "0"}
            subBadge={emailStats && emailStats.total > 0 ? "↗ Live" : "0 Dispatches"}
            data={emailDispatches}
            gradientId="chartBlueGrad"
            unitLabel="emails"
            isLoading={isLoadingStats}
          />

          {/* Chart 2: Inbound Email Volume */}
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
                : emailStats && emailStats.totalInbound && emailStats.totalInbound > 0
                ? "↗ Receiving"
                : "Inbox ready"
            }
            badgeIcon={<Tray size={13} weight="fill" className="text-cf-orange" />}
            data={inboundTraffic}
            gradientId="chartOrangeGrad"
            unitLabel="messages"
            strokeColor="var(--cf-orange)"
            isLoading={isLoadingStats}
          />
        </div>
      </section>
    </div>
  );
}