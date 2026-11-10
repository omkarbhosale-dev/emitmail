"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable?: boolean;
  isUpdateAvailable: boolean;
  hasUpdate: boolean;
  isMajor: boolean;
  releaseName: string | null;
  publishedAt: string | null;
  htmlUrl: string;
  releaseUrl: string;
  releaseNotes: string | null;
  checkedAt: string;
  updateCommand: string;
}

interface VersionContextType {
  versionData: VersionInfo | null;
  isLoading: boolean;
  isChecking: boolean;
  isUpdateAvailable: boolean;
  isDismissed: boolean;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  refresh: (bypassCache?: boolean) => Promise<void>;
  dismissUpdate: () => void;
  resetSimulation: () => void;
  triggerUpdate: (targetVersion?: string) => Promise<{ status: string; message: string }>;
  isUpdating: boolean;
  setIsUpdating: (updating: boolean) => void;
}

const defaultVersionData: VersionInfo = {
  currentVersion: "1.0.0",
  latestVersion: "1.1.0",
  updateAvailable: true,
  isUpdateAvailable: true,
  hasUpdate: true,
  isMajor: false,
  releaseName: "EmitMail v1.1.0 — High Deliverability & Performance",
  publishedAt: new Date().toISOString(),
  htmlUrl: "https://github.com/omkarbhosale-dev/emitmail/releases",
  releaseUrl: "https://github.com/omkarbhosale-dev/emitmail/releases",
  releaseNotes:
    "### What's Changed in v1.1.0\n* Advanced BullMQ dispatch queue telemetry\n* Strict DMARC p=reject enforcement\n* Bricolage Grotesque dashboard typography\n* Fast 1-click zero-downtime container updates",
  checkedAt: new Date().toISOString(),
  updateCommand: "git pull origin main && docker compose up -d --remove-orphans",
};

const VersionContext = createContext<VersionContextType>({
  versionData: null,
  isLoading: true,
  isChecking: false,
  isUpdateAvailable: false,
  isDismissed: false,
  isUpgradeModalOpen: false,
  setIsUpgradeModalOpen: () => {},
  refresh: async () => {},
  dismissUpdate: () => {},
  resetSimulation: () => {},
  triggerUpdate: async () => ({ status: "", message: "" }),
  isUpdating: false,
  setIsUpdating: () => {},
});

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [versionData, setVersionData] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkDismissed = useCallback((latestVer: string) => {
    try {
      if (typeof window !== "undefined") {
        const dismissed = localStorage.getItem(`dismissed_version_${latestVer}`);
        setIsDismissed(dismissed === "true");
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const refresh = useCallback(
    async (bypassCache = false) => {
      try {
        setIsChecking(true);
        const data = await api.system.getVersion(bypassCache);
        if (data) {
          const storedVersion =
            typeof window !== "undefined"
              ? localStorage.getItem("emitmail_current_version")
              : null;
          const cleanCur = (storedVersion || data.currentVersion || "1.0.0")
            .replace(/^v/i, "")
            .trim();
          const cleanLat = (data.latestVersion || "1.1.0").replace(/^v/i, "").trim();
          const updateFlag = Boolean(
            cleanCur && cleanLat && cleanCur !== cleanLat && cleanCur !== "0.0.0"
          );
          setVersionData({
            ...data,
            currentVersion: cleanCur || data.currentVersion,
            updateAvailable: updateFlag,
            isUpdateAvailable: updateFlag,
            hasUpdate: updateFlag,
          });
          checkDismissed(data.latestVersion);
        }
      } catch (err) {
        console.warn("Failed to check system version:", err);
        if (!versionData) {
          const storedVersion =
            typeof window !== "undefined"
              ? localStorage.getItem("emitmail_current_version")
              : null;
          const curVer = storedVersion || "1.0.0";
          const hasUp = curVer !== "1.1.0";
          setVersionData({
            ...defaultVersionData,
            currentVersion: curVer,
            updateAvailable: hasUp,
            isUpdateAvailable: hasUp,
            hasUpdate: hasUp,
          });
        }
      } finally {
        setIsLoading(false);
        setIsChecking(false);
      }
    },
    [versionData, checkDismissed]
  );

  const triggerUpdate = useCallback(async (targetVersion?: string) => {
    setIsUpdating(true);
    try {
      const result = await api.system.triggerUpdate(targetVersion);
      return result;
    } catch (err) {
      setIsUpdating(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, []);

  const dismissUpdate = useCallback(() => {
    if (versionData?.latestVersion && typeof window !== "undefined") {
      try {
        localStorage.setItem(`dismissed_version_${versionData.latestVersion}`, "true");
        setIsDismissed(true);
      } catch {}
    }
  }, [versionData?.latestVersion]);

  const resetSimulation = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("emitmail_current_version");
        if (versionData?.latestVersion) {
          localStorage.removeItem(`dismissed_version_${versionData.latestVersion}`);
        }
        localStorage.removeItem("dismissed_version_1.1.0");
        setIsDismissed(false);
      }
    } catch {}
    refresh(true);
  }, [refresh, versionData?.latestVersion]);

  const cleanCurrent = (versionData?.currentVersion || "").replace(/^v/i, "").trim();
  const cleanLatest = (versionData?.latestVersion || "").replace(/^v/i, "").trim();
  const hasSemverDiff = Boolean(
    cleanLatest &&
    cleanCurrent &&
    cleanLatest !== cleanCurrent &&
    cleanCurrent !== "0.0.0"
  );

  const hasUpdateBool = Boolean(
    (versionData?.updateAvailable ||
      versionData?.isUpdateAvailable ||
      versionData?.hasUpdate ||
      hasSemverDiff) &&
    !isDismissed
  );

  return (
    <VersionContext.Provider
      value={{
        versionData,
        isLoading,
        isChecking,
        isUpdateAvailable: hasUpdateBool,
        isDismissed,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        refresh,
        dismissUpdate,
        resetSimulation,
        triggerUpdate,
        isUpdating,
        setIsUpdating,
      }}
    >
      {children}
    </VersionContext.Provider>
  );
}

export function useSystemVersion() {
  const context = useContext(VersionContext);
  return context;
}
