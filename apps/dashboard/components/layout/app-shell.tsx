import React from "react";
import { Sidebar } from "./sidebar";
import { AppHeader } from "./app-header";
import type { UserProfile, SystemHealth } from "@/lib/api/types";

interface AppShellProps {
  user: UserProfile | null;
  health: SystemHealth | null;
  version?: string;
  children: React.ReactNode;
}

export function AppShell({ user, health, version, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Skip to Content for Keyboard & Screen Readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[2px] focus:bg-[#ff5e1f] focus:px-3 focus:py-2 focus:text-meta focus:font-medium focus:text-[#262626] focus:shadow-md focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block">
        <Sidebar user={user} version={version} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader user={user} health={health} version={version} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8"
        >
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
