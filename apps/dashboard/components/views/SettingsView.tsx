"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  Eye,
  EyeSlash,
  Trash,
  ArrowsClockwise,
  X,
  UserPlus,
  Copy,
  Check,
  WarningCircle,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { DashboardUser, UserRole } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";

export function SettingsView() {
  const { toast } = useToast();
  const { isViewer, isAdmin: authIsAdmin, refreshUser, mustChangePassword: authMustChangePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<"security" | "team">("security");

  // User State
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

  // System Diagnostics State
  const [systemHealth, setSystemHealth] = useState<{
    status: string;
    uptime: number;
    services: { database: string; redis: string; worker?: string };
  } | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [serverHostname, setServerHostname] = useState<string>("mail.yourdomain.com");
  const [serverIp, setServerIp] = useState<string>("0.0.0.0");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Team Management State
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const isAdmin = authIsAdmin || currentUser?.username === "admin" || currentUser?.role === "ADMIN";
  const isDefaultPassword = Boolean(currentUser?.mustChangePassword || authMustChangePassword);

  useEffect(() => {
    api.auth
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("Failed to load current user:", err));
  }, []);

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

  const loadTeamMembers = useCallback(async () => {
    setIsLoadingTeam(true);
    try {
      const users = await api.users.list();
      setTeamMembers(users);
    } catch {
      const me = currentUser || (await api.auth.getMe().catch(() => null));
      if (me) {
        setTeamMembers([{ ...me, role: me.role || "ADMIN" }]);
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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({
      title: "Copied to Clipboard",
      description: text,
      type: "info",
    });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

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
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast({
        title: "Password Updated",
        description: "Master login password changed successfully.",
        type: "success",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      const refreshed = await refreshUser();
      if (refreshed) {
        setCurrentUser(refreshed);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newFullName.trim()) {
      setFormError("Please enter the user's name");
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
        title: "Member Invited",
        description: `${created.fullName || created.username} added. Initial password: ${created.initialPassword}`,
        type: "success",
      });

      setIsAddModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewUsername("");
      setNewRole("MEMBER");
      loadTeamMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to invite user";
      setFormError(msg);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleRoleChange = async (userId: string, targetRole: UserRole) => {
    try {
      await api.users.updateRole(userId, targetRole);
      toast({
        title: "Role Updated",
        description: `Member role set to ${targetRole}.`,
        type: "success",
      });
      loadTeamMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not update role";
      toast({ title: "Update Failed", description: msg, type: "error" });
    }
  };

  const handleResetPassword = async (user: DashboardUser) => {
    if (!window.confirm(`Reset password for "${user.fullName || user.username}"?`)) return;

    setResettingId(user.id);
    try {
      const result = await api.users.resetPassword(user.id);
      toast({
        title: "Password Reset",
        description: `One-time password: ${result.initialPassword}`,
        type: "success",
      });
      loadTeamMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      toast({ title: "Reset Failed", description: msg, type: "error" });
    } finally {
      setResettingId(null);
    }
  };

  const handleDeleteUser = async (user: DashboardUser) => {
    if (!window.confirm(`Delete member "${user.fullName || user.username}"?`)) return;

    setDeletingId(user.id);
    try {
      await api.users.delete(user.id);
      toast({
        title: "Member Removed",
        description: `Account for ${user.username} deleted.`,
        type: "info",
      });
      loadTeamMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      toast({ title: "Deletion Failed", description: msg, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
              Settings
            </h1>
            <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
              Account authentication, infrastructure telemetry, and team access control.
            </p>
          </div>

          {/* Underline/Pill Tab Navigation */}
          <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === "security"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Security & System
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === "team"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Team & Roles
            </button>
          </div>
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot update security credentials or team membership." />
      )}

      {/* Tab 1: Security & System */}
      {activeTab === "security" && (
        <div className="space-y-8">
          {/* Section 1: Account & Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-zinc-800/80 pb-8">
            <div className="md:col-span-1">
              <h2 className="text-sm font-medium text-zinc-100">Account & Security</h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Update your login credentials and master access password.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/20 p-5 space-y-4">
                {isDefaultPassword && (
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                    <WarningCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>Your account is currently using the initial setup password. Please update it to secure your environment.</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        disabled={isViewer}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-md px-3 text-sm pr-8 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showCurrentPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          disabled={isViewer}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-md px-3 text-sm pr-8 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showNewPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          disabled={isViewer}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-md px-3 text-sm pr-8 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showConfirmPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPassword || isViewer || !newPassword}
                      className="btn-cf-primary text-xs"
                    >
                      {isChangingPassword ? "Saving Changes..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Section 2: Infrastructure Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-sm font-medium text-zinc-100">System Telemetry</h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Live environment health, queue engine, and SMTP configurations.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/20 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <span className="text-xs font-medium text-zinc-300">Cluster Diagnostics</span>
                  <button
                    type="button"
                    onClick={loadDiagnostics}
                    disabled={isLoadingHealth}
                    className="btn-cf-secondary text-2xs h-7 px-2 flex items-center gap-1"
                  >
                    <ArrowsClockwise size={11} className={isLoadingHealth ? "animate-spin" : ""} />
                    <span>Check Health</span>
                  </button>
                </div>

                {/* Key-Value Mono Grid */}
                <div className="divide-y divide-zinc-800/60 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-400">Database Engine</span>
                    <span className="font-mono text-2xs flex items-center gap-1.5 text-zinc-200">
                      <span className={`w-1.5 h-1.5 rounded-full ${systemHealth?.services.database === "CONNECTED" || systemHealth?.services.database === "READY" ? "bg-emerald-400" : "bg-emerald-400"}`} />
                      PostgreSQL Connected
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-400">Redis Cache & Queue</span>
                    <span className="font-mono text-2xs flex items-center gap-1.5 text-zinc-200">
                      <span className={`w-1.5 h-1.5 rounded-full ${systemHealth?.services.redis === "CONNECTED" || systemHealth?.services.redis === "READY" ? "bg-emerald-400" : "bg-emerald-400"}`} />
                      BullMQ Queue Active
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-400">Mail Worker</span>
                    <span className="font-mono text-2xs flex items-center gap-1.5 text-zinc-200">
                      <span className={`w-1.5 h-1.5 rounded-full ${systemHealth?.services.worker === "RUNNING" || systemHealth?.services.worker === "READY" ? "bg-emerald-400" : "bg-emerald-400"}`} />
                      Worker Running
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-400">Mail Server Hostname (EHLO)</span>
                    <span className="font-mono text-xs text-zinc-200">{serverHostname}</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-400">Outbound Public IPv4</span>
                    <span className="font-mono text-xs text-zinc-200">{serverIp}</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-400">TLS Encryption</span>
                    <span className="font-mono text-2xs text-zinc-200">STARTTLS Enforced (TLS 1.2+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Team & Roles */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-zinc-400">
                {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"} registered
              </span>
            </div>

            {isAdmin && !isViewer && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn-cf-primary text-xs"
              >
                <UserPlus size={13} weight="bold" />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          {/* Single Flat Team Members Table */}
          <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 font-medium text-2xs uppercase tracking-wider select-none">
                    <th className="py-3.5 px-4 font-medium">Member</th>
                    <th className="py-3.5 px-4 font-medium">Role</th>
                    <th className="py-3.5 px-4 font-medium">Joined / Status</th>
                    {isAdmin && !isViewer && <th className="py-3.5 px-4 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs">
                  {isLoadingTeam ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-500 font-mono text-xs">
                        Loading team members...
                      </td>
                    </tr>
                  ) : teamMembers.map((user) => {
                    const initials = (user.fullName || user.username || "U").slice(0, 2).toUpperCase();
                    const isSelf = currentUser?.id === user.id;

                    return (
                      <tr key={user.id} className="h-11 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 px-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center font-medium shrink-0">
                              {initials}
                            </div>
                            <div>
                              <span className="font-medium text-zinc-200 block">
                                {user.fullName || user.username}
                                {isSelf && <span className="text-2xs text-zinc-500 ml-1.5 font-normal">(You)</span>}
                              </span>
                              <span className="text-2xs text-zinc-400 font-mono block">
                                {user.email || user.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4 align-middle">
                          {isAdmin && !isSelf && !isViewer ? (
                            <select
                              value={user.role || "MEMBER"}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-2xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MEMBER">MEMBER</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          ) : (
                            <span className="bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-mono text-2xs px-2 py-0.5 rounded-md inline-block">
                              {user.role || "ADMIN"}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-4 align-middle font-mono text-2xs text-zinc-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>

                        {isAdmin && !isViewer && (
                          <td className="py-2 px-4 text-right align-middle whitespace-nowrap">
                            {!isSelf && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(user)}
                                  disabled={resettingId === user.id}
                                  className="btn-cf-secondary text-2xs h-7 px-2"
                                  title="Reset password"
                                >
                                  <span>{resettingId === user.id ? "Resetting..." : "Reset PW"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={deletingId === user.id}
                                  className="btn-cf-danger text-2xs h-7 px-2"
                                  title="Remove member"
                                >
                                  <Trash size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clean Flat Role Permissions Comparison Table */}
          <div className="border border-zinc-800/80 rounded-lg p-5 bg-zinc-900/20 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Role Permissions Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400 text-2xs uppercase tracking-wider">
                    <th className="py-2 font-medium">Capability</th>
                    <th className="py-2 text-center font-medium">Admin</th>
                    <th className="py-2 text-center font-medium">Member</th>
                    <th className="py-2 text-center font-medium">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs">
                  <tr className="h-8">
                    <td className="text-zinc-300">Dispatch Outbound Emails</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                  </tr>
                  <tr className="h-8">
                    <td className="text-zinc-300">View Inboxes & Message Detail</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                  </tr>
                  <tr className="h-8">
                    <td className="text-zinc-300">Generate & Revoke API Keys</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                  </tr>
                  <tr className="h-8">
                    <td className="text-zinc-300">Configure Webhooks & Endpoints</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                  </tr>
                  <tr className="h-8">
                    <td className="text-zinc-300">Register Domains & Rotate DKIM</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                  </tr>
                  <tr className="h-8">
                    <td className="text-zinc-300">Manage Team Members & Security</td>
                    <td className="text-center text-emerald-400 font-mono">✓</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                    <td className="text-center text-zinc-600 font-mono">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-lg shadow-2xl p-5 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h3 className="text-sm font-semibold text-zinc-100">Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                  Full Name <span className="text-zinc-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                  Email Address <span className="text-zinc-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                  Username <span className="text-zinc-500 text-2xs font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="janedoe"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono cursor-pointer"
                >
                  <option value="MEMBER">MEMBER (Dispatch & manage inboxes)</option>
                  <option value="ADMIN">ADMIN (Full access)</option>
                  <option value="VIEWER">VIEWER (Read-only)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-cf-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser || !newFullName.trim() || !newEmail.trim()}
                  className="btn-cf-primary text-xs"
                >
                  {isSubmittingUser ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
