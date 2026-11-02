"use client";

import { useSystemVersion } from "@/context/VersionContext";
import { useAuth } from "@/context/AuthContext";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  List,
  Sun,
  Moon,
  MagnifyingGlass,
  Sparkle,
  User,
  SignOut,
  Gear,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { Facehash } from "facehash";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenCommandPalette,
}: HeaderProps) {
  const { currentUser } = useAuth();
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { versionData, isUpdateAvailable, setIsUpgradeModalOpen } = useSystemVersion();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const currentMode =
      (document.documentElement.getAttribute("data-mode") as
        | "dark"
        | "light") || "dark";
    setThemeMode(currentMode);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setThemeMode(customEvent.detail);
      }
    };
    window.addEventListener("theme-changed", handleThemeChange);
    return () => window.removeEventListener("theme-changed", handleThemeChange);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    document.documentElement.setAttribute("data-mode", nextMode);
    localStorage.setItem("emitmail-theme-mode", nextMode);
    window.dispatchEvent(
      new CustomEvent("theme-changed", { detail: nextMode })
    );
  };

  return (
    <header className="h-12 w-full border-b border-kumo-hairline bg-kumo-base/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Mobile hamburger + Brand logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-md hover:bg-kumo-elevated text-kumo-muted hover:text-kumo-strong cursor-pointer"
          aria-label="Open navigation menu"
        >
          <List size={18} weight="bold" />
        </button>

        {/* Global EmitMail Logo Brand */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <span className="font-logo font-extrabold tracking-tight text-xl sm:text-2xl text-cf-orange leading-none">
            emitmail
          </span>
        </Link>
      </div>

      {/* Center: Command Search input */}
      <div className="flex-1 max-w-sm mx-3 hidden md:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-2.5 py-1 text-xs bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg text-kumo-muted transition-colors cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-1.5">
            <MagnifyingGlass
              size={13}
              weight="bold"
              className="text-kumo-muted group-hover:text-cf-orange transition-colors"
            />
            <span className="truncate">Search domains, mailboxes, keys...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-kumo-muted bg-kumo-recessed border border-kumo-hairline rounded">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Toolbar Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Top Header Release Badge: Displayed when an update is available */}
        {isUpdateAvailable && versionData && (
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cf-orange-tint border border-cf-orange-border text-cf-orange hover:bg-cf-orange hover:text-white transition-all cursor-pointer shadow-2xs"
            title={`EmitMail v${versionData.latestVersion} is available`}
          >
            <Sparkle size={13} weight="fill" className="animate-pulse" />
            <span className="font-mono text-[11px] font-bold">Update v{versionData.latestVersion}</span>
          </button>
        )}

        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-kumo-elevated text-kumo-muted hover:text-kumo-strong transition-colors cursor-pointer"
          aria-label="Toggle theme mode"
          title={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} mode`}
        >
          {mounted ? (
            themeMode === "dark" ? (
              <Sun size={15} weight="bold" />
            ) : (
              <Moon size={15} weight="bold" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        {/* Profile Avatar & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-kumo-elevated border border-transparent hover:border-kumo-hairline transition-all cursor-pointer focus:outline-none"
            aria-label="User account menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-6 h-6 rounded-md overflow-hidden border border-kumo-hairline shrink-0 shadow-2xs">
              <Facehash
                name={currentUser?.username || "admin"}
                size={24}
                interactive={false}
              />
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2.5 border-b border-kumo-hairline/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-kumo-hairline shrink-0 shadow-2xs">
                  <Facehash
                    name={currentUser?.username || "admin"}
                    size={32}
                    interactive
                    enableBlink
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-kumo-strong truncate max-w-[95px]">
                      {currentUser?.fullName || currentUser?.username || "admin"}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded tracking-wide uppercase ${
                        currentUser?.role === "ADMIN"
                          ? "bg-cf-orange/10 text-cf-orange border border-cf-orange/20"
                          : currentUser?.role === "MEMBER"
                          ? "bg-cf-chart-blue/10 text-cf-chart-blue border border-cf-chart-blue/20"
                          : "bg-kumo-elevated text-kumo-subtle border border-kumo-hairline"
                      }`}
                    >
                      {currentUser?.role === "VIEWER" ? "VIEW ONLY" : (currentUser?.role || "ADMIN")}
                    </span>
                  </div>
                  <div className="text-[10px] text-kumo-muted font-mono truncate mt-0.5">
                    {currentUser?.email || `@${currentUser?.username || "admin"}`}
                  </div>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong transition-colors cursor-pointer"
                >
                  <Gear size={14} />
                  <span>Workspace Settings</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong transition-colors cursor-pointer"
                >
                  <User size={14} />
                  <span>Profile & Security</span>
                </Link>
              </div>

              <div className="border-t border-kumo-hairline/60 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    api.auth.logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                >
                  <SignOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
