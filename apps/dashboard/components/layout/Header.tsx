"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  List,
  Sun,
  Moon,
  MagnifyingGlass,
  Sparkle,
  User,
} from "@phosphor-icons/react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenCommandPalette,
}: HeaderProps) {
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

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
          href="https://github.com/omkarbhosale-dev/emitmail"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-kumo-default hover:text-kumo-strong px-2.5 py-1.5 rounded-md hover:bg-kumo-tint transition-colors"
        >
          <Sparkle size={14} className="text-cf-orange" weight="fill" />
          <span>Docs & AI</span>
        </a>

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

        {/* User Profile Avatar */}
        <div className="relative ml-1">
          <button
            className="w-7 h-7 rounded-full bg-kumo-elevated border border-kumo-line flex items-center justify-center text-kumo-strong hover:border-cf-orange transition-colors"
            aria-label="User Account"
            title="omkarbhosale (Admin)"
          >
            <User size={15} weight="bold" />
          </button>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-cf-success ring-1 ring-kumo-canvas" />
        </div>
      </div>
    </header>
  );
}
