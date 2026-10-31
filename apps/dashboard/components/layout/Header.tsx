"use client";

import { useSystemVersion } from "@/context/VersionContext";

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
import { DashboardUser } from "@/types";
import { Facehash } from "facehash";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenCommandPalette,
}: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
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

    // Fetch active session user info
    api.auth
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {});

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setThemeMode(customEvent.detail);
      }
    };
    window.addEventListener("theme-changed", handleThemeChange);
    return () => window.removeEventListener("theme-changed", handleThemeChange);
  }, []);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    document.documentElement.setAttribute("data-mode", nextMode);
    try {
      localStorage.setItem("emitmail-theme-mode", nextMode);
      window.dispatchEvent(
        new CustomEvent("theme-changed", { detail: nextMode })
      );
    } catch {}
  };

  return (
    <header className="h-12 shrink-0 z-30 bg-kumo-canvas border-b border-kumo-hairline px-4 sm:px-6 flex items-center justify-between select-none">
      {/* Left Cluster: Mobile Hamburger + Clean Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong transition-colors"
          aria-label="Open navigation menu"
        >
          <List size={20} weight="bold" />
        </button>

        {/* Clean Typography Brand Logo */}
        <Link href="/" className="flex items-center cursor-pointer select-none">
          <span className="font-logo font-extrabold tracking-tight text-xl sm:text-2xl text-cf-orange leading-none">
            emitmail
          </span>
        </Link>
      </div>

      {/* Right Cluster: Quick Search Mobile + Docs/AI + Theme Toggle + Avatar */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Mobile Search Icon Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="sm:hidden p-1.5 rounded-md text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong transition-colors"
          aria-label="Search"
        >
          <MagnifyingGlass size={18} />
        </button>

        {/* Ask AI / Docs Link */}
        <a
          href={process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001"}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-kumo-default hover:text-kumo-strong px-2.5 py-1.5 rounded-md hover:bg-kumo-tint transition-colors"
        >
          <Sparkle size={14} className="text-cf-orange" weight="fill" />
          <span>Docs & AI</span>
        </a>

        {/* Update Available Pill */}
        {isUpdateAvailable && versionData && (
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cf-orange/15 border border-cf-orange/40 text-cf-orange text-xs font-medium cursor-pointer hover:bg-cf-orange hover:text-white transition-colors"
            title={`EmitMail v${versionData.latestVersion} is available`}
          >
            <Sparkle size={13} weight="fill" />
            <span>New: v{versionData.latestVersion}</span>
          </button>
        )}

        {/* Theme Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong border border-transparent hover:border-kumo-line transition-colors"
          aria-label={
            themeMode === "dark"
              ? "Switch to Light Mode"
              : "Switch to Dark Mode"
          }
          title={
            themeMode === "dark"
              ? "Switch to Light Mode"
              : "Switch to Dark Mode"
          }
        >
          {mounted && themeMode === "dark" ? (
            <Sun size={18} weight="bold" className="text-kumo-subtle hover:text-cf-orange" />
          ) : (
            <Moon size={18} weight="bold" className="text-kumo-subtle hover:text-cf-orange" />
          )}
        </button>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-7 h-7 rounded-full bg-kumo-elevated border border-kumo-line flex items-center justify-center text-kumo-strong hover:border-cf-orange transition-colors cursor-pointer overflow-hidden p-0"
            aria-label="User Account"
            title="Administrator Account"
          >
            <Facehash
              name={currentUser?.username || "admin"}
              size={28}
              interactive={false}
              showInitial={false}
            />
          </button>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-cf-success ring-1 ring-kumo-canvas pointer-events-none" />

          {/* User Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-kumo-base border border-kumo-hairline shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
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
                          : "bg-kumo-elevated text-kumo-muted border border-kumo-hairline"
                      }`}
                    >
                      {currentUser?.role || "ADMIN"}
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-kumo-default hover:text-kumo-strong hover:bg-kumo-elevated transition-colors"
                >
                  <Gear size={14} />
                  <span>Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-kumo-hairline/60">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    api.auth.logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-kumo-danger hover:bg-kumo-danger-tint transition-colors text-left cursor-pointer"
                >
                  <SignOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
