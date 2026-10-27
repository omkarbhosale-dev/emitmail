"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  PaperPlaneTilt,
  Globe,
  CaretRight,
  ArrowsClockwise,
  CalendarBlank,
  DotsThree,
  Lightning,
  CheckCircle,
} from "@phosphor-icons/react";
import { NavTab } from "@/types";
import { useModals } from "@/components/layout/AppShell";

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
  const modals = useModals();
  const [timeframe, setTimeframe] = useState("Last 24 hours");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNavigate = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      router.push(tab === "home" ? "/" : `/${tab}`);
    }
  };

  const handleOpenSearch = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    } else {
      modals.openCommandPalette();
    }
  };

  const handleSendTestEmail = () => {
    if (onTriggerSendTestEmail) {
      onTriggerSendTestEmail();
    } else {
      modals.openSendTestEmail();
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // SVG Timeseries Data Points for 24h charts
  const emailDispatches = [
    { time: "00:00", val: 32 },
    { time: "03:00", val: 24 },
    { time: "06:00", val: 45 },
    { time: "09:00", val: 92 },
    { time: "12:00", val: 118 },
    { time: "15:00", val: 104 },
    { time: "18:00", val: 86 },
    { time: "21:00", val: 68 },
    { time: "23:59", val: 74 },
  ];

  const workerInvocations = [
    { time: "00:00", val: 40 },
    { time: "03:00", val: 35 },
    { time: "06:00", val: 58 },
    { time: "09:00", val: 110 },
    { time: "12:00", val: 125 },
    { time: "15:00", val: 95 },
    { time: "18:00", val: 115 },
    { time: "21:00", val: 80 },
    { time: "23:59", val: 88 },
  ];

  const generateSvgPoints = (data: { val: number }[], width: number, height: number, maxVal: number) => {
    const stepX = width / (data.length - 1);
    const coords = data.map((d, i) => {
      const x = i * stepX;
      const y = height - (d.val / maxVal) * (height - 20) - 10;
      return { x, y };
    });

    const linePath = coords.reduce((acc, curr, i) => `${acc} ${i === 0 ? "M" : "L"} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`, "");
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    return { linePath, areaPath, coords };
  };

  const chartWidth = 500;
  const chartHeight = 120;
  const emailChart = generateSvgPoints(emailDispatches, chartWidth, chartHeight, 130);
  const workerChart = generateSvgPoints(workerInvocations, chartWidth, chartHeight, 140);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Hero Command Section ("Account Home" Pattern) */}
      <section className="pt-1 sm:pt-2 pb-1 text-center">
        {/* Top Floating Onboarding Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kumo-base border border-kumo-line text-xs font-medium text-kumo-strong shadow-2xs hover:border-cf-orange/40 transition-colors cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cf-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cf-success" />
          </span>
          <span className="text-kumo-strong font-medium">
            BullMQ Worker Engine & DKIM Signing Active
          </span>
          <span className="text-cf-orange font-semibold text-[11px] bg-cf-orange-tint px-2 py-0.5 rounded-full border border-cf-orange-border/30">
            Cluster v1.0
          </span>
        </div>

        {/* Hero Greeting */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-kumo-strong my-3.5">
          Coffee and code?
        </h1>

        {/* Centered Global Command Search Bar */}
        <div
          onClick={handleOpenSearch}
          className="max-w-2xl mx-auto w-full bg-kumo-control border border-kumo-line rounded-full px-4 py-2.5 flex items-center justify-between focus-within:border-cf-orange hover:border-cf-orange/50 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 text-xs text-kumo-subtle group-hover:text-kumo-strong">
            <MagnifyingGlass size={16} className="text-kumo-muted group-hover:text-cf-orange transition-colors" />
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

        {/* 2. Three-Column Quick Access Grid - Balanced width across container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full mt-6 text-left">
          {/* Column 1: Domains */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-kumo-subtle mb-3">
                <span className="uppercase tracking-wider text-[10px]">Domains</span>
                <button
                  onClick={() => handleNavigate("domains")}
                  className="hover:text-cf-orange flex items-center gap-0.5 text-kumo-subtle transition-colors"
                >
                  <span>View all</span>
                  <CaretRight size={12} />
                </button>
              </div>
              <ul className="space-y-1.5">
                <li
                  onClick={() => handleNavigate("domains")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-kumo-strong">
                    <Globe size={15} className="text-cf-orange shrink-0" />
                    <span>omkarbhosale.dev</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-cf-success" title="Verified" />
                </li>
                <li
                  onClick={() => handleNavigate("domains")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-kumo-strong">
                    <Globe size={15} className="text-cf-orange shrink-0" />
                    <span>emitmail.dev</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-cf-success" title="Verified" />
                </li>
                <li
                  onClick={() => handleNavigate("domains")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-kumo-tint cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-kumo-subtle">
                    <Globe size={15} className="text-kumo-muted shrink-0" />
                    <span>preview.mailflow.io</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-cf-amber" title="Pending DNS" />
                </li>
              </ul>
            </div>
            <Link
              href="/domains/add"
              className="mt-3 w-full py-1.5 rounded-lg bg-kumo-elevated hover:bg-kumo-interact border border-kumo-hairline text-center text-xs font-medium text-kumo-default transition-colors block"
            >
              + Add Domain
            </Link>
          </div>

          {/* Column 2: Quick Action / Workers */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-kumo-subtle mb-2.5">
                <span className="uppercase tracking-wider text-[10px]">Queue & Workers</span>
                <span className="text-[10px] text-cf-success font-medium">Online</span>
              </div>
              <p className="text-xs text-kumo-subtle leading-relaxed mb-4">
                Test real-time message routing, template variables, and worker queue acknowledgment.
              </p>
            </div>
            <button
              onClick={handleSendTestEmail}
              className="w-full bg-kumo-elevated hover:bg-kumo-interact border border-kumo-hairline hover:border-cf-blue/40 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-kumo-strong transition-all group cursor-pointer shadow-2xs"
            >
              <PaperPlaneTilt
                size={16}
                weight="fill"
                className="text-cf-blue group-hover:scale-110 transition-transform"
              />
              <span>Send test email</span>
            </button>
          </div>

          {/* Column 3: Recents */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-kumo-subtle mb-2.5">
                <span className="uppercase tracking-wider text-[10px]">Recents</span>
              </div>
              <div className="divide-y divide-kumo-hairline text-xs">
                <button
                  onClick={() => handleNavigate("domains")}
                  className="w-full py-2 flex items-center justify-between text-left hover:bg-kumo-tint px-1 rounded transition-colors group"
                >
                  <span className="text-kumo-subtle truncate">
                    Domains / <strong className="font-semibold text-kumo-strong">omkarbhosale.dev</strong>
                  </span>
                  <CaretRight size={12} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                </button>
                <button
                  onClick={() => handleNavigate("api-keys")}
                  className="w-full py-2 flex items-center justify-between text-left hover:bg-kumo-tint px-1 rounded transition-colors group"
                >
                  <span className="text-kumo-subtle truncate">
                    API Key / <strong className="font-semibold text-kumo-strong">Production Backend</strong>
                  </span>
                  <CaretRight size={12} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                </button>
                <button
                  onClick={() => handleNavigate("webhooks")}
                  className="w-full py-2 flex items-center justify-between text-left hover:bg-kumo-tint px-1 rounded transition-colors group"
                >
                  <span className="text-kumo-subtle truncate">
                    Webhook / <strong className="font-semibold text-kumo-strong">Delivery Events</strong>
                  </span>
                  <CaretRight size={12} className="text-kumo-muted group-hover:text-kumo-strong shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Analytics Section & KPI Timeseries Cards */}
      <section className="space-y-3.5 w-full">
        {/* Section Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-base font-semibold text-kumo-strong">
              Analytics
            </h2>
            <p className="text-xs text-kumo-subtle">
              Real-time delivery performance, bounce metrics, and queue latencies
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kumo-base border border-kumo-line text-xs font-medium text-kumo-strong shadow-2xs">
              <CalendarBlank size={14} className="text-kumo-subtle" />
              <span>{timeframe}</span>
            </div>
            <button
              onClick={handleRefresh}
              title="Refresh metrics"
              className="p-1.5 rounded-lg bg-kumo-base border border-kumo-line text-kumo-subtle hover:text-kumo-strong transition-colors"
            >
              <ArrowsClockwise
                size={16}
                className={isRefreshing ? "animate-spin text-cf-orange" : ""}
              />
            </button>
          </div>
        </div>

        {/* KPI Summary Row (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1 */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Total Emails Sent</span>
              <DotsThree size={16} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                48.2k
              </span>
              <span className="text-xs font-semibold text-cf-success flex items-center">
                ↗ 12.4%
              </span>
            </div>
            <span className="text-[11px] text-kumo-subtle block mt-1">vs previous 24h</span>
          </div>

          {/* Card 2 */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Delivery Rate</span>
              <DotsThree size={16} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                99.4%
              </span>
              <span className="text-xs font-semibold text-cf-success flex items-center">
                ↗ 0.2%
              </span>
            </div>
            <span className="text-[11px] text-kumo-subtle block mt-1">Inbox placement rate</span>
          </div>

          {/* Card 3 */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Bounce Rate</span>
              <DotsThree size={16} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                0.3%
              </span>
              <span className="text-xs font-semibold text-cf-success flex items-center">
                ↘ -0.1%
              </span>
            </div>
            <span className="text-[11px] text-kumo-subtle block mt-1">Hard bounces: 14</span>
          </div>

          {/* Card 4 */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-kumo-subtle">
              <span>Queue Latency</span>
              <DotsThree size={16} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-kumo-strong font-mono">
                42ms
              </span>
              <span className="text-xs font-semibold text-cf-success flex items-center gap-1">
                <Lightning size={13} weight="fill" />
                <span>Normal</span>
              </span>
            </div>
            <span className="text-[11px] text-kumo-subtle block mt-1">BullMQ Worker ACK</span>
          </div>
        </div>

        {/* 2-Column Timeseries Chart Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Total emails dispatched */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-kumo-subtle">
                  Total emails dispatched
                </span>
                <span className="text-[11px] text-kumo-muted font-mono">Hourly avg</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-kumo-strong tracking-tight font-mono">
                  4.33k
                </span>
                <span className="text-xs font-semibold text-cf-success">
                  ↗ 0.4%
                </span>
              </div>
            </div>

            {/* SVG Timeseries Area Chart */}
            <div className="relative mt-3 pt-2">
              {/* Y-Axis Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-kumo-muted font-mono">
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>120</span>
                </div>
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>90</span>
                </div>
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>60</span>
                </div>
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>0</span>
                </div>
              </div>

              {/* SVG Graphic */}
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-28 overflow-visible relative z-10"
              >
                <defs>
                  <linearGradient id="chartBlueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cf-chart-blue)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--cf-chart-blue)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={emailChart.areaPath}
                  fill="url(#chartBlueGrad)"
                />
                <path
                  d={emailChart.linePath}
                  fill="none"
                  stroke="var(--cf-chart-blue)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {emailChart.coords.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    className="fill-kumo-base stroke-[var(--cf-chart-blue)] stroke-2 hover:r-5 transition-all"
                  />
                ))}
              </svg>

              {/* X-Axis Timestamps */}
              <div className="flex justify-between text-[10px] text-kumo-muted mt-2 font-mono">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>

          {/* Chart 2: BullMQ Worker invocations */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-kumo-subtle">
                  BullMQ Worker invocations
                </span>
                <span className="text-[11px] text-cf-success font-medium flex items-center gap-1">
                  <CheckCircle size={13} weight="fill" />
                  <span>All queues drained</span>
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-kumo-strong tracking-tight font-mono">
                  12.8k
                </span>
                <span className="text-xs font-semibold text-cf-success">
                  ↗ 3.1%
                </span>
              </div>
            </div>

            {/* SVG Timeseries Area Chart */}
            <div className="relative mt-3 pt-2">
              {/* Y-Axis Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-kumo-muted font-mono">
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>140</span>
                </div>
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>95</span>
                </div>
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>50</span>
                </div>
                <div className="border-b border-kumo-hairline/60 w-full flex justify-between pr-1">
                  <span>0</span>
                </div>
              </div>

              {/* SVG Graphic */}
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-28 overflow-visible relative z-10"
              >
                <defs>
                  <linearGradient id="chartOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cf-orange)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--cf-orange)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={workerChart.areaPath}
                  fill="url(#chartOrangeGrad)"
                />
                <path
                  d={workerChart.linePath}
                  fill="none"
                  stroke="var(--cf-orange)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {workerChart.coords.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    className="fill-kumo-base stroke-[var(--cf-orange)] stroke-2 hover:r-5 transition-all"
                  />
                ))}
              </svg>

              {/* X-Axis Timestamps */}
              <div className="flex justify-between text-[10px] text-kumo-muted mt-2 font-mono">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
