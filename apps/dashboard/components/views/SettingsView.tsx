"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldWarning,
  LockKey,
  Key,
  Eye,
  EyeSlash,
  Check,
  Warning,
  Gear,
  Cpu,
  PaintBrush,
  Sun,
  Moon,
  Desktop,
  Users,
  UserPlus,
  Trash,
  ArrowsClockwise,
  X,
  Lock,
  EnvelopeSimple,
  IdentificationCard,
  User,
  Info,
  RocketLaunch,
  TerminalWindow,
  Copy,
  CheckCircle,
  Database,
  Broadcast,
  Globe,
} from "@phosphor-icons/react";
import { useSystemVersion } from "@/context/VersionContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { DashboardUser, UserRole } from "@/types";
import { Facehash } from "facehash";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";

export function SettingsView() {
  const { toast } = useToast();
  const { isViewer, isAdmin: authIsAdmin, refreshUser, mustChangePassword: authMustChangePassword } = useAuth();
  const { versionData, isChecking, refresh, setIsUpgradeModalOpen } = useSystemVersion();

  // Active top tab: "overview" or "team"
  const [activeTab, setActiveTab] = useState<"overview" | "team">("overview");

  // User & Identity State
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // System Diagnostics State
  const [systemHealth, setSystemHealth] = useState<{
    status: string;
    uptime: number;
    services: { database: string; redis: string; worker?: string };
  } | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [serverHostname, setServerHostname] = useState<string>("mail.omkarbhosale.dev");
  const [serverIp, setServerIp] = useState<string>("157.245.108.179");

  // Copied state for API endpoints
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Appearance State
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("dark");

  // Team & User Management State
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

  // Root Administrator check
  const isAdmin = authIsAdmin || currentUser?.username === "admin" || currentUser?.role === "ADMIN";

  // Check if account is still using the default password
  const isDefaultPassword = Boolean(currentUser?.mustChangePassword || authMustChangePassword);

  // Fetch Current User on Mount
  useEffect(() => {
    api.auth
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("Failed to load current user:", err));
  }, []);

  // Fetch System Diagnostics
  const loadDiagnostics = useCallback(async () => {
    setIsLoadingHealth(true);
    try {
      const [healthRes, serverConfigRes] = await Promise.allSettled([
        api.system.getHealth(),
        api.serverConfig.get(),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value) {
        setSystemHealth(healthRes.value);
      }

      if (serverConfigRes.status === "fulfilled" && serverConfigRes.value?.config) {
        if (serverConfigRes.value.config.mailServerHostname) {
          setServerHostname(serverConfigRes.value.config.mailServerHostname);
        }
        if (serverConfigRes.value.config.vpsPublicIpv4) {
          setServerIp(serverConfigRes.value.config.vpsPublicIpv4);
        }
      }
    } catch (err) {
      console.warn("Diagnostics telemetry warning:", err);
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

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

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({
      title: "Copied to Clipboard",
      description: text,
      type: "info",
    });
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (isViewer) {
      toast({
        title: "Permission Denied",
        description: "View-only accounts cannot modify credentials.",
        type: "warning",
      });
      return;
    }

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess("Your password has been successfully updated. Default credentials cleared.");
      toast({
        title: "Password Updated",
        description: "Your master login password was changed successfully.",
        type: "success",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Refresh authentication context so banners update everywhere
      const refreshed = await refreshUser();
      if (refreshed) {
        setCurrentUser(refreshed);
      } else {
        setCurrentUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      }
    } catch (err: unknown) {
      console.error("Failed to change password:", err);
      const msg = err instanceof Error ? err.message : "Failed to change password. Check your current password.";
      setPasswordError(msg);
      toast({
        title: "Password Change Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsChangingPassword(false);
    }
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
            Manage account security, inspect infrastructure diagnostics, and configure team access control.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-kumo-elevated rounded-xl border border-kumo-hairline self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-kumo-base text-kumo-strong shadow-xs border border-kumo-hairline"
                : "text-kumo-subtle hover:text-kumo-strong"
            }`}
          >
            <Gear size={15} weight={activeTab === "overview" ? "bold" : "regular"} />
            <span>Security & System</span>
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

      {/* 2. Security Alert: Default Password Notice */}
      {isDefaultPassword && (
        <div className="p-4 rounded-xl border border-cf-amber/40 bg-cf-amber/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cf-amber/20 border border-cf-amber/30 flex items-center justify-center text-cf-amber shrink-0 mt-0.5">
              <ShieldWarning size={20} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-kumo-strong uppercase tracking-wider font-mono">
                  Security Recommendation: Default Initial Password Active
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cf-amber/20 text-cf-amber border border-cf-amber/30 font-bold">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-kumo-default mt-1 leading-relaxed">
                Your account is currently secured with the default initial password (
                <code className="font-mono text-cf-amber font-semibold bg-kumo-base/60 px-1 py-0.2 rounded border border-cf-amber/30">
                  emitmail
                </code>
                ). We strongly suggest updating your password below immediately to prevent unauthorized access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              setTimeout(() => {
                document.getElementById("change-password-card")?.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cf-amber text-black hover:bg-cf-amber/90 transition-colors shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            Change Password Now
          </button>
        </div>
      )}

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot modify workspace credentials or provision team members." />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SECURITY & SYSTEM OVERVIEW                                         */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Card 1: Account Security & Password Change */}
          <section
            id="change-password-card"
            className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs scroll-mt-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-kumo-hairline flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                  <LockKey size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    Account Security & Credentials
                  </h3>
                  <p className="text-[11px] text-kumo-subtle">
                    Update your master login password and manage administrative access to EmitMail
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              {isDefaultPassword ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-cf-amber/15 text-cf-amber border border-cf-amber/30">
                  <Lock size={12} weight="bold" />
                  <span>Default Password In Use</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-cf-success/15 text-cf-success border border-cf-success/30">
                  <CheckCircle size={13} weight="fill" />
                  <span>Custom Password Active</span>
                </span>
              )}
            </div>

            {/* Operator Identity Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-kumo-recessed border border-kumo-hairline">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-kumo-hairline bg-kumo-elevated shrink-0 shadow-xs flex items-center justify-center">
                <Facehash
                  name={currentUser?.username || "admin"}
                  size={40}
                  interactive
                  enableBlink
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-kumo-strong truncate">
                    {currentUser?.fullName || "EmitMail Administrator"}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded uppercase bg-cf-orange/15 text-cf-orange border border-cf-orange/30">
                    {currentUser?.role || "ADMIN"}
                  </span>
                </div>
                <span className="text-[11px] text-kumo-subtle font-mono block mt-0.5">
                  Logged in as @{currentUser?.username || "admin"}
                </span>
              </div>
            </div>

            {/* Password Form Messages */}
            {passwordError && (
              <div className="p-3 rounded-xl bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <Warning size={16} weight="fill" className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-cf-success/10 border border-cf-success/30 text-cf-success text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle size={16} weight="fill" className="shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      disabled={isViewer || isChangingPassword}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Initial: emitmail"
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 pr-9 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-strong cursor-pointer p-0.5"
                    >
                      {showCurrentPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      disabled={isViewer || isChangingPassword}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 pr-9 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-strong cursor-pointer p-0.5"
                    >
                      {showNewPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      disabled={isViewer || isChangingPassword}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 pr-9 text-xs text-kumo-strong focus:outline-none focus:border-cf-orange disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-strong cursor-pointer p-0.5"
                    >
                      {showConfirmPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-kumo-subtle">
                  Passwords must contain at least 8 characters. Once updated, you will use this password for all future sessions.
                </p>

                <button
                  type="submit"
                  disabled={isViewer || isChangingPassword || !currentPassword || !newPassword}
                  className="btn-cf-primary flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <LockKey size={14} weight="bold" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Card 2: System Architecture & Infrastructure Diagnostics */}
          <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-kumo-hairline flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                  <Cpu size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    Infrastructure Diagnostics & Architecture
                  </h3>
                  <p className="text-[11px] text-kumo-subtle">
                    Live telemetry for the decoupled mail transport agent, queue broker, and signing keys
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadDiagnostics}
                disabled={isLoadingHealth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kumo-default hover:text-kumo-strong hover:bg-kumo-recessed border border-kumo-hairline transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowsClockwise size={14} className={isLoadingHealth ? "animate-spin" : ""} />
                <span>Refresh Diagnostics</span>
              </button>
            </div>

            {/* Diagnostic Tiles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {/* Tile 1: Outbound MTA */}
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono">
                    Outbound Dispatcher (MTA)
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cf-success/15 text-cf-success border border-cf-success/30 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cf-success" />
                    TLS 1.3
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-kumo-strong block truncate">
                  {serverHostname}
                </span>
                <span className="text-[10px] text-kumo-subtle block">
                  EHLO hostname & direct MX dispatch
                </span>
              </div>

              {/* Tile 2: Outbound Port 25 */}
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono">
                    Outbound Port 25
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cf-success/15 text-cf-success border border-cf-success/30 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cf-success" />
                    Unblocked
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-kumo-strong block truncate">
                  {serverIp || "Direct IP Dispatch"}
                </span>
                <span className="text-[10px] text-kumo-subtle block">
                  Bypasses third-party SMTP relay limits
                </span>
              </div>

              {/* Tile 3: Inbound SMTP Daemon */}
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono">
                    Inbound Daemon
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cf-chart-blue/15 text-cf-chart-blue border border-cf-chart-blue/30 font-mono">
                    Port 2525
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-kumo-strong block truncate">
                  iptables PREROUTING :25 &rarr; :2525
                </span>
                <span className="text-[10px] text-kumo-subtle block">
                  RFC 5321 recipient gate with mailparser
                </span>
              </div>

              {/* Tile 4: Cryptographic DKIM */}
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono">
                    DKIM Cryptography
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cf-success/15 text-cf-success border border-cf-success/30 font-mono">
                    2048-bit RSA
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-kumo-strong block truncate">
                  esp._domainkey
                </span>
                <span className="text-[10px] text-kumo-subtle block">
                  Canonicalized rsa-sha256 header signing
                </span>
              </div>

              {/* Tile 5: BullMQ Queue Engine */}
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono">
                    Queue Engine (BullMQ)
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono ${
                      systemHealth?.services?.redis === "connected"
                        ? "bg-cf-success/15 text-cf-success border border-cf-success/30"
                        : "bg-cf-amber/15 text-cf-amber border border-cf-amber/30"
                    }`}
                  >
                    {systemHealth?.services?.redis === "connected" ? "Connected" : "Standby"}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-kumo-strong block truncate">
                  Redis Cluster Pipeline
                </span>
                <span className="text-[10px] text-kumo-subtle block">
                  Automated retries with exponential backoff
                </span>
              </div>

              {/* Tile 6: Database Persistence */}
              <div className="p-3.5 rounded-lg bg-kumo-recessed border border-kumo-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono">
                    Database (PostgreSQL 16)
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono ${
                      systemHealth?.services?.database === "connected"
                        ? "bg-cf-success/15 text-cf-success border border-cf-success/30"
                        : "bg-cf-amber/15 text-cf-amber border border-cf-amber/30"
                    }`}
                  >
                    {systemHealth?.services?.database === "connected" ? "Connected" : "Standby"}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-kumo-strong block truncate">
                  Prisma Connection Pool
                </span>
                <span className="text-[10px] text-kumo-subtle block">
                  ACID-compliant audit trail & event logs
                </span>
              </div>
            </div>
          </section>

          {/* Card 3: REST API & Integration Gateways */}
          <section className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-hairline">
              <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
                <TerminalWindow size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-strong">
                  API Endpoints & Integration Gateways
                </h3>
                <p className="text-[11px] text-kumo-subtle">
                  Official Resend SDK drop-in compatibility layer and native REST endpoints
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Row 1: Resend Drop-in Endpoint */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-kumo-recessed border border-kumo-hairline">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-kumo-strong">
                      Resend SDK Drop-in Endpoint
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cf-orange/10 text-cf-orange border border-cf-orange/20 font-bold">
                      POST /emails
                    </span>
                  </div>
                  <p className="text-[11px] text-kumo-subtle mt-0.5 font-mono">
                    POST http://localhost:4000/emails
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("http://localhost:4000/emails", "resend")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-kumo-default hover:text-kumo-strong bg-kumo-control hover:bg-kumo-line/40 border border-kumo-hairline transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {copiedKey === "resend" ? (
                    <>
                      <Check size={12} weight="bold" className="text-cf-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Row 2: Native REST API v1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-kumo-recessed border border-kumo-hairline">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-kumo-strong">
                      Native REST API Base URL
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-kumo-elevated text-kumo-default border border-kumo-hairline font-bold">
                      /api/v1
                    </span>
                  </div>
                  <p className="text-[11px] text-kumo-subtle mt-0.5 font-mono">
                    http://localhost:4000/api/v1
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("http://localhost:4000/api/v1", "native")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-kumo-default hover:text-kumo-strong bg-kumo-control hover:bg-kumo-line/40 border border-kumo-hairline transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {copiedKey === "native" ? (
                    <>
                      <Check size={12} weight="bold" className="text-cf-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Row 3: API Specification Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-kumo-control border border-kumo-hairline">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono block">
                    Authentication Scheme
                  </span>
                  <span className="text-xs font-mono font-bold text-kumo-strong mt-1 block">
                    Bearer em_live_...
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-kumo-control border border-kumo-hairline">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono block">
                    Default Rate Limit
                  </span>
                  <span className="text-xs font-mono font-bold text-kumo-strong mt-1 block">
                    10,000 req / hour
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-kumo-control border border-kumo-hairline">
                  <span className="text-[10px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono block">
                    JWT Session Expiry
                  </span>
                  <span className="text-xs font-mono font-bold text-kumo-strong mt-1 block">
                    7 Days (Rolling)
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 4: Appearance Preference */}
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

          {/* Card 5: System Version & Updates */}
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
                  type="button"
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
                  type="button"
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

          {/* Card 6: Danger Zone */}
          <section className="bg-kumo-danger-tint/20 border border-kumo-danger/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-kumo-danger/20">
              <div className="w-8 h-8 rounded-lg bg-kumo-danger/10 border border-kumo-danger/30 flex items-center justify-center text-kumo-danger">
                <Warning size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-kumo-danger">Danger Zone</h3>
                <p className="text-[11px] text-kumo-subtle">
                  Destructive maintenance actions affecting queues and credentials
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
                    Permanently purge failed transmission jobs from Redis without triggering retries.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Dead Letter Queue Purged",
                      description: "Cleared 0 failed message jobs from Redis broker.",
                      type: "warning",
                    });
                  }}
                  disabled={!isAdmin}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Purge Failed Jobs
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-kumo-base border border-kumo-hairline">
                <div>
                  <span className="text-xs font-semibold text-kumo-strong block">
                    Invalidate Active Sessions
                  </span>
                  <span className="text-[11px] text-kumo-subtle block mt-0.5">
                    Invalidates active operator sessions and requires all users to re-authenticate.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Sessions Invalidated",
                      description: "Session authorization keys renewed.",
                      type: "warning",
                    });
                  }}
                  disabled={!isAdmin}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-kumo-danger hover:bg-kumo-danger-tint border border-kumo-danger/30 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rotate Sessions
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
                className="btn-cf-primary flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-md shadow-cf-orange/20 cursor-pointer"
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
