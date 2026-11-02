"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DashboardUser, UserRole } from "@/types";
import { api, getAuthToken } from "@/lib/api";

export interface AuthContextType {
  currentUser: DashboardUser | null;
  role: UserRole;
  isLoading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  canCreate: boolean;
  canEdit: boolean;
  refreshUser: () => Promise<DashboardUser | null>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: "ADMIN",
  isLoading: true,
  isAdmin: true,
  isMember: false,
  isViewer: false,
  canCreate: true,
  canEdit: true,
  refreshUser: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const user = await api.auth.getMe();
      setCurrentUser(user);
      setIsLoading(false);
      return user;
    } catch (err) {
      console.warn("Failed to fetch current user in AuthProvider:", err);
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const isAdmin = currentUser?.username === "admin" || currentUser?.role === "ADMIN";
  const isViewer = !isAdmin && currentUser?.role === "VIEWER";
  const isMember = !isAdmin && !isViewer;
  const role: UserRole = isAdmin ? "ADMIN" : (currentUser?.role || "MEMBER");

  const canCreate = !isViewer;
  const canEdit = !isViewer;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isLoading,
        isAdmin,
        isMember,
        isViewer,
        canCreate,
        canEdit,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

