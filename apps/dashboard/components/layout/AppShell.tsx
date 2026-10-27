"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { SendTestEmailModal } from "@/components/modals/SendTestEmailModal";
import { ToastProvider } from "@/components/ui/Toast";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSendTestEmailOpen, setIsSendTestEmailOpen] = useState(false);

  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    const handleOpenSendModal = () => setIsSendTestEmailOpen(true);

    window.addEventListener("open-command-palette", handleOpenPalette);
    window.addEventListener("open-send-email-modal", handleOpenSendModal);

    return () => {
      window.removeEventListener("open-command-palette", handleOpenPalette);
      window.removeEventListener("open-send-email-modal", handleOpenSendModal);
    };
  }, []);

  return (
    <ToastProvider>
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
        </div>
      </ModalContext.Provider>
    </ToastProvider>
  );
}
