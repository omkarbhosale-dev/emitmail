"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import * as echarts from "echarts";

import {
  getChartPoints,
  type MetricKey,
  type Granularity,
  type DataPoint,
} from "../dashboard/data";

type MetricOption = { key: MetricKey; label: string };
type GranularityOption = { key: Granularity; label: string };

const METRICS: MetricOption[] = [
  { key: "sent", label: "Emails Sent" },
  { key: "delivered", label: "Emails Delivered" },
];

const GRANULARITIES: GranularityOption[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "hourly", label: "Hourly" },
];

const CURRENT_TOTAL = "24,850";
const PREVIOUS_TOTAL = "22,108";

export default function EmailPerformanceChart() {
  const [metric, setMetric] = useState<MetricKey>("sent");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const points = useMemo(
    () => getChartPoints(metric, granularity),
    [metric, granularity]
  );

  const metricLabel = metric === "sent" ? "Emails Sent" : "Emails Delivered";

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, {
        renderer: "canvas",
      });
    }
    const chart = chartInstance.current;

    const xLabels = points.map((p) => p.dateStr);
    const currentValues = points.map((p) => p.current);
    const previousValues = points.map((p) => p.previous);

    const maxY = Math.max(...currentValues, ...previousValues);
    const yAxisMax = granularity === "daily" ? 1500 : Math.ceil((maxY * 1.2) / 100) * 100;
    const yAxisInterval = granularity === "daily" ? 300 : undefined;

    const option: echarts.EChartsOption = {
      animationDuration: 300,
      grid: {
        top: 24,
        right: 16,
        bottom: 28,
        left: 48,
        containLabel: false,
      },
      tooltip: {
        show: true,
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: {
            color: "#FF4D1A",
            type: "dashed",
            width: 1.5,
          },
        },
        backgroundColor: "transparent",
        borderWidth: 0,
        padding: 0,
        shadowColor: "transparent",
        extraCssText: "box-shadow: none; pointer-events: none;",
        formatter: (params: unknown) => {
          const list = params as Array<{
            dataIndex: number;
            seriesName: string;
            value: number;
          }>;
          if (!list || list.length === 0) return "";
          const idx = list[0].dataIndex;
          const pt: DataPoint = points[idx];
          if (!pt) return "";

          const curr = pt.current;
          const prev = pt.previous;
          const diff = curr - prev;
          const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : "0.0";
          const deltaSign = Number(pct) >= 0 ? "+" : "";

          const dateDisplay =
            granularity === "daily"
              ? `Oct ${idx + 1}, 2024`
              : pt.dateStr;

          const isPeak = pt.isPeak || curr === Math.max(...currentValues);

          return `
            <div style="
              background: #ffffff;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
              padding: 10px 14px;
              font-family: inherit;
              min-width: 175px;
            ">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px;">
                <span style="font-size: 11px; font-weight: 500; color: #6B7280;">${dateDisplay}</span>
                ${
                  isPeak
                    ? `<span style="background: #DCFCE7; color: #16A34A; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; letter-spacing: 0.5px;">PEAK</span>`
                    : ""
                }
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; gap: 12px; font-size: 12px;">
                <span style="display: flex; align-items: center; gap: 6px; color: #111827; font-weight: 600;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #FF4D1A; flex-shrink: 0;"></span>
                  ${metricLabel}:
                </span>
                <span style="font-weight: 700; color: #111827;">${curr.toLocaleString()}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; gap: 12px; font-size: 12px;">
                <span style="display: flex; align-items: center; gap: 6px; color: #6B7280;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #9CA3AF; flex-shrink: 0;"></span>
                  Previous Period:
                </span>
                <span style="font-weight: 600; color: #4B5563;">${prev.toLocaleString()}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px; border-top: 1px solid #F3F4F6; font-size: 11px;">
                <span style="color: #6B7280; font-weight: 500;">Delta:</span>
                <span style="font-weight: 700; color: #16A34A;">${deltaSign}${pct}%</span>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: xLabels,
        boundaryGap: false,
        axisLine: {
          show: true,
          lineStyle: { color: "#E5E7EB", width: 1 },
        },
        axisTick: {
          show: true,
          lineStyle: { color: "#D1D5DB" },
          alignWithLabel: true,
          interval: (index: number) => {
            if (granularity === "daily") {
              const day = index + 1;
              return day === 1 || day === 5 || day === 10 || day === 15 || day === 20 || day === 24 || day === 25 || day === 30;
            }
            return true;
          },
        },
        axisLabel: {
          color: (value?: string | number) => {
            return String(value) === "Oct 24" ? "#FF4D1A" : "#9CA3AF";
          },
          fontSize: 11,
          margin: 10,
          interval: (index: number) => {
            if (granularity === "daily") {
              const day = index + 1;
              return day === 1 || day === 5 || day === 10 || day === 15 || day === 20 || day === 24 || day === 25 || day === 30;
            }
            return true;
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: yAxisMax,
        interval: yAxisInterval,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#9CA3AF",
          fontSize: 11,
          formatter: (value: number) => (value === 0 ? "0" : value.toLocaleString()),
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: "#F3F4F6",
            dashOffset: 3,
          },
        },
      },
      series: [
        {
          name: "Previous Period",
          type: "line",
          data: previousValues,
          smooth: 0.35,
          showSymbol: false,
          lineStyle: {
            color: "#A1A1AA",
            width: 1.5,
            type: [4, 4],
          },
          itemStyle: {
            color: "#A1A1AA",
          },
          areaStyle: {
            opacity: 0,
          },
          z: 1,
        },
        {
          name: "Current Period",
          type: "line",
          data: currentValues,
          smooth: 0.35,
          showSymbol: false,
          emphasis: {
            scale: 1.3,
            itemStyle: {
              color: "#FF4D1A",
              borderColor: "#FFFFFF",
              borderWidth: 2,
            },
          },
          lineStyle: {
            color: "#FF4D1A",
            width: 2.2,
          },
          itemStyle: {
            color: "#FF4D1A",
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(255, 77, 26, 0.16)" },
              { offset: 0.75, color: "rgba(255, 77, 26, 0.03)" },
              { offset: 1, color: "rgba(255, 77, 26, 0.0)" },
            ]),
          },
          z: 2,
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [points, granularity, metricLabel]);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs mb-5">
      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827] leading-tight">
            Email Performance
          </h2>
          <p className="text-[12.5px] text-[#6B7280] mt-0.5">
            Track email activity over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric selector */}
          <div
            className="flex p-0.5 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]/70"
            role="group"
            aria-label="Select metric"
          >
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`px-3 py-1 text-[11.5px] font-medium rounded transition-all cursor-pointer ${
                  metric === m.key
                    ? "bg-white text-[#FF4D1A] font-semibold shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setMetric(m.key)}
                aria-pressed={metric === m.key}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Granularity selector */}
          <div
            className="flex p-0.5 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]/70"
            role="group"
            aria-label="Select time granularity"
          >
            {GRANULARITIES.map((g) => (
              <button
                key={g.key}
                className={`px-3 py-1 text-[11.5px] font-medium rounded transition-all cursor-pointer ${
                  granularity === g.key
                    ? "bg-white text-[#FF4D1A] font-semibold shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setGranularity(g.key)}
                aria-pressed={granularity === g.key}
                type="button"
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div
            className="flex items-center gap-4 text-[12px] text-gray-600 pl-1"
            aria-label="Chart legend"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-[2px] bg-[#FF4D1A] rounded-full inline-block" />
              <span className="font-normal text-gray-700">
                Current ({CURRENT_TOTAL})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0 border-t-2 border-dashed border-[#A1A1AA] inline-block" />
              <span className="font-normal text-gray-500">
                Previous ({PREVIOUS_TOTAL})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div
        ref={chartRef}
        className="w-full h-[270px]"
        role="img"
        aria-label={`${metricLabel} over time shown as a ${granularity} chart with current and previous period lines.`}
      />
    </div>
  );
}
