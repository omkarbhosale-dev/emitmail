"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function SidebarNavLink({ href, label, icon }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex min-h-[40px] md:min-h-[36px] items-center gap-3 px-3 text-[13px] font-normal transition-colors ${
        isActive
          ? "bg-white font-medium text-[#262626]"
          : "text-[#595959] hover:bg-white hover:text-[#262626]"
      }`}
    >
      {isActive && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ff5e1f]"
          aria-hidden="true"
        />
      )}
      <span className={isActive ? "text-[#ff5e1f]" : "text-[#595959] group-hover:text-[#262626]"}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
