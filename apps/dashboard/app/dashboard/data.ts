/**
 * EmitMail Dashboard Data
 * Realistic email performance metrics matching the design specification.
 */

export type MetricKey = "sent" | "delivered";
export type Granularity = "daily" | "weekly" | "hourly";

export interface DataPoint {
  timestamp: number;
  dateStr: string;
  current: number;
  previous: number;
  isPeak?: boolean;
}

// Generate realistic daily data for October 2024 matching the reference curve
function getDailyData(): DataPoint[] {
  const points: { day: number; current: number; previous: number; isPeak?: boolean }[] = [
    { day: 1, current: 480, previous: 380 },
    { day: 2, current: 510, previous: 400 },
    { day: 3, current: 560, previous: 420 },
    { day: 4, current: 620, previous: 450 },
    { day: 5, current: 680, previous: 470 },
    { day: 6, current: 710, previous: 485 },
    { day: 7, current: 730, previous: 495 },
    { day: 8, current: 740, previous: 505 },
    { day: 9, current: 730, previous: 515 },
    { day: 10, current: 720, previous: 525 },
    { day: 11, current: 740, previous: 540 },
    { day: 12, current: 780, previous: 570 },
    { day: 13, current: 820, previous: 610 },
    { day: 14, current: 840, previous: 650 },
    { day: 15, current: 850, previous: 690 },
    { day: 16, current: 840, previous: 710 },
    { day: 17, current: 850, previous: 730 },
    { day: 18, current: 880, previous: 750 },
    { day: 19, current: 930, previous: 790 },
    { day: 20, current: 980, previous: 840 },
    { day: 21, current: 1040, previous: 890 },
    { day: 22, current: 1090, previous: 940 },
    { day: 23, current: 1140, previous: 990 },
    { day: 24, current: 1180, previous: 1035, isPeak: true },
    { day: 25, current: 1210, previous: 1050 },
    { day: 26, current: 1220, previous: 1060 },
    { day: 27, current: 1200, previous: 1050 },
    { day: 28, current: 1180, previous: 1040 },
    { day: 29, current: 1160, previous: 1020 },
    { day: 30, current: 1120, previous: 980 },
    { day: 31, current: 1080, previous: 940 },
  ];

  return points.map((p) => {
    const d = new Date(Date.UTC(2024, 9, p.day));
    return {
      timestamp: d.getTime(),
      dateStr: `Oct ${p.day}`,
      current: p.current,
      previous: p.previous,
      isPeak: p.isPeak,
    };
  });
}

function getWeeklyData(): DataPoint[] {
  const weeks = [
    { label: "Aug 5", current: 4800, previous: 4100 },
    { label: "Aug 12", current: 5100, previous: 4300 },
    { label: "Aug 19", current: 5350, previous: 4500 },
    { label: "Aug 26", current: 5600, previous: 4700 },
    { label: "Sep 2", current: 5900, previous: 5050 },
    { label: "Sep 9", current: 6200, previous: 5300 },
    { label: "Sep 16", current: 6450, previous: 5500 },
    { label: "Sep 23", current: 6700, previous: 5750 },
    { label: "Sep 30", current: 7100, previous: 6100 },
    { label: "Oct 7", current: 7500, previous: 6400 },
    { label: "Oct 14", current: 7900, previous: 6800 },
    { label: "Oct 21", current: 8350, previous: 7150, isPeak: true },
    { label: "Oct 28", current: 8100, previous: 7000 },
  ];

  const baseTs = new Date(Date.UTC(2024, 7, 5)).getTime();
  const weekMs = 7 * 86_400_000;

  return weeks.map((w, i) => ({
    timestamp: baseTs + i * weekMs,
    dateStr: w.label,
    current: w.current,
    previous: w.previous,
    isPeak: w.isPeak,
  }));
}

function getHourlyData(): DataPoint[] {
  const hours = [
    { h: 0, current: 22, previous: 19 },
    { h: 2, current: 18, previous: 15 },
    { h: 4, current: 15, previous: 14 },
    { h: 6, current: 28, previous: 22 },
    { h: 8, current: 55, previous: 46 },
    { h: 10, current: 82, previous: 70 },
    { h: 12, current: 95, previous: 81 },
    { h: 14, current: 108, previous: 92, isPeak: true },
    { h: 16, current: 98, previous: 86 },
    { h: 18, current: 76, previous: 68 },
    { h: 20, current: 52, previous: 44 },
    { h: 22, current: 34, previous: 28 },
  ];

  const baseTs = new Date(Date.UTC(2024, 9, 24)).getTime();
  const hourMs = 3_600_000;

  return hours.map((item) => ({
    timestamp: baseTs + item.h * hourMs,
    dateStr: `${item.h}:00`,
    current: item.current,
    previous: item.previous,
    isPeak: item.isPeak,
  }));
}

const DAILY_DATA = getDailyData();
const WEEKLY_DATA = getWeeklyData();
const HOURLY_DATA = getHourlyData();

export function getChartPoints(metric: MetricKey, granularity: Granularity): DataPoint[] {
  const base =
    granularity === "daily"
      ? DAILY_DATA
      : granularity === "weekly"
        ? WEEKLY_DATA
        : HOURLY_DATA;

  if (metric === "delivered") {
    return base.map((p) => ({
      ...p,
      current: Math.round(p.current * 0.984),
      previous: Math.round(p.previous * 0.978),
    }));
  }

  return base;
}

/** KPI card metrics matching expected design */
export const KPI_DATA = {
  emailsSent: {
    label: "EMAILS SENT",
    value: "24,850",
    trend: "+12.4%",
    trendDir: "pos" as const,
    arrowType: "diagonal" as const,
    context: "vs previous period",
    description: "Compared with the previous period",
  },
  deliveryRate: {
    label: "DELIVERY RATE",
    value: "98.4%",
    trend: "+0.6%",
    trendDir: "pos" as const,
    arrowType: "up" as const,
    context: "vs target benchmark",
    description: "Successfully delivered emails",
  },
  openRate: {
    label: "OPEN RATE",
    value: "42.6%",
    trend: "+3.2%",
    trendDir: "pos" as const,
    arrowType: "diagonal" as const,
    context: "vs industry avg (34.1%)",
    description: "Unique opens as a percentage of delivered emails",
  },
} as const;

/** Secondary metric metrics matching expected design */
export const SECONDARY_DATA = [
  {
    id: "ctr",
    label: "CLICK-THROUGH RATE (CTR)",
    value: "8.7%",
    trend: "+1.1%",
    trendDir: "pos" as const,
    arrowType: "up" as const,
    sparkColor: "#16a34a",
    sparkValues: [4.8, 5.2, 5.7, 6.3, 6.8, 7.3, 7.9, 8.4, 8.7],
  },
  {
    id: "bounce",
    label: "HARD & SOFT BOUNCE RATE",
    value: "0.42%",
    trend: "-0.08%",
    trendDir: "neg" as const,
    arrowType: "down" as const,
    // Downward green sparkline matching reference
    sparkColor: "#16a34a",
    sparkValues: [0.60, 0.54, 0.52, 0.49, 0.47, 0.45, 0.44, 0.43, 0.42],
  },
  {
    id: "optout",
    label: "OPT-OUT & UNSUBSCRIBE RATE",
    value: "0.12%",
    trend: "±0.00%",
    trendDir: "neu" as const,
    arrowType: "none" as const,
    sparkColor: "#6B7280",
    sparkValues: [0.12, 0.122, 0.108, 0.135, 0.114, 0.13, 0.118, 0.122, 0.12],
  },
] as const;
