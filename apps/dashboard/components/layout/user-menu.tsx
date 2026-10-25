"use client";

import { useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { SignOut, User } from "@phosphor-icons/react";
import type { UserProfile } from "@/lib/api/types";

interface UserMenuProps {
  user: UserProfile | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.fullName || user?.username || "Admin";
  const email = user?.email || "admin@localhost";

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[2px] p-2 text-left text-support text-[#262626] transition-colors hover:bg-white"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User options for ${displayName}`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[2px] bg-white text-[#595959]" aria-hidden="true">
            <User size={18} />
          </div>
          <div className="truncate">
            <p className="truncate font-medium">{displayName}</p>
            <p className="truncate text-meta text-[#595959]">{email}</p>
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-[2px] border border-[#f0f0f0] bg-white p-1 shadow-[0_4px_20px_-2px_rgba(38,38,38,0.08)]">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-[44px] w-full items-center gap-2 rounded-[2px] px-3 py-2 text-support font-medium text-[#991b1b] transition-colors hover:bg-[#fef2f2]"
              >
                <SignOut size={18} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
