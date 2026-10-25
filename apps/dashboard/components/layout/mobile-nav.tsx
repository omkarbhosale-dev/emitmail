"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { Sidebar } from "./sidebar";
import type { UserProfile } from "@/lib/api/types";

interface MobileNavProps {
  user: UserProfile | null;
  version?: string;
}

export function MobileNav({ user, version }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-11 items-center justify-center text-[#262626] focus:outline-none"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
      >
        <List size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="fixed inset-0 z-50 flex"
        >
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-[260px] flex-col bg-white shadow-xl">
            <div className="flex h-12 items-center justify-between border-b border-[#f0f0f0] px-4">
              <span className="text-[14px] font-medium text-[#262626]">Menu</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-11 w-11 -mr-2 items-center justify-center text-[#595959]"
                aria-label="Close navigation menu"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
              <Sidebar user={user} version={version} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
