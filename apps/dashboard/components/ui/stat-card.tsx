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
    <div className="flex flex-col justify-between rounded-[4px] border border-[#e5e5e5] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label uppercase text-[#595959]">{label}</span>
        {icon && (
          <div className="text-[#595959]" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-metric text-[#262626]">{value}</span>
        {badge}
      </div>

      {secondaryText && (
        <p className="mt-2 text-support text-[#595959]">{secondaryText}</p>
      )}
    </div>
  );
}
