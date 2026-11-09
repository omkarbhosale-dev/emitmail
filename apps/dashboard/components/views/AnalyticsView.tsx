"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  Clock,
  Tray,
  PaperPlaneTilt,
  WarningCircle,
  ShieldCheck,
  Funnel,
  Globe,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { ApiDomain } from "@/types";

type TimeRangeOption = "today" | "week" | "month" | "custom";

interface ChartDataPoint {
  time: string;
  val: number;
}

interface AnalyticsChartProps {
  title: string;
  totalText: string;
  subBadge?: string;
  badgeIcon?: React.ReactNode;
  data: ChartDataPoint[];
  gradientId: string;
  unitLabel: string;
  strokeColor?: string;
  isLoading?: boolean;
}

function AnalyticsTimeseriesChart({
  title,
  totalText,
  subBadge,
  badgeIcon,
  data,
  gradientId,
  unitLabel,
  strokeColor,
  isLoading,
}: AnalyticsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartWidth = 500;
  const chartHeight = 120;
  const maxVal = Math.max(...data.map((d) => d.val), 5);
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const isOrange = gradientId.includes("Orange") || gradientId.includes("Engine");
  const chartColor = strokeColor || (isOrange ? "var(--cf-orange)" : "var(--cf-chart-blue)");

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
    <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-68 relative overflow-hidden group hover:border-kumo-line/80 transition-colors shadow-2xs">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base font-medium text-kumo-strong">{title}</span>
          <span className="text-xs text-kumo-subtle font-mono flex items-center gap-1.5">
            {badgeIcon}
            <span>Timeline</span>
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-semibold text-kumo-strong tracking-tight font-mono leading-none">
              {totalText}
            </span>
          )}
          {subBadge ? (
            <span className="text-xs font-medium text-cf-success">{subBadge}</span>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="w-full h-28 mt-4 rounded-lg" />
      ) : (
        <div className="relative mt-3 pt-2 select-none">
          {/* Y-Axis Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-xs text-kumo-subtle font-mono">
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

          {/* SVG Canvas & Hover Card Container */}
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

              {/* Area fill */}
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                className="transition-all duration-300"
                style={{
                  animation: "fadeInArea 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
              />

              {/* Stroke line */}
              <path
                d={linePath}
                fill="none"
                stroke={chartColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="1000"
                strokeDashoffset="0"
                style={{
                  animation: "drawLine 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
              />

              {/* Hover tracking vertical guide */}
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

              {/* Points */}
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

              {/* Seamless Hitboxes */}
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

            {/* Hover Card Overlay */}
            {activePoint && (
              <div
                className="absolute pointer-events-none z-30 transition-all duration-150 ease-out"
                style={{
                  left: `${(activePoint.x / chartWidth) * 100}%`,
                  top: `${(activePoint.y / chartHeight) * 100}%`,
                  transform: cardTransform,
                }}
              >
                <div className="bg-kumo-base/95 backdrop-blur-md border border-kumo-hairline shadow-2xl rounded-xl p-3 min-w-44 select-none text-left ring-1 ring-black/10">
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-kumo-hairline">
                    <span className="text-xs font-medium text-kumo-subtle font-mono flex items-center gap-1.5">
                      <CalendarBlank size={13} className="text-kumo-muted" />
                      {activePoint.time}
                    </span>
                    <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-kumo-elevated text-kumo-subtle border border-kumo-hairline">
                      Metric
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-kumo-base shrink-0"
                        style={{ backgroundColor: chartColor }}
                      />
                      <span className="text-sm text-kumo-subtle capitalize font-medium">{unitLabel}</span>
                    </div>
                    <span className="text-base font-semibold font-mono text-kumo-strong tracking-tight">
                      {activePoint.val.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-kumo-hairline/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-kumo-subtle">Activity</span>
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        activePoint.val > 0 ? "text-cf-success" : "text-kumo-subtle"
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
          <div className="flex justify-between text-xs text-kumo-subtle mt-2.5 font-mono">
            {data.map((d, idx) => (
              <span key={`${d.time}-${idx}`}>{d.time}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsView() {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedDomainId, setSelectedDomainId] = useState<string>("all");
  const [domains, setDomains] = useState<ApiDomain[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [stats, setStats] = useState<{
    totalSent: number;
    delivered: number;
    bounced: number;
    queued: number;
    failed: number;
    suppressed: number;
    deliveryRate: string;
    bounceRate: string;
    totalInbound: number;
    unreadInbound: number;
    avgAttempts: string;
    chartOutbound: ChartDataPoint[];
    chartInbound: ChartDataPoint[];
    domainStats: {
      domainId: string;
      domainName: string;
      sent: number;
      delivered: number;
      bounced: number;
      deliveryRate: string;
      status: string;
    }[];
    statusBreakdown: {
      status: string;
      count: number;
      percentage: number;
      color: string;
    }[];
    health: {
      database: boolean;
      redis: boolean;
      worker: boolean;
    };
  } | null>(null);

  // Load Domains for filter dropdown
  useEffect(() => {
    api.domains.list()
      .then((items) => {
        if (Array.isArray(items)) setDomains(items);
      })
      .catch((err) => {
        console.error("Failed to load domains in AnalyticsView:", err);
      });
  }, []);

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const data = await api.analytics.getDetailedStats({
        timeRange,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
        domainId: selectedDomainId,
      });
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch detailed analytics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange, customStartDate, customEndDate, selectedDomainId]);

  useEffect(() => {
    let isMounted = true;
    api.analytics
      .getDetailedStats({
        timeRange,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
        domainId: selectedDomainId,
      })
      .then((data) => {
        if (!isMounted) return;
        setStats(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to fetch detailed analytics:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [timeRange, customStartDate, customEndDate, selectedDomainId]);

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
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      {/* Top Header & Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-kumo-hairline pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-kumo-strong leading-tight">
            Analytics
          </h1>
          <p className="text-sm text-kumo-subtle mt-0.5 font-normal leading-relaxed">
            Real-time delivery performance, bounce analytics, and traffic trends across your infrastructure.
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Domain Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedDomainId}
              onChange={(e) => setSelectedDomainId(e.target.value)}
              className="h-9 bg-kumo-base hover:bg-kumo-elevated border border-kumo-hairline hover:border-kumo-line text-sm text-kumo-strong font-medium rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-cf-blue/80 focus:ring-1 focus:ring-cf-blue/30 cursor-pointer appearance-none shadow-2xs transition-colors"
              aria-label="Filter by domain"
            >
              <option value="all">All Domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.domainName}
                </option>
              ))}
            </select>
            <Globe
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
            />
          </div>

          {/* Time Range Pills */}
          <div className="bg-kumo-elevated border border-kumo-hairline p-0.5 rounded-lg flex items-center shadow-2xs">
            {(
              [
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeRange(opt.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  timeRange === opt.id
                    ? "bg-kumo-base text-kumo-strong shadow-2xs font-medium border border-kumo-line/50"
                    : "text-kumo-subtle hover:text-kumo-strong font-normal"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => fetchAnalytics(false)}
            disabled={isRefreshing}
            className="p-2 text-kumo-subtle hover:text-kumo-strong bg-kumo-base hover:bg-kumo-elevated border border-kumo-hairline hover:border-kumo-line rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <ArrowsClockwise
              size={16}
              className={`${isRefreshing ? "animate-spin text-cf-blue" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Accordion (When 'Custom' is selected) */}
      {timeRange === "custom" && (
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-3.5 flex flex-wrap items-center gap-3 text-sm animate-in fade-in duration-150 shadow-2xs">
          <div className="flex items-center gap-1.5 text-kumo-strong font-medium">
            <Funnel size={14} className="text-cf-blue" />
            <span>Custom Date Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-kumo-subtle">Start:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-kumo-elevated border border-kumo-hairline text-kumo-strong rounded-md px-2.5 py-1 font-mono text-sm focus:outline-none focus:border-cf-blue"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-kumo-subtle">End:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-kumo-elevated border border-kumo-hairline text-kumo-strong rounded-md px-2.5 py-1 font-mono text-sm focus:outline-none focus:border-cf-blue"
            />
          </div>

          <button
            onClick={() => fetchAnalytics(false)}
            className="px-3 py-1.5 bg-cf-blue text-white rounded-md font-medium hover:bg-cf-blue-hover transition-colors text-sm ml-auto sm:ml-0 shadow-2xs cursor-pointer"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* 6 Core Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Emails Sent */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-kumo-subtle">Emails Sent</span>
            <PaperPlaneTilt size={15} className="text-cf-blue" />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-semibold font-mono text-kumo-strong tracking-tight leading-none">
                {stats?.totalSent.toLocaleString() ?? "0"}
              </div>
            )}
            <div className="text-xs text-kumo-subtle mt-1.5 font-normal leading-normal">
              Outbound dispatches
            </div>
          </div>
        </div>

        {/* Metric 2: Delivery Rate */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-kumo-subtle">Delivery Rate</span>
            <CheckCircle size={15} className="text-cf-success" />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className={`text-2xl font-semibold font-mono tracking-tight leading-none ${
                stats && stats.totalSent > 0 ? "text-cf-success" : "text-kumo-strong"
              }`}>
                {stats && stats.totalSent > 0 ? stats.deliveryRate : "0.0%"}
              </div>
            )}
            <div className="text-xs text-kumo-subtle mt-1.5 font-normal leading-normal">
              {stats?.delivered ?? 0} of {stats?.totalSent ?? 0} delivered
            </div>
          </div>
        </div>

        {/* Metric 3: Bounce Rate */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-kumo-subtle">Bounce Rate</span>
            <WarningCircle size={15} className="text-cf-orange" />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-semibold font-mono text-kumo-strong tracking-tight leading-none">
                {stats?.bounceRate ?? "0.0%"}
              </div>
            )}
            <div className="text-xs text-kumo-subtle mt-1.5 font-normal leading-normal">
              {stats?.bounced ?? 0} total bounces
            </div>
          </div>
        </div>

        {/* Metric 4: Inbound Received */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-kumo-subtle">Inbound Received</span>
            <Tray size={15} className="text-cf-orange" />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-semibold font-mono text-kumo-strong tracking-tight leading-none">
                {stats?.totalInbound.toLocaleString() ?? "0"}
              </div>
            )}
            <div className="text-xs text-kumo-subtle mt-1.5 font-normal leading-normal">
              {stats?.unreadInbound ?? 0} unread messages
            </div>
          </div>
        </div>

        {/* Metric 5: Suppressed / Failed */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-kumo-subtle">Suppressed / Fail</span>
            <ShieldCheck size={15} className="text-kumo-subtle" />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-semibold font-mono text-kumo-strong tracking-tight leading-none">
                {(stats?.suppressed ?? 0) + (stats?.failed ?? 0)}
              </div>
            )}
            <div className="text-xs text-kumo-subtle mt-1.5 font-normal leading-normal">
              {stats?.suppressed ?? 0} suppressed, {stats?.failed ?? 0} failed
            </div>
          </div>
        </div>

        {/* Metric 6: Delivery Retries */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-kumo-subtle">Avg Retries</span>
            <Clock size={15} className="text-kumo-subtle" />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-semibold font-mono text-kumo-strong tracking-tight leading-none">
                {stats?.avgAttempts ?? "1.0"}
              </div>
            )}
            <div className="text-xs text-kumo-subtle mt-1.5 font-normal leading-normal">
              Attempts per message
            </div>
          </div>
        </div>
      </div>

      {/* 2 Interactive Timeseries Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graph 1: Outbound Email Dispatches */}
        <AnalyticsTimeseriesChart
          title="Outbound email dispatches"
          totalText={stats ? stats.totalSent.toLocaleString() : "0"}
          subBadge={stats && stats.totalSent > 0 ? "↗ Live" : undefined}
          data={stats?.chartOutbound && stats.chartOutbound.length > 0 ? stats.chartOutbound : [{ time: "Start", val: 0 }, { time: "End", val: 0 }]}
          gradientId="analyticsBlueGrad"
          unitLabel="emails"
          strokeColor="var(--cf-chart-blue)"
          isLoading={isLoading}
        />

        {/* Graph 2: Inbound Email Volume */}
        <AnalyticsTimeseriesChart
          title="Inbound email volume"
          totalText={stats ? stats.totalInbound.toLocaleString() : "0"}
          subBadge={stats && stats.unreadInbound > 0 ? `${stats.unreadInbound} unread` : "↗ Receiving"}
          badgeIcon={<Tray size={13} weight="fill" className="text-cf-orange" />}
          data={stats?.chartInbound && stats.chartInbound.length > 0 ? stats.chartInbound : [{ time: "Start", val: 0 }, { time: "End", val: 0 }]}
          gradientId="analyticsOrangeGrad"
          unitLabel="messages"
          strokeColor="var(--cf-orange)"
          isLoading={isLoading}
        />
      </div>

      {/* Detailed Insights: Delivery Status Distribution & Domain Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Delivery Status Distribution Bar Card */}
        <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-kumo-strong">Status Distribution</span>
              <span className="text-xs font-mono text-kumo-muted">All dispatches</span>
            </div>
            <p className="text-sm text-kumo-subtle mt-0.5 font-normal">Breakdown of delivery lifecycle outcomes.</p>

            {/* Segmented Stacked Progress Bar */}
            <div className="h-3 w-full bg-kumo-elevated rounded-full overflow-hidden flex mt-4 border border-kumo-hairline">
              {stats?.statusBreakdown.map((sb, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${sb.percentage}%`,
                    backgroundColor: sb.color,
                  }}
                  className="h-full transition-all duration-500"
                  title={`${sb.status}: ${sb.count} (${sb.percentage}%)`}
                />
              ))}
            </div>

            {/* Legend List */}
            <div className="mt-4 space-y-2">
              {stats?.statusBreakdown.map((sb, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sb.color }}
                    />
                    <span className="text-kumo-default font-sans text-sm font-normal">{sb.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-kumo-strong font-semibold text-sm">{sb.count}</span>
                    <span className="text-kumo-subtle text-xs w-10 text-right">({sb.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="mt-5 pt-3.5 border-t border-kumo-hairline flex items-center justify-between text-sm">
            <span className="text-kumo-subtle font-medium">System State:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-xs text-kumo-default font-medium">
                <span className={`w-2 h-2 rounded-full ${stats?.health.database ? "bg-cf-success" : "bg-kumo-danger"}`} />
                DB
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-kumo-default font-medium">
                <span className={`w-2 h-2 rounded-full ${stats?.health.redis ? "bg-cf-success" : "bg-kumo-danger"}`} />
                Redis
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-kumo-default font-medium">
                <span className={`w-2 h-2 rounded-full ${stats?.health.worker ? "bg-cf-success" : "bg-kumo-danger"}`} />
                Worker
              </span>
            </div>
          </div>
        </div>

        {/* Domain Performance Table (Spans 2 columns on lg) */}
        <div className="lg:col-span-2 bg-kumo-base border border-kumo-hairline rounded-xl p-5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-kumo-strong">Domain Performance</span>
              <span className="text-xs font-mono text-kumo-muted">Tenancy metrics</span>
            </div>
            <p className="text-sm text-kumo-subtle mt-0.5 font-normal">
              Deliverability and volume tracked per verified sending domain.
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm font-mono border-collapse">
                <thead>
                  <tr className="border-b border-kumo-hairline text-kumo-subtle text-sm">
                    <th className="pb-2.5 font-medium">Domain</th>
                    <th className="pb-2.5 font-medium text-right">Sent</th>
                    <th className="pb-2.5 font-medium text-right">Delivered</th>
                    <th className="pb-2.5 font-medium text-right">Bounces</th>
                    <th className="pb-2.5 font-medium text-right">Delivery Rate</th>
                    <th className="pb-2.5 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kumo-hairline/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ) : stats?.domainStats && stats.domainStats.length > 0 ? (
                    stats.domainStats.map((dom) => (
                      <tr key={dom.domainId} className="hover:bg-kumo-elevated/40 transition-colors">
                        <td className="py-2.5 font-sans font-medium text-sm text-kumo-strong flex items-center gap-1.5">
                          <Globe size={14} className="text-kumo-muted shrink-0" />
                          <span>{dom.domainName}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-sm text-kumo-default">{dom.sent}</td>
                        <td className="py-2.5 text-right font-mono text-sm text-cf-success font-medium">{dom.delivered}</td>
                        <td className="py-2.5 text-right font-mono text-sm text-kumo-default">{dom.bounced}</td>
                        <td className="py-2.5 text-right font-mono text-sm text-kumo-strong font-semibold">{dom.deliveryRate}</td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            dom.status === "VERIFIED"
                              ? "bg-cf-success/10 text-cf-success border border-cf-success/20"
                              : "bg-kumo-elevated text-kumo-subtle border border-kumo-hairline"
                          }`}>
                            {dom.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-kumo-muted text-sm">
                        No domains registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-kumo-hairline flex items-center justify-between text-xs text-kumo-subtle">
            <span>Aggregated across active DKIM & SPF domains</span>
            <span className="flex items-center gap-1 font-mono text-xs text-cf-blue hover:underline cursor-pointer">
              Manage domains <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
