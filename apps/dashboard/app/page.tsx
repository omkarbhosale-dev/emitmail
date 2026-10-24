"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChartBar,
  Globe,
  Key,
  EnvelopeSimple,
  House,
  CaretDown,
  CalendarBlank,
  PaperPlaneTilt,
  CheckCircle,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  List,
  X,
} from "@phosphor-icons/react";

import EmailPerformanceChart from "./components/EmailPerformanceChart";
import Sparkline from "./components/Sparkline";
import { KPI_DATA, SECONDARY_DATA } from "./dashboard/data";

type TrendDir = "pos" | "neg" | "neu";
type ArrowType = "diagonal" | "up" | "down" | "none";

interface KpiCardProps {
  label: string;
  value: string;
  trend: string;
  trendDir: TrendDir;
  arrowType: ArrowType;
  context: string;
  description: string;
  icon: React.ReactNode;
}

function KpiCard({
  label,
  value,
  trend,
  trendDir,
  arrowType,
  context,
  description,
  icon,
}: KpiCardProps) {
  const renderArrow = () => {
    if (arrowType === "diagonal") {
      return <ArrowUpRight size={13} weight="bold" aria-hidden="true" />;
    }
    if (arrowType === "up") {
      return <ArrowUp size={12} weight="bold" aria-hidden="true" />;
    }
    if (arrowType === "down") {
      return <ArrowDown size={12} weight="bold" aria-hidden="true" />;
    }
    return null;
  };

  return (
    <article className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors hover:border-gray-300">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
            {label}
          </span>
          <span className="text-gray-400" aria-hidden="true">
            {icon}
          </span>
        </div>
        <div
          className="text-[30px] font-bold text-[#111827] tracking-tight mt-1 mb-1 leading-none"
          aria-label={`${label}: ${value}`}
        >
          {value}
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px] mb-3.5 flex-wrap">
          <span
            className={`font-semibold flex items-center gap-0.5 ${
              trendDir === "pos"
                ? "text-[#16A34A]"
                : trendDir === "neg"
                  ? "text-[#DC2626]"
                  : "text-gray-500"
            }`}
            aria-label={trend}
          >
            {renderArrow()}
            {trend}
          </span>
          <span className="text-gray-400 font-normal">{context}</span>
        </div>
      </div>
      <div className="border-t border-[#F3F4F6] pt-2.5 text-[12px] text-gray-400 font-normal leading-tight">
        {description}
      </div>
    </article>
  );
}

interface SecondaryCardProps {
  label: string;
  value: string;
  trend: string;
  trendDir: TrendDir;
  arrowType: ArrowType;
  sparkColor: string;
  sparkValues: readonly number[];
}

function SecondaryCard({
  label,
  value,
  trend,
  trendDir,
  arrowType,
  sparkColor,
  sparkValues,
}: SecondaryCardProps) {
  const renderArrow = () => {
    if (arrowType === "up") {
      return <ArrowUp size={12} weight="bold" aria-hidden="true" />;
    }
    if (arrowType === "down") {
      return <ArrowDown size={12} weight="bold" aria-hidden="true" />;
    }
    if (arrowType === "diagonal") {
      return <ArrowUpRight size={13} weight="bold" aria-hidden="true" />;
    }
    return null;
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors hover:border-gray-300">
      <div className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mb-3">
        {label}
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span
            className="text-[26px] font-bold text-[#111827] tracking-tight leading-none"
            aria-label={`${label}: ${value}`}
          >
            {value}
          </span>
          <span
            className={`text-[12.5px] font-semibold flex items-center gap-0.5 ${
              trendDir === "pos"
                ? "text-[#16A34A]"
                : trendDir === "neg"
                  ? "text-[#DC2626]"
                  : "text-gray-500 font-medium"
            }`}
            aria-label={trend}
          >
            {renderArrow()}
            {trend}
          </span>
        </div>
        <Sparkline values={sparkValues} color={sparkColor} width={110} height={36} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden antialiased">
      {/* ── MOBILE BACKDROP ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── FIXED LEFT SIDEBAR (240px) ────────────────────────── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Branding */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 no-underline group"
              aria-label="EmitMail home"
            >
              <div className="w-[32px] h-[32px] rounded-lg bg-[#FF4D1A] flex items-center justify-center shrink-0 shadow-xs">
                <EnvelopeSimple size={19} weight="bold" className="text-white" />
              </div>
              <span className="text-[17.5px] font-bold text-[#111827] tracking-tight">
                EmitMail
              </span>
            </Link>

            {/* Mobile close button */}
            <button
              className="md:hidden p-1 text-gray-500 hover:text-gray-800"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          {/* Production organization selector */}
          <div className="mt-4">
            <button
              type="button"
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md hover:bg-gray-50 border border-transparent hover:border-[#E5E7EB] transition-colors cursor-pointer group text-left"
              aria-label="Organization: Production Org"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                <span className="text-[13px] font-medium text-gray-700 truncate">
                  Production Org
                </span>
              </div>
              <CaretDown
                size={13}
                className="text-gray-400 group-hover:text-gray-600 shrink-0 ml-1"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 pt-2">
          <div className="px-3 pb-2 pt-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            WORKSPACE
          </div>
          <nav className="space-y-1" aria-label="Workspace pages">
            {/* Active Dashboard */}
            <Link
              href="/"
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#FFF5F2] text-[#111827] font-semibold text-[13.5px] transition-colors"
              aria-current="page"
            >
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FF4D1A] rounded-r-xs"
                aria-hidden="true"
              />
              <House
                size={18}
                weight="bold"
                className="text-[#FF4D1A] shrink-0"
                aria-hidden="true"
              />
              <span>Dashboard</span>
            </Link>

            {/* Domains */}
            <Link
              href="/domains"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-[13.5px] transition-colors"
            >
              <Globe
                size={18}
                weight="regular"
                className="text-gray-500 shrink-0"
                aria-hidden="true"
              />
              <span>Domains</span>
            </Link>

            {/* API Key */}
            <Link
              href="/api-key"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-[13.5px] transition-colors"
            >
              <Key
                size={18}
                weight="regular"
                className="text-gray-500 shrink-0"
                aria-hidden="true"
              />
              <span>API Key</span>
            </Link>

            {/* Emails */}
            <Link
              href="/emails"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-[13.5px] transition-colors"
            >
              <EnvelopeSimple
                size={18}
                weight="regular"
                className="text-gray-500 shrink-0"
                aria-hidden="true"
              />
              <span>Emails</span>
            </Link>

            {/* Analytics */}
            <Link
              href="/analytics"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-[13.5px] transition-colors"
            >
              <ChartBar
                size={18}
                weight="regular"
                className="text-gray-500 shrink-0"
                aria-hidden="true"
              />
              <span>Analytics</span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Application Header */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] px-6 lg:px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar"
              type="button"
            >
              <List size={20} />
            </button>

            {/* App title with dark icon */}
            <div className="flex items-center gap-2.5">
              <div className="w-[26px] h-[26px] rounded-[6px] bg-[#0F172A] flex items-center justify-center shrink-0">
                <EnvelopeSimple
                  size={15}
                  weight="bold"
                  className="text-[#FF4D1A]"
                  aria-hidden="true"
                />
              </div>
              <span className="text-[14.5px] font-semibold text-[#111827]">
                EmitMail Production
              </span>
            </div>
          </div>

          {/* Right status & user avatar */}
          <div className="flex items-center gap-4">
            <div
              className="hidden sm:flex items-center gap-1.5 text-[12.5px] font-medium text-[#16A34A]"
              role="status"
              aria-live="polite"
            >
              <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
              <span>All Systems Operational</span>
            </div>

            <button
              type="button"
              className="w-8 h-8 rounded-full bg-[#FF4D1A] text-white text-[11.5px] font-bold flex items-center justify-center tracking-wide cursor-pointer hover:opacity-95 transition-opacity shadow-xs"
              aria-label="User profile: OP"
            >
              OP
            </button>
          </div>
        </header>

        {/* Scrollable page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8"
        >
          <div className="max-w-[1440px] mx-auto">
            {/* Page Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">
                  Performance
                </h1>
                <p className="text-[13.5px] text-[#6B7280] mt-0.5">
                  Overview of your email performance across all active channels
                  and automations.
                </p>
              </div>

              {/* Date controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md text-[12.5px] font-medium text-gray-700 shadow-xs hover:bg-gray-50 cursor-pointer transition-colors"
                  aria-label="Date range: Oct 1 – Oct 31, 2024"
                >
                  <CalendarBlank
                    size={14}
                    className="text-gray-400"
                    aria-hidden="true"
                  />
                  <span>Oct 1 – Oct 31, 2024</span>
                </button>
                <span className="px-2.5 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] rounded-md text-[11.5px] font-medium text-gray-500">
                  UTC-8
                </span>
              </div>
            </div>

            {/* Primary KPI Cards */}
            <section aria-label="Key performance indicators">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <KpiCard
                  label={KPI_DATA.emailsSent.label}
                  value={KPI_DATA.emailsSent.value}
                  trend={KPI_DATA.emailsSent.trend}
                  trendDir={KPI_DATA.emailsSent.trendDir}
                  arrowType={KPI_DATA.emailsSent.arrowType}
                  context={KPI_DATA.emailsSent.context}
                  description={KPI_DATA.emailsSent.description}
                  icon={<PaperPlaneTilt size={16} />}
                />
                <KpiCard
                  label={KPI_DATA.deliveryRate.label}
                  value={KPI_DATA.deliveryRate.value}
                  trend={KPI_DATA.deliveryRate.trend}
                  trendDir={KPI_DATA.deliveryRate.trendDir}
                  arrowType={KPI_DATA.deliveryRate.arrowType}
                  context={KPI_DATA.deliveryRate.context}
                  description={KPI_DATA.deliveryRate.description}
                  icon={<CheckCircle size={16} />}
                />
                <KpiCard
                  label={KPI_DATA.openRate.label}
                  value={KPI_DATA.openRate.value}
                  trend={KPI_DATA.openRate.trend}
                  trendDir={KPI_DATA.openRate.trendDir}
                  arrowType={KPI_DATA.openRate.arrowType}
                  context={KPI_DATA.openRate.context}
                  description={KPI_DATA.openRate.description}
                  icon={<EnvelopeSimple size={16} />}
                />
              </div>
            </section>

            {/* Email Performance Chart */}
            <section aria-label="Email performance chart">
              <EmailPerformanceChart />
            </section>

            {/* Secondary Metrics */}
            <section aria-label="Secondary metrics">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SECONDARY_DATA.map((d) => (
                  <SecondaryCard
                    key={d.id}
                    label={d.label}
                    value={d.value}
                    trend={d.trend}
                    trendDir={d.trendDir}
                    arrowType={d.arrowType}
                    sparkColor={d.sparkColor}
                    sparkValues={d.sparkValues}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
