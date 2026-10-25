import React from "react";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  ...props
}: PanelProps) {
  return (
    <div
      className={`rounded-[4px] border border-[#f0f0f0] bg-white p-4 ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#f0f0f0] pb-3">
          <div>
            {title && (
              <h2 className="text-[19px] font-normal leading-[1.2] tracking-[-0.48px] text-[#262626]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[12px] leading-normal text-[#595959]">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
