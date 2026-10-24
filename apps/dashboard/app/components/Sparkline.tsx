"use client";

import { useMemo } from "react";

interface SparklineProps {
  values: readonly number[];
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({
  values,
  color = "#16a34a",
  width = 110,
  height = 36,
}: SparklineProps) {
  const path = useMemo(() => {
    if (values.length < 2) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padX = 2;
    const padY = 4;
    const w = width - padX * 2;
    const h = height - padY * 2;
    const step = w / (values.length - 1);

    const pts = values.map((v, i) => {
      const x = padX + i * step;
      const y = padY + h - ((v - min) / range) * h;
      return { x, y };
    });

    // Create a smooth spline using cubic Bezier control points
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    return d;
  }, [values, width, height]);

  if (!path) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
