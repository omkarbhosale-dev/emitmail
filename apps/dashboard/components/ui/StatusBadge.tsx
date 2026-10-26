import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  pulseDot?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function StatusBadge({
  variant = "success",
  children,
  pulseDot = false,
  className,
  icon,
}: StatusBadgeProps) {
  const variantStyles = {
    success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    warning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    danger:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
    info:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    neutral:
      "bg-kumo-recessed text-kumo-subtle border-kumo-hairline",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-500",
    neutral: "bg-kumo-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border select-none transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {icon ? (
        icon
      ) : (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            dotColors[variant],
            pulseDot && "animate-pulse"
          )}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
