import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  secondaryText?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, secondaryText, badge, icon }: StatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-[4px] border border-[#f0f0f0] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-normal uppercase tracking-wider text-[#595959]">
          {label}
        </span>
        {icon && <div className="text-[#595959]">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[28px] font-medium leading-none tracking-[-0.8px] text-[#262626]">
          {value}
        </span>
        {badge}
      </div>

      {secondaryText && (
        <p className="mt-2 text-[12px] leading-tight text-[#595959]">
          {secondaryText}
        </p>
      )}
    </div>
  );
}
