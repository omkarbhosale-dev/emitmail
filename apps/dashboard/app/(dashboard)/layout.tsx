import React from "react";
import { getSessionToken } from "@/lib/session";
import { getProfile, getHealth, getSystemVersion } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";

import type { UserProfile } from "@/lib/api/types";
import { MOCK_OVERVIEW_HEALTH, MOCK_OVERVIEW_VERSION } from "@/features/overview/mock";

export const instant = false;

// TEMPORARY DEV AUTH BYPASS:
// Fallback user used during UI development when no valid JWT session exists.
// Revisit in the final phase to re-enable strict redirect to /login.
const DEV_FALLBACK_USER: UserProfile = {
  id: "dev-admin-id",
  username: "admin",
  email: "admin@emitmail.local",
  fullName: "Admin Developer",
  timezone: "UTC",
  mustChangePassword: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getSessionToken();
  let user: UserProfile = DEV_FALLBACK_USER;

  if (token) {
    try {
      const realUser = await getProfile();
      if (realUser) {
        user = realUser;
      }
    } catch {
      // In dev bypass mode, fallback to dev user when token is invalid or API is offline
      user = DEV_FALLBACK_USER;
    }
  }

  const [healthResult, versionResult] = await Promise.allSettled([
    getHealth(),
    getSystemVersion(),
  ]);

  const health =
    healthResult.status === "fulfilled"
      ? healthResult.value
      : MOCK_OVERVIEW_HEALTH;
  const version =
    versionResult.status === "fulfilled"
      ? versionResult.value.currentVersion
      : MOCK_OVERVIEW_VERSION.currentVersion;

  return (
    <AppShell user={user} health={health} version={version}>
      {children}
    </AppShell>
  );
}
