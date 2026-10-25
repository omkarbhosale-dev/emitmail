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
      className={`rounded-[4px] border border-[#e5e5e5] bg-white p-5 ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-[#e5e5e5] pb-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-section text-[#262626]">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-support text-[#595959]">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
