"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  CalendarBlank,
  Tray,
  PaperPlaneTilt,
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
          <span className="text-2xs text-zinc-500 font-mono flex items-center gap-1.5">
            {badgeIcon}
            <span>Timeline</span>
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold text-zinc-100 font-mono tracking-tight leading-none">
              {totalText}
            </span>
          )}
          {subBadge ? (
            <span className="text-xs font-medium text-emerald-400">{subBadge}</span>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="w-full h-28 mt-3 rounded-md" />
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

          {/* SVG Canvas & Hover Card Container */}
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
                    <span>Timeline</span>
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
    avgAttempts: string;
    totalInbound: number;
    unreadInbound: number;
    chartOutbound: ChartDataPoint[];
    chartInbound: ChartDataPoint[];
    statusBreakdown: { status: string; count: number; percentage: number; color: string }[];
    domainStats: {
      domainId: string;
      domainName: string;
      sent: number;
      delivered: number;
      bounced: number;
      deliveryRate: string;
      status: string;
    }[];
    health: {
      database: boolean;
      redis: boolean;
      worker: boolean;
    };
  } | null>(null);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const data = await api.analytics.getDetailedStats({
        timeRange,
        startDate: timeRange === "custom" ? customStartDate : undefined,
        endDate: timeRange === "custom" ? customEndDate : undefined,
        domainId: selectedDomainId !== "all" ? selectedDomainId : undefined,
      });

      if (data) {
        setStats({
          totalSent: data.totalSent ?? 0,
          delivered: data.delivered ?? 0,
          bounced: data.bounced ?? 0,
          queued: data.queued ?? 0,
          failed: data.failed ?? 0,
          suppressed: data.suppressed ?? 0,
          deliveryRate: data.deliveryRate ?? "0%",
          bounceRate: data.bounceRate ?? "0%",
          avgAttempts: data.avgAttempts ?? "1.0",
          totalInbound: data.totalInbound ?? 0,
          unreadInbound: data.unreadInbound ?? 0,
          chartOutbound: data.chartOutbound || [],
          chartInbound: data.chartInbound || [],
          statusBreakdown: data.statusBreakdown || [],
          domainStats: data.domainStats || [],
          health: data.health || { database: true, redis: true, worker: true },
        });
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange, customStartDate, customEndDate, selectedDomainId]);

  useEffect(() => {
    api.domains
      .list()
      .then((items) => {
        setDomains(items || []);
      })
      .catch((err) => {
        console.error("Failed to load domains in Analytics:", err);
      });
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Filter Controls Bar */}
      <div className="border-b border-zinc-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
            Analytics
          </h1>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Delivery performance, bounce analytics, and traffic trends.
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Domain Dropdown */}
          <div className="relative">
            <select
              value={selectedDomainId}
              onChange={(e) => setSelectedDomainId(e.target.value)}
              className="h-10 bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 font-medium rounded-md px-3 pr-8 focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none"
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
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
          </div>

          {/* Time Range Pills */}
          <div className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-md flex items-center">
            {(
              [
                { id: "today", label: "Today" },
                { id: "week", label: "7D" },
                { id: "month", label: "30D" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeRange(opt.id)}
                className={`px-3 py-1.5 rounded text-xs md:text-[13px] font-medium transition-colors cursor-pointer ${
                  timeRange === opt.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
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
            className="btn-cf-secondary h-10 px-3"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <ArrowsClockwise
              size={13}
              className={`${isRefreshing ? "animate-spin text-zinc-400" : "text-zinc-400"}`}
            />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker (When 'Custom' is selected) */}
      {timeRange === "custom" && (
        <div className="border border-zinc-800/80 rounded-lg p-3 bg-zinc-900/40 flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-150">
          <span className="text-zinc-300 font-medium">Custom Range:</span>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">From</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-md px-2 py-1 font-mono text-xs focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">To</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-md px-2 py-1 font-mono text-xs focus:outline-none focus:border-zinc-700"
            />
          </div>

          <button
            onClick={() => fetchAnalytics(false)}
            className="btn-cf-primary h-9 px-3.5 ml-auto sm:ml-0"
          >
            Apply
          </button>
        </div>
      )}

      {/* 2. Unified Horizontal Metric Strip (6 Metrics) */}
      <div className="border border-zinc-800/80 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 bg-zinc-900/20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 overflow-hidden">
        {/* Metric 1: Emails Sent */}
        <div className="p-4">
          <span className="text-sm font-medium text-zinc-400 block">Sent</span>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {stats?.totalSent.toLocaleString() ?? "0"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">Dispatches</span>
        </div>

        {/* Metric 2: Delivery Rate */}
        <div className="p-4">
          <span className="text-sm font-medium text-zinc-400 block">Delivery Rate</span>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {stats && stats.totalSent > 0 ? stats.deliveryRate : "—"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {stats?.delivered ?? 0} delivered
          </span>
        </div>

        {/* Metric 3: Bounce Rate */}
        <div className="p-4">
          <span className="text-sm font-medium text-zinc-400 block">Bounce Rate</span>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {stats && stats.totalSent > 0 ? stats.bounceRate : "—"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {stats?.bounced ?? 0} bounced
          </span>
        </div>

        {/* Metric 4: Inbound Received */}
        <div className="p-4">
          <span className="text-sm font-medium text-zinc-400 block">Inbound</span>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {stats?.totalInbound.toLocaleString() ?? "0"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {stats?.unreadInbound ?? 0} unread
          </span>
        </div>

        {/* Metric 5: Suppressed / Fail */}
        <div className="p-4">
          <span className="text-sm font-medium text-zinc-400 block">Failures</span>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {(stats?.suppressed ?? 0) + (stats?.failed ?? 0)}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">
            {stats?.suppressed ?? 0} suppressed
          </span>
        </div>

        {/* Metric 6: Avg Retries */}
        <div className="p-4">
          <span className="text-sm font-medium text-zinc-400 block">Avg Attempts</span>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <span className="text-3xl md:text-[32px] font-bold tabular-nums tracking-tight text-zinc-100 font-mono mt-1.5 block">
              {stats?.avgAttempts ?? "1.0"}
            </span>
          )}
          <span className="text-xs md:text-[13px] text-zinc-400 mt-1 block font-mono">Per dispatch</span>
        </div>
      </div>

      {/* 3. Timeseries Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsTimeseriesChart
          title="Outbound email volume"
          totalText={stats ? stats.totalSent.toLocaleString() : "0"}
          subBadge={stats && stats.totalSent > 0 ? "Live" : undefined}
          data={stats?.chartOutbound && stats.chartOutbound.length > 0 ? stats.chartOutbound : [{ time: "Start", val: 0 }, { time: "End", val: 0 }]}
          gradientId="analyticsOutboundGrad"
          unitLabel="emails"
          isLoading={isLoading}
        />

        <AnalyticsTimeseriesChart
          title="Inbound email volume"
          totalText={stats ? stats.totalInbound.toLocaleString() : "0"}
          subBadge={stats && stats.unreadInbound > 0 ? `${stats.unreadInbound} unread` : undefined}
          badgeIcon={<Tray size={12} className="text-zinc-500" />}
          data={stats?.chartInbound && stats.chartInbound.length > 0 ? stats.chartInbound : [{ time: "Start", val: 0 }, { time: "End", val: 0 }]}
          gradientId="analyticsInboundGrad"
          unitLabel="messages"
          strokeColor="#FF6600"
          isLoading={isLoading}
        />
      </div>

      {/* 4. Delivery Status Distribution & Domain Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <div className="border border-zinc-800/80 rounded-lg p-4 bg-zinc-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-300">Status Distribution</span>
              <span className="text-2xs font-mono text-zinc-500">Lifecycle</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex mt-3">
              {stats?.statusBreakdown.map((sb, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${sb.percentage}%`,
                    backgroundColor: sb.color,
                  }}
                  className="h-full transition-all duration-300"
                  title={`${sb.status}: ${sb.count} (${sb.percentage}%)`}
                />
              ))}
            </div>

            {/* Legend List */}
            <div className="mt-4 space-y-2">
              {stats?.statusBreakdown.map((sb, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sb.color }}
                    />
                    <span className="text-zinc-400 font-sans text-xs">{sb.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-medium text-xs">{sb.count}</span>
                    <span className="text-zinc-500 text-2xs w-8 text-right">({sb.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-2xs">
            <span className="text-zinc-500">Services:</span>
            <div className="flex items-center gap-2.5 font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${stats?.health.database ? "bg-emerald-400" : "bg-red-400"}`} />
                DB
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${stats?.health.redis ? "bg-emerald-400" : "bg-red-400"}`} />
                Redis
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${stats?.health.worker ? "bg-emerald-400" : "bg-red-400"}`} />
                Worker
              </span>
            </div>
          </div>
        </div>

        {/* Domain Performance Table (Spans 2 columns on lg) */}
        <div className="lg:col-span-2 border border-zinc-800/80 rounded-lg p-4 bg-zinc-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-300">Domain Performance</span>
              <span className="text-2xs font-mono text-zinc-500">Tenancy</span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400 text-2xs uppercase tracking-wider select-none font-medium">
                    <th className="pb-2 font-medium">Domain</th>
                    <th className="pb-2 font-medium text-right">Sent</th>
                    <th className="pb-2 font-medium text-right">Delivered</th>
                    <th className="pb-2 font-medium text-right">Bounces</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ) : stats?.domainStats && stats.domainStats.length > 0 ? (
                    stats.domainStats.map((dom) => (
                      <tr key={dom.domainId} className="h-10 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 text-zinc-200 font-mono text-xs flex items-center gap-1.5">
                          <Globe size={13} className="text-zinc-500 shrink-0" />
                          <span>{dom.domainName}</span>
                        </td>
                        <td className="py-2 text-right font-mono text-zinc-300">{dom.sent}</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{dom.delivered}</td>
                        <td className="py-2 text-right font-mono text-zinc-400">{dom.bounced}</td>
                        <td className="py-2 text-right font-mono text-zinc-200 font-medium">{dom.deliveryRate}</td>
                        <td className="py-2 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-2xs font-medium ${
                            dom.status === "VERIFIED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                          }`}>
                            {dom.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-500 text-xs">
                        No domains registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-2xs text-zinc-500">
            <span>Aggregated across active domains</span>
            <Link
              href="/domains"
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Manage domains <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
