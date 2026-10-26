"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { SendTestEmailModal } from "@/components/modals/SendTestEmailModal";
import { ToastProvider } from "@/components/ui/Toast";
import { HomeView } from "@/components/views/HomeView";
import { DomainsView } from "@/components/views/DomainsView";
import { EmailsView } from "@/components/views/EmailsView";
import { ApiKeysView } from "@/components/views/ApiKeysView";
import { WebhooksView } from "@/components/views/WebhooksView";
import { SettingsView } from "@/components/views/SettingsView";
import { NavTab } from "@/types";

export default function DashboardApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSendTestEmailOpen, setIsSendTestEmailOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="isolate h-screen w-screen overflow-hidden bg-kumo-canvas text-kumo-default flex flex-col selection:bg-cf-orange/20 selection:text-cf-orange">
        {/* Top Global Header Bar */}
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Global App Layout: Fixed Full-Height Sidebar + Independent Scroll Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar (Fixed to screen height, bottom settings always visible) */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(tab) => setCurrentTab(tab)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />

          {/* Main View Area - Only this container scrolls */}
          <main className="flex-1 min-w-0 h-full overflow-y-auto bg-kumo-canvas">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
              {currentTab === "home" && (
                <HomeView
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                  onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                  onTriggerSendTestEmail={() => setIsSendTestEmailOpen(true)}
                />
              )}

              {currentTab === "domains" && <DomainsView />}

              {currentTab === "emails" && (
                <EmailsView
                  onTriggerSendEmail={() => setIsSendTestEmailOpen(true)}
                />
              )}

              {currentTab === "api-keys" && <ApiKeysView />}

              {currentTab === "webhooks" && <WebhooksView />}

              {currentTab === "settings" && <SettingsView />}
            </div>
          </main>
        </div>

        {/* Global Floating Modals */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onTriggerSendTestEmail={() => setIsSendTestEmailOpen(true)}
        />

        <SendTestEmailModal
          isOpen={isSendTestEmailOpen}
          onClose={() => setIsSendTestEmailOpen(false)}
        />
      </div>
    </ToastProvider>
  );
}
