"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { List, MagnifyingGlass, PaperPlaneTilt } from "@phosphor-icons/react";
import { SystemUpdateBanner } from "@/components/layout/SystemUpdateBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { SendTestEmailModal } from "@/components/modals/SendTestEmailModal";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { ToastProvider } from "@/components/ui/Toast";
import { VersionProvider, useSystemVersion } from "@/context/VersionContext";
import { AuthProvider } from "@/context/AuthContext";
import { getAuthToken, clearAuthToken, api } from "@/lib/api";

interface ModalContextType {
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openSendTestEmail: () => void;
  closeSendTestEmail: () => void;
}

const ModalContext = createContext<ModalContextType>({
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
  openSendTestEmail: () => {},
  closeSendTestEmail: () => {},
});

export const useModals = () => useContext(ModalContext);

function AppShellInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSendTestEmailOpen, setIsSendTestEmailOpen] = useState(false);
  const { isUpgradeModalOpen, setIsUpgradeModalOpen } = useSystemVersion();

  // Load and persist sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("emitmail-sidebar-collapsed");
      if (saved !== null) {
        queueMicrotask(() => {
          setIsSidebarCollapsed(saved === "true");
        });
      }
    } catch {}
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("emitmail-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleOpenMobile = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    const handleOpenSendModal = () => setIsSendTestEmailOpen(true);
    const handleOpenUpgradeModal = () => setIsUpgradeModalOpen(true);
    const handleOpenOnboarding = () => router.push("/onboarding");

    window.addEventListener("open-command-palette", handleOpenPalette);
    window.addEventListener("open-send-email-modal", handleOpenSendModal);
    window.addEventListener("open-upgrade-modal", handleOpenUpgradeModal);
    window.addEventListener("open-onboarding-modal", handleOpenOnboarding);

    return () => {
      window.removeEventListener("open-command-palette", handleOpenPalette);
      window.removeEventListener("open-send-email-modal", handleOpenSendModal);
      window.removeEventListener("open-upgrade-modal", handleOpenUpgradeModal);
      window.removeEventListener("open-onboarding-modal", handleOpenOnboarding);
    };
  }, [setIsUpgradeModalOpen, router]);

  // Check auth state on client and verify token against backend
  useEffect(() => {
    if (pathname === "/login") return;

    const token = getAuthToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }

    // Actively verify token validity against backend API
    api.auth.getMe().then((user) => {
      if (user.mustChangePassword && !pathname.startsWith("/settings")) {
        router.replace("/settings");
        return;
      }

      // Check whether domain and server config are set up
      Promise.all([
        api.serverConfig.get().catch(() => null),
        api.domains.list().catch(() => []),
      ]).then(([configRes, domainsList]) => {
        const isConfigured = Boolean(
          configRes?.serverConfig?.isConfigured ??
          configRes?.config?.isConfigured
        );
        const hasDomains = Array.isArray(domainsList) && domainsList.length > 0;
        // User has completed setup if they already have registered domains or if serverConfig is configured
        const isSetupComplete = hasDomains || isConfigured;

        if (!isSetupComplete) {
          // If setup is not complete, redirect to /onboarding for all routes except /settings and /login
          if (pathname !== "/onboarding" && !pathname.startsWith("/settings") && pathname !== "/login") {
            router.replace("/onboarding");
          }
        } else if (pathname === "/onboarding") {
          // If setup is complete and user visits /onboarding, redirect to overview
          router.replace("/");
        }
      }).catch(() => {});
    }).catch((err: unknown) => {
      console.warn("Active session invalid or expired:", err);
      clearAuthToken();
      window.location.replace("/login");
    });
  }, [pathname, router]);

  // If on login or onboarding route, render standalone view without AppShell headers/sidebars
  if (pathname === "/login" || pathname === "/onboarding") {
    return <>{children}</>;
  }

  return (
    <ModalContext.Provider
      value={{
        openCommandPalette: () => setIsCommandPaletteOpen(true),
        closeCommandPalette: () => setIsCommandPaletteOpen(false),
        openSendTestEmail: () => setIsSendTestEmailOpen(true),
        closeSendTestEmail: () => setIsSendTestEmailOpen(false),
      }}
    >
      <div className="isolate h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200 flex flex-col selection:bg-[#FF6600]/20 selection:text-[#FF6600]">
        {/* Mobile Header Bar (Visible on mobile/tablet screens only; global desktop header removed) */}
        <header className="lg:hidden h-14 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 select-none z-40 sticky top-0">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group cursor-pointer">
              <span className="font-logo font-extrabold text-2xl tracking-tight text-[#FF6600] lowercase select-none">
                emitmail
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              aria-label="Quick search"
              title="Quick search (Ctrl + K)"
            >
              <MagnifyingGlass size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleOpenMobile}
              className="p-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <List size={20} weight="bold" />
            </button>
          </div>
        </header>

        {/* Global System Update Notification Banner */}
        <SystemUpdateBanner />

        {/* Global App Layout: Fixed Full-Height Sidebar + Independent Scroll Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <Suspense fallback={<div className="hidden lg:block w-64 shrink-0 h-full bg-zinc-950 border-r border-zinc-800/80" />}>
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleSidebar}
              isMobileOpen={isMobileMenuOpen}
              onCloseMobile={handleCloseMobile}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />
          </Suspense>

          {/* Main View Area - Dedicated scrollable container for each page */}
          <main className="flex-1 min-w-0 h-full overflow-y-auto bg-zinc-950">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>

        {/* Global Floating Modals */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onTriggerSendTestEmail={() => setIsSendTestEmailOpen(true)}
        />

        <SendTestEmailModal
          isOpen={isSendTestEmailOpen}
          onClose={() => setIsSendTestEmailOpen(false)}
        />

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
      </div>
    </ModalContext.Provider>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ToastProvider>
      <VersionProvider>
        <AuthProvider>
          <AppShellInner>{children}</AppShellInner>
        </AuthProvider>
      </VersionProvider>
    </ToastProvider>
  );
}
