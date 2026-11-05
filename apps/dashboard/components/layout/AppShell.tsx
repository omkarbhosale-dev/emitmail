"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
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

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSendTestEmailOpen, setIsSendTestEmailOpen] = useState(false);
  const { isUpgradeModalOpen, setIsUpgradeModalOpen } = useSystemVersion();

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
        const isConfigured = Boolean(configRes?.config?.isConfigured);
        const hasDomains = Array.isArray(domainsList) && domainsList.length > 0;
        const isSetupComplete = isConfigured && hasDomains;

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
      <div className="isolate h-screen w-screen overflow-hidden bg-kumo-canvas text-kumo-default flex flex-col selection:bg-cf-orange/20 selection:text-cf-orange">
        {/* Top Global Header Bar */}
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Global System Update Notification Banner */}
        <SystemUpdateBanner />

        {/* Global App Layout: Fixed Full-Height Sidebar + Independent Scroll Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <Suspense fallback={<div className="hidden lg:block w-60 shrink-0 h-full bg-kumo-canvas border-r border-kumo-hairline" />}>
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              isMobileOpen={isMobileMenuOpen}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />
          </Suspense>

          {/* Main View Area - Dedicated scrollable container for each page */}
          <main className="flex-1 min-w-0 h-full overflow-y-auto bg-kumo-canvas">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
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

export function AppShell({ children }: { children: React.ReactNode }) {
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
