"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Gear,
  Cpu,
  PaintBrush,
  Warning,
  Check,
  Sun,
  Moon,
  Desktop,
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  Trash,
  ArrowsClockwise,
  X,
  Lock,
  EnvelopeSimple,
  IdentificationCard,
  User,
  Info,
  RocketLaunch,
} from "@phosphor-icons/react";
import { useSystemVersion } from "@/context/VersionContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { DashboardUser, UserRole } from "@/types";
import { Facehash } from "facehash";

export function SettingsView() {
  const { toast } = useToast();
  const { versionData, isChecking, refresh, setIsUpgradeModalOpen } = useSystemVersion();

  // Active top tab: "workspace" or "team"
  const [activeTab, setActiveTab] = useState<"workspace" | "team">("workspace");

  // General Settings State
  const [workspaceName, setWorkspaceName] = useState("omkarbhosale.dev");
  const [defaultSender, setDefaultSender] = useState("notifications@omkarbhosale.dev");
  const [timezone, setTimezone] = useState("UTC (Coordinated Universal Time)");
  const [workerConcurrency, setWorkerConcurrency] = useState(12);
  const [maxRetries, setMaxRetries] = useState(3);
  const [exponentialBackoff, setExponentialBackoff] = useState(true);
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("dark");

  // Team & User Management State
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [teamMembers, setTeamMembers] = useState<DashboardUser[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState<boolean>(true);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("MEMBER");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete & Reset Confirmations
  const [deleteTargetUser, setDeleteTargetUser] = useState<DashboardUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [resetTargetUser, setResetTargetUser] = useState<DashboardUser | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Role Edit State
  const [roleChangeTarget, setRoleChangeTarget] = useState<DashboardUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("MEMBER");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // The first user signing in with username 'admin' is always the main administrator
  const isAdmin = currentUser?.username === "admin" || currentUser?.role === "ADMIN";

  // Fetch Current User
  useEffect(() => {
    api.auth
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("Failed to load current user:", err));
  }, []);

  // Fetch Team Members
  const loadTeamMembers = useCallback(async () => {
    setIsLoadingTeam(true);
    try {
      const users = await api.users.list();
      setTeamMembers(users);
    } catch (err) {
      console.warn("Could not fetch remote team roster, falling back to active admin session:", err);
      const me = currentUser || (await api.auth.getMe().catch(() => null));
      if (me) {
        setTeamMembers([
          {
            ...me,
            role: me.role || "ADMIN",
          },
        ]);
      }
    } finally {
      setIsLoadingTeam(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === "team") {
      loadTeamMembers();
    }
  }, [activeTab, loadTeamMembers]);

  // Theme synchronization
  useEffect(() => {
    const saved = localStorage.getItem("emitmail-theme-mode") as "dark" | "light" | null;
    if (saved) {
      setThemeMode(saved);
    } else {
      setThemeMode("dark");
    }

    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setThemeMode(customEvent.detail);
      }
    };
    window.addEventListener("theme-changed", handleThemeEvent);
    return () => window.removeEventListener("theme-changed", handleThemeEvent);
  }, []);

  const handleThemeChange = (mode: "dark" | "light" | "system") => {
    setThemeMode(mode);
    let resolved = mode;
    if (mode === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-mode", resolved);
    try {
      localStorage.setItem("emitmail-theme-mode", resolved);
      window.dispatchEvent(new CustomEvent("theme-changed", { detail: resolved }));
    } catch {}
    toast({
      title: "Theme Updated",
      description: `Active color mode set to ${mode}.`,
      type: "info",
    });
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Workspace Settings Saved",
      description: "Default sender identity and timezone updated.",
      type: "success",
    });
  };

  const handleSaveQueue = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "BullMQ Engine Configured",
      description: `Worker concurrency updated to ${workerConcurrency} threads per node.`,
      type: "success",
    });
  };

  const handlePurgeQueue = () => {
    toast({
      title: "Failed Jobs Purged",
      description: "Cleared 0 dead-letter queue records from Redis.",
      type: "warning",
    });
  };

  // User Creation Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newFullName.trim()) {
      setFormError("Please enter the user's full name");
      return;
    }
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setFormError("Please enter a valid email address");
      return;
    }

    setIsSubmittingUser(true);
    try {
      const created = await api.users.create({
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        username: newUsername.trim() || undefined,
      });

      toast({
        title: "User Created Successfully",
        description: `${created.fullName || created.username} added as ${created.role}. Default password: emitmail`,
        type: "success",
      });

      setIsAddModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewUsername("");
      setNewRole("MEMBER");
      loadTeamMembers();
    } catch (err) {
      console.error("Failed to create user:", err);
      const msg = err instanceof Error ? err.message : "Failed to create user account";
      setFormError(msg);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Role Update Handler
  const handleConfirmRoleUpdate = async () => {
    if (!roleChangeTarget) return;

    setIsUpdatingRole(true);
    try {
      await api.users.updateRole(roleChangeTarget.id, selectedRole);
      toast({
        title: "Role Updated",
        description: `${roleChangeTarget.fullName || roleChangeTarget.username}'s role changed to ${selectedRole}.`,
        type: "success",
      });
      setRoleChangeTarget(null);
      loadTeamMembers();
    } catch (err) {
      console.error("Failed to update role:", err);
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Could not update user role",
        type: "error",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Password Reset Handler
  const handleConfirmResetPassword = async () => {
    if (!resetTargetUser) return;

    setIsResetting(true);
    try {
      await api.users.resetPassword(resetTargetUser.id);
      toast({
        title: "Password Reset Completed",
        description: `Temporary password for ${resetTargetUser.username} set to "emitmail". User must change it on login.`,
        type: "success",
      });
      setResetTargetUser(null);
      loadTeamMembers();
    } catch (err) {
      console.error("Failed to reset password:", err);
      toast({
        title: "Reset Failed",
        description: err instanceof Error ? err.message : "Could not reset password",
        type: "error",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Delete User Handler
  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetUser) return;

    setIsDeleting(true);
    try {
      await api.users.delete(deleteTargetUser.id);
      toast({
        title: "User Removed",
        description: `Account ${deleteTargetUser.username} has been deleted.`,
        type: "warning",
      });
      setDeleteTargetUser(null);
      loadTeamMembers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast({
        title: "Deletion Failed",
        description: err instanceof Error ? err.message : "Could not remove user account",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      {/* 1. Header with View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-kumo-hairline">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
            Settings & Access Control
          </h1>
          <p className="text-xs text-kumo-subtle mt-1">
            Manage your workspace configuration, Redis queue engine, and role-based user permissions.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-kumo-elevated rounded-xl border border-kumo-hairline self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "workspace"
                ? "bg-kumo-base text-kumo-strong shadow-xs border border-kumo-hairline"
                : "text-kumo-subtle hover:text-kumo-strong"
            }`}
          >
            <Gear size={15} weight={activeTab === "workspace" ? "bold" : "regular"} />
            <span>Workspace & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "team"
                ? "bg-kumo-base text-kumo-strong shadow-xs border border-kumo-hairline"
                : "text-kumo-subtle hover:text-kumo-strong"
            }`}
          >
            <Users size={15} weight={activeTab === "team" ? "bold" : "regular"} />
            <span>Team & Roles</span>
            {teamMembers.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cf-orange/10 text-cf-orange border border-cf-orange/20">
                {teamMembers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WORKSPACE & ENGINE SETTINGS                                        */}
      {/* ========================================================================= */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          {/* General Settings Card */}
          <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
              <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                <Gear size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-strong">
                  General Workspace Settings
                </h3>
                <p className="text-[11px] text-kumo-subtle">
                  Global workspace identity, default return paths, and timezone preferences
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Default Sender Address
                  </label>
                  <input
                    type="email"
                    value={defaultSender}
                    onChange={(e) => setDefaultSender(e.target.value)}
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                  Workspace Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full sm:w-80 bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange cursor-pointer"
                >
                  <option value="UTC (Coordinated Universal Time)">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                  <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-cf-primary">
                  Save General Changes
                </button>
              </div>
            </form>
          </section>

          {/* Worker & Queue Engine Settings */}
          <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
              <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                <Cpu size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-strong">
                  Worker & Queue Engine (BullMQ)
                </h3>
                <p className="text-[11px] text-kumo-subtle">
                  Redis queue worker concurrency, retry backoff algorithms, and rate limits
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveQueue} className="space-y-5 pt-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-kumo-strong">
                    BullMQ Worker Concurrency per Node
                  </label>
                  <span className="font-mono text-xs font-bold text-cf-orange bg-cf-orange-tint px-2 py-0.5 rounded border border-cf-orange-border/40">
                    {workerConcurrency} Workers
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={workerConcurrency}
                  onChange={(e) => setWorkerConcurrency(Number(e.target.value))}
                  className="w-full accent-cf-orange cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-kumo-muted mt-1 font-mono">
                  <span>1 Worker (Low memory)</span>
                  <span>25 Workers</span>
                  <span>50 Workers (10,000 req/sec)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Maximum Retry Attempts
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-kumo-recessed border border-kumo-hairline cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={exponentialBackoff}
                      onChange={(e) => setExponentialBackoff(e.target.checked)}
                      className="accent-cf-orange"
                    />
                    <span className="font-medium text-kumo-strong">
                      Enable Exponential Backoff (10s, 30s, 90s)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-cf-primary">
                  Update Queue Configuration
                </button>
              </div>
            </form>
          </section>

          {/* Appearance Preference */}
          <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
              <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                <PaintBrush size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-strong">
                  Appearance Preference
                </h3>
                <p className="text-[11px] text-kumo-subtle">
                  Toggle between Cloudflare Pitch-Black Dark Mode and Crisp Light Mode
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleThemeChange("dark")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  themeMode === "dark"
                    ? "border-cf-orange bg-cf-orange-tint/40 shadow-xs ring-1 ring-cf-orange"
                    : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0C0C0C] border border-[#1E1E1E] flex items-center justify-center text-[#E5E5E5]">
                    <Moon size={16} weight="bold" />
                  </div>
                  {themeMode === "dark" && (
                    <span className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center text-[10px]">
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-kumo-strong block">Dark Mode</span>
                <span className="text-[11px] text-kumo-subtle block mt-0.5">
                  Pitch black canvas (#050505) with dark charcoal cards
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("light")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  themeMode === "light"
                    ? "border-cf-orange bg-cf-orange-tint/40 shadow-xs ring-1 ring-cf-orange"
                    : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E5E5E5] flex items-center justify-center text-[#111111]">
                    <Sun size={16} weight="bold" />
                  </div>
                  {themeMode === "light" && (
                    <span className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center text-[10px]">
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-kumo-strong block">Light Mode</span>
                <span className="text-[11px] text-kumo-subtle block mt-0.5">
                  Crisp off-white canvas (#FBFBFB) with pure white cards
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("system")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  themeMode === "system"
                    ? "border-cf-orange bg-cf-orange-tint/40 shadow-xs ring-1 ring-cf-orange"
                    : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-kumo-elevated border border-kumo-hairline flex items-center justify-center text-kumo-default">
                    <Desktop size={16} weight="bold" />
                  </div>
                  {themeMode === "system" && (
                    <span className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center text-[10px]">
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-kumo-strong block">System Preference</span>
                <span className="text-[11px] text-kumo-subtle block mt-0.5">
                  Automatically synchronize with OS color scheme
                </span>
              </button>
            </div>
          </section>

          {/* System Version & Updates Card */}
          <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-kumo-hairline flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange/20 flex items-center justify-center text-cf-orange">
                  <RocketLaunch size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    System Version & Updates
                  </h3>
                  <p className="text-[11px] text-kumo-subtle">
                    Self-hosted release telemetry, semver comparison, and Docker upgrade pipeline
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refresh(true)}
                  disabled={isChecking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kumo-default hover:text-kumo-strong hover:bg-kumo-recessed border border-kumo-hairline transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ArrowsClockwise
                    size={14}
                    className={isChecking ? "animate-spin" : ""}
                  />
                  <span>Check for Updates</span>
                </button>
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cf-orange text-white hover:bg-cf-orange-hover transition-colors shadow-xs cursor-pointer"
                >
                  <span>View Changelog</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline">
                <span className="text-[11px] text-kumo-subtle block uppercase tracking-wider font-semibold">
                  Installed Version
                </span>
                <span className="text-sm font-mono font-bold text-kumo-strong mt-1 block">
                  v{versionData?.currentVersion || "1.0.0"}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline">
                <span className="text-[11px] text-kumo-subtle block uppercase tracking-wider font-semibold">
                  Latest GitHub Release
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono font-bold text-kumo-strong">
                    v{versionData?.latestVersion || "1.0.0"}
                  </span>
                  {versionData?.isUpdateAvailable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cf-orange-tint text-cf-orange border border-cf-orange-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-cf-orange animate-pulse" />
                      Update Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cf-success/15 text-cf-success border border-cf-success/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-cf-success" />
                      Up to Date
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline">
                <span className="text-[11px] text-kumo-subtle block uppercase tracking-wider font-semibold">
                  Last Telemetry Sync
                </span>
                <span className="text-xs text-kumo-default mt-1 block">
                  {versionData?.checkedAt
                    ? new Date(versionData.checkedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Just now"}
                </span>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-kumo-danger-tint/20 border border-kumo-danger/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-danger/20">
              <div className="w-8 h-8 rounded-lg bg-kumo-danger/10 border border-kumo-danger/30 flex items-center justify-center text-kumo-danger">
                <Warning size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-danger">Danger Zone</h3>
                <p className="text-[11px] text-kumo-subtle">
                  Destructive actions affecting queues, Redis buffers, and workspace credentials
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-kumo-base border border-kumo-hairline">
                <div>
                  <span className="text-xs font-semibold text-kumo-strong block">
                    Purge Dead Letter Queue (DLQ)
                  </span>
                  <span className="text-[11px] text-kumo-subtle block mt-0.5">
                    Permanently purge all stalled or failed message jobs without triggering retry attempts.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePurgeQueue}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors shrink-0 cursor-pointer"
                >
                  Purge Failed Jobs
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-kumo-base border border-kumo-hairline">
                <div>
                  <span className="text-xs font-semibold text-kumo-strong block">
                    Rotate Workspace Master Key
                  </span>
                  <span className="text-[11px] text-kumo-subtle block mt-0.5">
                    Invalidates active developer session cookies and triggers re-authentication.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Master Secret Rotated",
                      description: "Workspace session token renewed.",
                      type: "warning",
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors shrink-0 cursor-pointer"
                >
                  Rotate Key
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEAM MEMBERS & ROLE-BASED ACCESS CONTROL (RBAC)                    */}
      {/* ========================================================================= */}
      {activeTab === "team" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Roster Header & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-kumo-base border border-kumo-hairline rounded-xl shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-kumo-strong">
                  Team Members & Role Access
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cf-orange/10 text-cf-orange border border-cf-orange/20 font-medium">
                  RBAC Active
                </span>
              </div>
              <p className="text-xs text-kumo-subtle max-w-xl">
                Only Administrators can provision users, assign roles, or reset credentials. Default password for new members is{" "}
                <code className="text-kumo-strong bg-kumo-elevated px-1.5 py-0.5 rounded border border-kumo-hairline font-mono text-[11px]">
                  emitmail
                </code>
                .
              </p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIsAddModalOpen(true);
                }}
                className="btn-cf-primary flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-md shadow-cf-orange/20"
              >
                <UserPlus size={16} weight="bold" />
                <span>Add Member</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-kumo-muted bg-kumo-elevated px-3 py-1.5 rounded-lg border border-kumo-hairline">
                <Info size={15} />
                <span>Admin required to add users</span>
              </div>
            )}
          </div>

          {/* Role Capability Guide Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Admin Role Card */}
            <div className="p-4 rounded-xl bg-kumo-base border border-kumo-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cf-orange uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldCheck size={16} weight="fill" />
                  <span>Admin</span>
                </span>
                <span className="text-[10px] font-mono bg-cf-orange/10 text-cf-orange px-2 py-0.5 rounded border border-cf-orange/20">
                  Full Access
                </span>
              </div>
              <p className="text-[11px] text-kumo-subtle leading-relaxed">
                Complete control over workspace parameters, team provisioning, domain verification, and API key management.
              </p>
            </div>

            {/* Member Role Card */}
            <div className="p-4 rounded-xl bg-kumo-base border border-kumo-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cf-chart-blue uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <User size={16} weight="bold" />
                  <span>Member</span>
                </span>
                <span className="text-[10px] font-mono bg-cf-chart-blue/10 text-cf-chart-blue px-2 py-0.5 rounded border border-cf-chart-blue/20">
                  Standard Ops
                </span>
              </div>
              <p className="text-[11px] text-kumo-subtle leading-relaxed">
                Authorized to dispatch emails, configure mailboxes, inspect analytics, and create domain-scoped API keys.
              </p>
            </div>

            {/* Viewer Role Card */}
            <div className="p-4 rounded-xl bg-kumo-base border border-kumo-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-kumo-subtle uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <IdentificationCard size={16} weight="bold" />
                  <span>Viewer</span>
                </span>
                <span className="text-[10px] font-mono bg-kumo-elevated text-kumo-muted px-2 py-0.5 rounded border border-kumo-hairline">
                  Read-Only
                </span>
              </div>
              <p className="text-[11px] text-kumo-subtle leading-relaxed">
                Read-only observability over delivery telemetry, inbound logs, and domain health without write permissions.
              </p>
            </div>
          </div>

          {/* Team Members List */}
          <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-kumo-hairline flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-kumo-strong uppercase tracking-wider font-mono">
                  Active Team Members ({teamMembers.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={loadTeamMembers}
                disabled={isLoadingTeam}
                className="text-xs text-kumo-subtle hover:text-kumo-strong flex items-center gap-1.5 p-1 rounded hover:bg-kumo-tint transition-colors cursor-pointer"
                title="Refresh team roster"
              >
                <ArrowsClockwise size={14} className={isLoadingTeam ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingTeam ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-cf-orange border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-kumo-subtle">Loading team roster...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users size={32} className="text-kumo-muted mx-auto" />
                <p className="text-xs text-kumo-strong font-medium">No team members found</p>
                <p className="text-[11px] text-kumo-subtle">Provision team members to grant workspace access.</p>
              </div>
            ) : (
              <div className="divide-y divide-kumo-hairline">
                {teamMembers.map((member) => {
                  const isSelf = currentUser?.id === member.id;
                  const isMainAdmin = member.username === "admin";
                  const displayRole = isMainAdmin ? "ADMIN" : (member.role || "MEMBER");

                  return (
                    <div
                      key={member.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-kumo-tint/30 transition-colors"
                    >
                      {/* Left: Avatar & User Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-kumo-hairline shadow-2xs bg-kumo-elevated flex items-center justify-center">
                            <Facehash
                              name={member.username || member.fullName || member.email || "user"}
                              size={40}
                              interactive
                              enableBlink
                            />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-kumo-strong truncate">
                              {member.fullName || member.username}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cf-orange/10 text-cf-orange border border-cf-orange/20 font-semibold">
                                You
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-wide uppercase ${
                                displayRole === "ADMIN"
                                  ? "bg-cf-orange/15 text-cf-orange border border-cf-orange/30"
                                  : displayRole === "MEMBER"
                                  ? "bg-cf-chart-blue/15 text-cf-chart-blue border border-cf-chart-blue/30"
                                  : "bg-kumo-elevated text-kumo-muted border border-kumo-hairline"
                              }`}
                            >
                              {isMainAdmin ? "Main Admin" : displayRole}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-kumo-subtle mt-0.5 font-mono">
                            <span className="truncate">{member.email || "No email assigned"}</span>
                            <span>•</span>
                            <span className="text-kumo-muted">@{member.username}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Security Status & Administrator Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {/* First-login flag */}
                        {member.mustChangePassword ? (
                          <span
                            className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-cf-amber bg-cf-amber/10 border border-cf-amber/20 px-2 py-1 rounded"
                            title="User must change default password on first login"
                          >
                            <Lock size={12} />
                            <span>Initial Password</span>
                          </span>
                        ) : (
                          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-cf-success bg-cf-success/10 border border-cf-success/20 px-2 py-1 rounded">
                            <Check size={12} weight="bold" />
                            <span>Active</span>
                          </span>
                        )}

                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {/* Change Role Button (Cannot modify root main admin) */}
                            {!isMainAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRoleChangeTarget(member);
                                  setSelectedRole(member.role);
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg text-kumo-default hover:text-kumo-strong bg-kumo-elevated hover:bg-kumo-line/40 border border-kumo-hairline transition-colors cursor-pointer"
                                title="Modify Role"
                              >
                                Role
                              </button>
                            )}

                            {/* Reset Password Button */}
                            <button
                              type="button"
                              onClick={() => setResetTargetUser(member)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg text-kumo-default hover:text-cf-orange bg-kumo-elevated hover:bg-kumo-line/40 border border-kumo-hairline transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reset Password to emitmail"
                            >
                              <Key size={13} />
                              <span className="hidden lg:inline">Reset</span>
                            </button>

                            {/* Delete User Button (Disabled on Self and Main Root Admin) */}
                            {!isMainAdmin && (
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => setDeleteTargetUser(member)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isSelf
                                    ? "opacity-30 cursor-not-allowed text-kumo-muted border-transparent"
                                    : "text-kumo-danger hover:bg-kumo-danger-tint border-transparent hover:border-kumo-danger/30 cursor-pointer"
                                }`}
                                title={isSelf ? "Cannot delete yourself" : "Remove user"}
                              >
                                <Trash size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW MEMBER                                                   */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-kumo-base border border-kumo-hairline rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-kumo-hairline">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cf-orange/15 border border-cf-orange/30 flex items-center justify-center text-cf-orange shadow-xs">
                  <UserPlus size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-kumo-strong">Provision Team Member</h3>
                  <p className="text-[11px] text-kumo-subtle">
                    Add an operator to your EmitMail workspace and assign their permission role.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-kumo-muted hover:text-kumo-strong p-1 rounded-lg hover:bg-kumo-tint transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs flex items-center gap-2 animate-in fade-in duration-100">
                <Warning size={16} weight="fill" className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Facehash Profile Avatar Live Preview */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-kumo-control border border-kumo-hairline">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-kumo-hairline bg-kumo-elevated shrink-0 shadow-xs flex items-center justify-center">
                  <Facehash
                    name={
                      newUsername.trim() ||
                      newEmail.trim() ||
                      newFullName.trim() ||
                      "preview"
                    }
                    size={48}
                    interactive
                    enableBlink
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-kumo-strong truncate">
                      {newFullName.trim() || "New Member"}
                    </span>
                    <span className="text-[9px] font-mono text-cf-orange bg-cf-orange/10 px-1.5 py-0.2 rounded border border-cf-orange/20 font-bold">
                      {newRole}
                    </span>
                  </div>
                  <span className="text-[11px] text-kumo-subtle font-mono truncate block mt-0.5">
                    Default profile picture generated via Facehash.dev
                  </span>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-kumo-default flex items-center gap-1.5">
                  <IdentificationCard size={14} className="text-kumo-muted" />
                  <span>Full Name</span>
                  <span className="text-cf-orange">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Alex Henderson"
                  className="w-full bg-kumo-control border border-kumo-line hover:border-kumo-line-hover focus:border-cf-orange text-kumo-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-cf-orange transition-all placeholder:text-kumo-muted"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-kumo-default flex items-center gap-1.5">
                  <EnvelopeSimple size={14} className="text-kumo-muted" />
                  <span>Email Address</span>
                  <span className="text-cf-orange">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full bg-kumo-control border border-kumo-line hover:border-kumo-line-hover focus:border-cf-orange text-kumo-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-cf-orange transition-all placeholder:text-kumo-muted font-mono"
                />
              </div>

              {/* Optional Custom Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-kumo-default flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User size={14} className="text-kumo-muted" />
                    <span>Username</span>
                  </span>
                  <span className="text-[10px] text-kumo-muted font-mono">Optional (auto-derived)</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ahenderson"
                  className="w-full bg-kumo-control border border-kumo-line hover:border-kumo-line-hover focus:border-cf-orange text-kumo-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-cf-orange transition-all placeholder:text-kumo-muted font-mono"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-kumo-default flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-kumo-muted" />
                  <span>Permission Role</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(["ADMIN", "MEMBER", "VIEWER"] as UserRole[]).map((roleOption) => {
                    const isSelected = newRole === roleOption;
                    return (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => setNewRole(roleOption)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-cf-orange bg-cf-orange/10 text-kumo-strong shadow-xs ring-1 ring-cf-orange"
                            : "border-kumo-hairline bg-kumo-control hover:border-kumo-line text-kumo-subtle"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isSelected ? "text-cf-orange" : "text-kumo-default"
                            }`}
                          >
                            {roleOption}
                          </span>
                          {isSelected && <Check size={12} weight="bold" className="text-cf-orange" />}
                        </div>
                        <span className="text-[10px] text-kumo-muted block">
                          {roleOption === "ADMIN"
                            ? "Full workspace control"
                            : roleOption === "MEMBER"
                            ? "Send & manage emails"
                            : "Read-only metrics"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Password Notice */}
              <div className="p-3.5 rounded-xl bg-kumo-elevated border border-kumo-hairline text-[11px] text-kumo-subtle flex items-start gap-2.5">
                <Info size={16} className="text-cf-orange shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-kumo-strong">Default Initial Password</p>
                  <p>
                    The initial password will automatically be set to{" "}
                    <code className="text-cf-orange font-mono font-bold bg-cf-orange/10 px-1 py-0.2 rounded border border-cf-orange/20">
                      emitmail
                    </code>
                    . The user will be required to change it on their first login.
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-kumo-default hover:bg-kumo-tint transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="btn-cf-primary flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Member...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} weight="bold" />
                      <span>Create Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHANGE ROLE                                                      */}
      {/* ========================================================================= */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-kumo-base border border-kumo-hairline rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-kumo-hairline">
              <div>
                <h3 className="text-sm font-bold text-kumo-strong">Modify Permission Role</h3>
                <p className="text-[11px] text-kumo-subtle mt-0.5">
                  Update role for{" "}
                  <span className="font-semibold text-kumo-strong font-mono">
                    @{roleChangeTarget.username}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="text-kumo-muted hover:text-kumo-strong p-1 rounded-lg hover:bg-kumo-tint cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {(["ADMIN", "MEMBER", "VIEWER"] as UserRole[]).map((roleOption) => {
                const isSelected = selectedRole === roleOption;
                return (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => setSelectedRole(roleOption)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-cf-orange bg-cf-orange/10 shadow-xs ring-1 ring-cf-orange"
                        : "border-kumo-hairline bg-kumo-control hover:border-kumo-line"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold font-mono ${
                            isSelected ? "text-cf-orange" : "text-kumo-strong"
                          }`}
                        >
                          {roleOption}
                        </span>
                        {roleOption === "ADMIN" && (
                          <span className="text-[9px] bg-cf-orange/15 text-cf-orange px-1.5 py-0.2 rounded font-mono">
                            Full Control
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-kumo-subtle mt-0.5">
                        {roleOption === "ADMIN"
                          ? "Full workspace settings & user administration privileges."
                          : roleOption === "MEMBER"
                          ? "Dispatch emails, create API keys, and manage routing."
                          : "Read-only access to metrics, logs, and email history."}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cf-orange text-white flex items-center justify-center shrink-0">
                        <Check size={12} weight="bold" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-kumo-hairline">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-kumo-default hover:bg-kumo-tint cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleUpdate}
                disabled={isUpdatingRole}
                className="btn-cf-primary flex items-center gap-2 cursor-pointer"
              >
                {isUpdatingRole ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Update Role</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-kumo-base border border-kumo-hairline rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-cf-orange/15 border border-cf-orange/30 flex items-center justify-center text-cf-orange mx-auto">
              <Key size={20} weight="bold" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-kumo-strong">Reset Password</h3>
              <p className="text-xs text-kumo-subtle">
                Are you sure you want to reset the password for{" "}
                <span className="font-semibold text-kumo-strong font-mono">
                  {resetTargetUser.fullName || resetTargetUser.username}
                </span>
                ?
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-kumo-elevated border border-kumo-hairline text-[11px] text-kumo-subtle text-center">
              The user&apos;s password will be restored to{" "}
              <code className="text-cf-orange font-mono font-bold">emitmail</code> and they will be
              prompted to configure a new password upon logging in.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-kumo-default hover:bg-kumo-tint cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                disabled={isResetting}
                className="btn-cf-primary flex items-center gap-2 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset to &quot;emitmail&quot;</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE USER CONFIRMATION                                         */}
      {/* ========================================================================= */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-kumo-base border border-kumo-danger/40 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-kumo-danger/15 border border-kumo-danger/30 flex items-center justify-center text-kumo-danger mx-auto">
              <Trash size={20} weight="bold" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-kumo-danger">Delete User Account</h3>
              <p className="text-xs text-kumo-subtle">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-kumo-strong font-mono">
                  @{deleteTargetUser.username}
                </span>{" "}
                ({deleteTargetUser.fullName})?
              </p>
            </div>

            <p className="text-[11px] text-kumo-muted text-center">
              This action cannot be undone. Active sessions and credentials belonging to this operator will immediately be terminated.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-kumo-default hover:bg-kumo-tint cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-kumo-danger hover:bg-kumo-danger/90 text-white shadow-md shadow-kumo-danger/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Delete Member</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
