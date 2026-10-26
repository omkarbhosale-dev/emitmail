import { ApiDomain } from "@/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEY = "emitmail_admin_jwt";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Log in to EmitMail API. If no credentials supplied, defaults to standard setup admin/emitmail.
 */
export async function loginToApi(
  username: string = "admin",
  password: string = "emitmail"
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const json = await res.json();
  if (!res.ok || !json.success || !json.data?.accessToken) {
    throw new Error(json.message || "Failed to authenticate with EmitMail API");
  }

  const token = json.data.accessToken as string;
  setAuthToken(token);
  return token;
}

/**
 * Base fetch wrapper with automatic JWT injection and 401 token refresh retry.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  let token = getAuthToken();

  // If no token exists yet in browser, attempt automatic bootstrap login
  if (!token && typeof window !== "undefined") {
    try {
      token = await loginToApi();
    } catch {
      // Continue without token; backend will return 401 if route is protected
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized (e.g. token expired), try re-authenticating once and retry request
  if (response.status === 401 && typeof window !== "undefined") {
    try {
      token = await loginToApi();
      headers["Authorization"] = `Bearer ${token}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch {
      clearAuthToken();
    }
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || (json && json.success === false)) {
    const errorMsg =
      json?.message ||
      json?.error ||
      `API request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

export const api = {
  domains: {
    list: async (search?: string, status?: string): Promise<ApiDomain[]> => {
      const params = new URLSearchParams();
      if (search?.trim()) params.set("search", search.trim());
      if (status?.trim()) params.set("status", status.trim());
      const query = params.toString() ? `?${params.toString()}` : "";
      return apiFetch<ApiDomain[]>(`/domains${query}`);
    },

    getById: async (id: string): Promise<ApiDomain> => {
      return apiFetch<ApiDomain>(`/domains/${id}`);
    },

    create: async (data: {
      domainName: string;
      dkimSelector?: string;
      returnPathSubdomain?: string;
    }): Promise<ApiDomain> => {
      return apiFetch<ApiDomain>("/domains", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    verify: async (
      id: string
    ): Promise<{
      domain: ApiDomain;
      verificationSummary: {
        status: string;
        dkimVerified: boolean;
        spfVerified: boolean;
        mxVerified: boolean;
        dmarcVerified: boolean;
      };
    }> => {
      return apiFetch(`/domains/${id}/verify`, {
        method: "POST",
      });
    },

    delete: async (id: string): Promise<{ id: string; domainName: string }> => {
      return apiFetch<{ id: string; domainName: string }>(`/domains/${id}`, {
        method: "DELETE",
      });
    },
  },
};
