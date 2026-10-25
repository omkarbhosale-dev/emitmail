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
      className={`group relative flex min-h-[44px] items-center gap-3 px-5 text-nav transition-colors ${
        isActive
          ? "bg-white font-semibold text-[#262626]"
          : "font-medium text-[#595959] hover:bg-white hover:text-[#262626]"
      }`}
    >
      {isActive && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff5e1f]"
          aria-hidden="true"
        />
      )}
      <span
        aria-hidden="true"
        className={isActive ? "text-[#ff5e1f]" : "text-[#595959] group-hover:text-[#262626]"}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
