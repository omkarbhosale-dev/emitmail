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
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    warning:
      "bg-amber-500/10 text-amber-400 border-amber-500/25",
    danger:
      "bg-rose-500/10 text-rose-400 border-rose-500/25",
    info:
      "bg-blue-500/10 text-blue-400 border-blue-500/25",
    neutral:
      "bg-zinc-800/60 text-zinc-300 border-zinc-700/60",
  };

  const dotColors = {
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    info: "bg-blue-400",
    neutral: "bg-zinc-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs md:text-[13px] font-medium border select-none transition-colors",
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
