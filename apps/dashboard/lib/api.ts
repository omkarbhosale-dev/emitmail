import {
  ApiDomain,
  ApiKeyItem,
  CreatedApiKeyResponse,
  ProcessedEmailItem,
  UserRole,
  DashboardUser,
} from "@/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEY = "emitmail_admin_jwt";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) return stored;

  const cookieMatch = document.cookie.match(/(?:^|;\s*)emitmail_token=([^;]+)/);
  if (cookieMatch) return decodeURIComponent(cookieMatch[1]);

  return null;
}

export function setAuthToken(token: string, days: number = 30): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `emitmail_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = "emitmail_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

/**
 * Base fetch wrapper with automatic JWT injection.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized, clear invalid session and redirect to login
  if (response.status === 401 && typeof window !== "undefined") {
    clearAuthToken();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
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
  auth: {
    login: async (
      credentials: { username: string; password: string },
      days: number = 30
    ): Promise<{
      accessToken: string;
      user: {
        id: string;
        username: string;
        email?: string;
        fullName?: string;
        role?: UserRole;
        mustChangePassword?: boolean;
      };
    }> => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data?.accessToken) {
        throw new Error(json?.message || "Invalid credentials provided");
      }

      const token = json.data.accessToken as string;
      setAuthToken(token, days);
      return json.data;
    },

    getMe: async (): Promise<DashboardUser> => {
      return apiFetch<DashboardUser>("/auth/me");
    },

    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
      return apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    logout: () => {
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
  },
  users: {
    list: async (): Promise<DashboardUser[]> => {
      return apiFetch<DashboardUser[]>("/users");
    },

    create: async (data: {
      fullName: string;
      email: string;
      role: UserRole;
      username?: string;
    }): Promise<DashboardUser> => {
      return apiFetch<DashboardUser>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateRole: async (id: string, role: UserRole): Promise<DashboardUser> => {
      return apiFetch<DashboardUser>(`/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    },

    resetPassword: async (id: string): Promise<{ id: string; username: string }> => {
      return apiFetch<{ id: string; username: string }>(`/users/${id}/reset-password`, {
        method: "POST",
      });
    },

    delete: async (id: string): Promise<{ id: string }> => {
      return apiFetch<{ id: string }>(`/users/${id}`, {
        method: "DELETE",
      });
    },

    getSettings: async (): Promise<DashboardUser> => {
      return apiFetch<DashboardUser>("/users/settings");
    },

    updateSettings: async (data: {
      username?: string;
      email?: string;
      fullName?: string;
      timezone?: string;
    }): Promise<DashboardUser> => {
      return apiFetch<DashboardUser>("/users/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
  },
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

  apiKeys: {
    list: async (): Promise<ApiKeyItem[]> => {
      return apiFetch<ApiKeyItem[]>("/api-keys");
    },

    create: async (data: {
      name: string;
      domainId?: string | null;
      scopes?: string[];
      expiresAt?: string | null;
    }): Promise<CreatedApiKeyResponse> => {
      return apiFetch<CreatedApiKeyResponse>("/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    toggle: async (id: string): Promise<ApiKeyItem> => {
      return apiFetch<ApiKeyItem>(`/api-keys/${id}/toggle`, {
        method: "PATCH",
      });
    },

    delete: async (id: string): Promise<{ id: string; name: string }> => {
      return apiFetch<{ id: string; name: string }>(`/api-keys/${id}`, {
        method: "DELETE",
      });
    },
  },

  inbox: {
    listDomains: async () => {
      return apiFetch<import("@/types").InboundDomainItem[]>("/inbox/domains");
    },

    verifyDomainMx: async (domainId: string) => {
      return apiFetch<{
        verified: boolean;
        expectedExchange: string;
        detectedRecords: any[];
        message: string;
      }>(`/inbox/domains/${domainId}/verify-mx`, {
        method: "POST",
      });
    },

    listMailboxes: async (domainId?: string, search?: string) => {
      const params = new URLSearchParams();
      if (domainId) params.set("domainId", domainId);
      if (search?.trim()) params.set("search", search.trim());
      const query = params.toString() ? `?${params.toString()}` : "";
      return apiFetch<import("@/types").MailboxItem[]>(`/inbox/mailboxes${query}`);
    },

    getMailbox: async (mailboxId: string) => {
      return apiFetch<import("@/types").MailboxItem>(`/inbox/mailboxes/${mailboxId}`);
    },

    createMailbox: async (data: {
      domainId: string;
      localPart: string;
      displayName?: string;
      isCatchAll?: boolean;
    }) => {
      return apiFetch<{
        mailbox: import("@/types").MailboxItem;
        inboundDnsInstructions: {
          mxVerified: boolean;
          record: {
            type: string;
            host: string;
            value: string;
            priority: number;
          };
        };
      }>("/inbox/mailboxes", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    deleteMailbox: async (mailboxId: string) => {
      return apiFetch<{ id: string; emailAddress: string }>(`/inbox/mailboxes/${mailboxId}`, {
        method: "DELETE",
      });
    },

    listMessages: async (
      mailboxId?: string,
      query?: { filter?: string; search?: string; page?: number; limit?: number }
    ) => {
      const params = new URLSearchParams();
      if (query?.filter) params.set("filter", query.filter);
      if (query?.search?.trim()) params.set("search", query.search.trim());
      if (query?.page) params.set("page", String(query.page));
      if (query?.limit) params.set("limit", String(query.limit));
      const q = params.toString() ? `?${params.toString()}` : "";
      const endpoint = mailboxId && mailboxId !== "all"
        ? `/inbox/mailboxes/${mailboxId}/messages${q}`
        : `/inbox/messages${q}`;
      return apiFetch<{
        mailbox?: import("@/types").MailboxItem;
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        unreadCount?: number;
        messages: import("@/types").InboundEmailItem[];
      }>(endpoint);
    },

    getMessage: async (messageId: string) => {
      return apiFetch<{
        message: import("@/types").InboundEmailItem;
        thread: import("@/types").InboundEmailItem[];
      }>(`/inbox/messages/${messageId}`);
    },

    updateMessage: async (
      messageId: string,
      data: { isRead?: boolean; isStarred?: boolean; isArchived?: boolean; isTrash?: boolean }
    ) => {
      return apiFetch<import("@/types").InboundEmailItem>(`/inbox/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    deleteMessage: async (messageId: string) => {
      return apiFetch<{ id: string; deleted: boolean }>(`/inbox/messages/${messageId}`, {
        method: "DELETE",
      });
    },

    replyMessage: async (
      messageId: string,
      data: { html?: string; text?: string; cc?: string[]; bcc?: string[] }
    ) => {
      return apiFetch<{
        message: string;
        emailId: string;
        reply: import("@/types").InboundEmailItem;
      }>(`/inbox/messages/${messageId}/reply`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    sendMailbox: async (
      mailboxId: string,
      data: { to: string | string[]; subject: string; html?: string; text?: string; cc?: string[]; bcc?: string[] }
    ) => {
      return apiFetch<import("@/types").InboundEmailItem>(`/inbox/mailboxes/${mailboxId}/send`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    simulateInbound: async (data: {
      from: string;
      to: string;
      subject: string;
      text?: string;
      html?: string;
    }) => {
      return apiFetch<{
        enqueued: boolean;
        jobId: string;
        message: string;
      }>("/inbox/simulate-inbound", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

    emails: {
      list: async (query?: {
        status?: string;
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
        domainId?: string;
      }): Promise<{
        emails: ProcessedEmailItem[];
        total: number;
        limit: number;
        offset: number;
      }> => {
        const params = new URLSearchParams();
        if (query?.status && query.status !== "all") params.set("status", query.status.toUpperCase());
        if (query?.limit) params.set("limit", String(query.limit));
        if (query?.offset) params.set("offset", String(query.offset));
        if (query?.startDate) params.set("startDate", query.startDate);
        if (query?.endDate) params.set("endDate", query.endDate);
        if (query?.domainId && query.domainId !== "all") params.set("domainId", query.domainId);
        const q = params.toString() ? `?${params.toString()}` : "";
        return apiFetch<{
          emails: ProcessedEmailItem[];
          total: number;
          limit: number;
          offset: number;
        }>(`/emails${q}`);
      },

      getById: async (id: string): Promise<ProcessedEmailItem> => {
        return apiFetch<ProcessedEmailItem>(`/emails/${id}`);
      },

      send: async (data: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
        cc?: string[];
        bcc?: string[];
        replyTo?: string;
      }): Promise<{
        id: string;
        from: string;
        to: string[];
        status: string;
        messageId: string;
      }> => {
        return apiFetch("/emails", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },

      getStats: async (): Promise<{
        total: number;
        delivered: number;
        bounced: number;
        queued: number;
        deliveryRate: string;
        bounceRate: string;
        totalInbound: number;
        unreadInbound: number;
        totalInvocations: number;
        chartDispatches: { time: string; val: number }[];
        chartInbound: { time: string; val: number }[];
        chartInvocations: { time: string; val: number }[];
      }> => {
        const [emailsRes, inboxRes] = await Promise.allSettled([
          api.emails.list({ limit: 100 }),
          api.inbox.listMessages(undefined, { limit: 100 }),
        ]);

        const emails = emailsRes.status === "fulfilled" && emailsRes.value?.emails ? emailsRes.value.emails : [];
        const total = emailsRes.status === "fulfilled" && emailsRes.value?.total ? emailsRes.value.total : emails.length;
        const delivered = emails.filter((e) => (e.status || "").toUpperCase() === "DELIVERED").length;
        const bounced = emails.filter((e) => {
          const s = (e.status || "").toUpperCase();
          return s === "BOUNCED" || s === "SUPPRESSED" || s === "FAILED";
        }).length;
        const queued = emails.filter((e) => {
          const s = (e.status || "").toUpperCase();
          return s === "QUEUED" || s === "SENDING";
        }).length;

        const deliveryRate = total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : "100%";
        const bounceRate = total > 0 ? `${((bounced / total) * 100).toFixed(1)}%` : "0%";

        const inboundMessages = inboxRes.status === "fulfilled" && inboxRes.value?.messages ? inboxRes.value.messages : [];
        const totalInbound = inboxRes.status === "fulfilled" && inboxRes.value?.total !== undefined
          ? inboxRes.value.total
          : inboundMessages.length;
        const unreadInbound = inboxRes.status === "fulfilled" && inboxRes.value?.unreadCount !== undefined
          ? inboxRes.value.unreadCount
          : inboundMessages.filter((m) => !m.isRead).length;

        const now = new Date();
        const buckets = [
          { label: "Day 1", startDay: 0, endDay: 6, outbound: 0, inbound: 0, invocations: 0 },
          { label: "Day 7", startDay: 7, endDay: 13, outbound: 0, inbound: 0, invocations: 0 },
          { label: "Day 14", startDay: 14, endDay: 20, outbound: 0, inbound: 0, invocations: 0 },
          { label: "Day 21", startDay: 21, endDay: 27, outbound: 0, inbound: 0, invocations: 0 },
          { label: "Day 30", startDay: 28, endDay: 31, outbound: 0, inbound: 0, invocations: 0 },
        ];

        let totalInvocations = 0;
        for (const email of emails) {
          const attempts = email.deliveryAttempts || 1;
          totalInvocations += attempts;

          const emailDate = new Date(email.createdAt);
          const diffDays = Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysFromStart = Math.max(0, Math.min(30, 30 - diffDays));

          for (const bucket of buckets) {
            if (daysFromStart >= bucket.startDay && daysFromStart <= bucket.endDay) {
              bucket.outbound += 1;
              bucket.invocations += attempts;
              break;
            }
          }
        }

        for (const msg of inboundMessages) {
          const dateStr = msg.receivedAt || msg.createdAt;
          if (dateStr) {
            const msgDate = new Date(dateStr);
            const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysFromStart = Math.max(0, Math.min(30, 30 - diffDays));

            for (const bucket of buckets) {
              if (daysFromStart >= bucket.startDay && daysFromStart <= bucket.endDay) {
                bucket.inbound += 1;
                break;
              }
            }
          }
        }

        return {
          total,
          delivered,
          bounced,
          queued,
          deliveryRate,
          bounceRate,
          totalInbound,
          unreadInbound,
          totalInvocations: totalInvocations || total,
          chartDispatches: buckets.map((b) => ({ time: b.label, val: b.outbound })),
          chartInbound: buckets.map((b) => ({ time: b.label, val: b.inbound })),
          chartInvocations: buckets.map((b) => ({ time: b.label, val: b.invocations })),
        };
      },
    },

    analytics: {
      getDetailedStats: async (params?: {
        timeRange?: "today" | "week" | "month" | "custom";
        startDate?: string;
        endDate?: string;
        domainId?: string;
      }) => {
        const timeRange = params?.timeRange || "month";
        const now = new Date();
        let startTime = 0;
        let endTime = now.getTime();

        let buckets: { label: string; start: number; end: number; outbound: number; inbound: number }[] = [];

        if (timeRange === "today") {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          startTime = startOfDay.getTime();
          const hourStep = 4;
          for (let h = 0; h < 24; h += hourStep) {
            const bStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0).getTime();
            const bEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + hourStep - 1, 59, 59, 999).getTime();
            const label = `${String(h).padStart(2, "0")}:00`;
            buckets.push({ label, start: bStart, end: bEnd, outbound: 0, inbound: 0 });
          }
        } else if (timeRange === "week") {
          startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const bStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
            const bEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
            const label = d.toLocaleDateString("en-US", { weekday: "short" });
            buckets.push({ label, start: bStart, end: bEnd, outbound: 0, inbound: 0 });
          }
        } else if (timeRange === "custom" && params?.startDate && params?.endDate) {
          const s = new Date(params.startDate + "T00:00:00");
          const e = new Date(params.endDate + "T23:59:59");
          startTime = isNaN(s.getTime()) ? now.getTime() - 7 * 24 * 60 * 60 * 1000 : s.getTime();
          endTime = isNaN(e.getTime()) ? now.getTime() : e.getTime();
          const span = Math.max(endTime - startTime, 1000);
          const parts = 5;
          const step = span / parts;
          for (let i = 0; i < parts; i++) {
            const bStart = startTime + i * step;
            const bEnd = i === parts - 1 ? endTime : startTime + (i + 1) * step;
            const d = new Date(bStart);
            const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            buckets.push({ label, start: bStart, end: bEnd, outbound: 0, inbound: 0 });
          }
        } else {
          // Default: "month" (30 days)
          startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          const parts = 5;
          const step = (30 * 24 * 60 * 60 * 1000) / parts;
          for (let i = 0; i < parts; i++) {
            const bStart = startTime + i * step;
            const bEnd = i === parts - 1 ? endTime : startTime + (i + 1) * step;
            const d = new Date(bStart);
            const label = `Day ${i * 6 + 1}`;
            buckets.push({ label, start: bStart, end: bEnd, outbound: 0, inbound: 0 });
          }
        }

        const [emailsRes, inboxRes, domainsRes, healthRes] = await Promise.allSettled([
          api.emails.list({ limit: 100 }),
          api.inbox.listMessages(undefined, { limit: 100 }),
          api.domains.list(),
          api.system.getHealth(),
        ]);

        const rawEmails = emailsRes.status === "fulfilled" && emailsRes.value?.emails ? emailsRes.value.emails : [];
        const rawInbound = inboxRes.status === "fulfilled" && inboxRes.value?.messages ? inboxRes.value.messages : [];
        const domains = domainsRes.status === "fulfilled" && Array.isArray(domainsRes.value) ? domainsRes.value : [];
        const health = healthRes.status === "fulfilled" ? healthRes.value : null;

        // Filter by Date Range and Domain
        const selectedDomainId = params?.domainId;
        const filteredEmails = rawEmails.filter((e) => {
          const t = new Date(e.createdAt).getTime();
          const inRange = t >= startTime && t <= endTime;
          if (!inRange) return false;
          if (selectedDomainId && selectedDomainId !== "all") {
            const eDom = e.domainId || e.domain?.id;
            return eDom === selectedDomainId;
          }
          return true;
        });

        const filteredInbound = rawInbound.filter((m) => {
          const t = new Date(m.receivedAt || m.createdAt).getTime();
          const inRange = t >= startTime && t <= endTime;
          if (!inRange) return false;
          if (selectedDomainId && selectedDomainId !== "all") {
            return m.domainId === selectedDomainId;
          }
          return true;
        });

        // Compute Core Metrics
        const totalSent = filteredEmails.length;
        const delivered = filteredEmails.filter((e) => (e.status || "").toUpperCase() === "DELIVERED").length;
        const bounced = filteredEmails.filter((e) => {
          const s = (e.status || "").toUpperCase();
          return s === "BOUNCED" || s === "SUPPRESSED" || s === "FAILED";
        }).length;
        const queued = filteredEmails.filter((e) => {
          const s = (e.status || "").toUpperCase();
          return s === "QUEUED" || s === "SENDING";
        }).length;
        const failed = filteredEmails.filter((e) => (e.status || "").toUpperCase() === "FAILED").length;
        const suppressed = filteredEmails.filter((e) => (e.status || "").toUpperCase() === "SUPPRESSED").length;

        const deliveryRate = totalSent > 0 ? `${((delivered / totalSent) * 100).toFixed(1)}%` : "100.0%";
        const bounceRate = totalSent > 0 ? `${((bounced / totalSent) * 100).toFixed(1)}%` : "0.0%";

        const totalInbound = filteredInbound.length;
        const unreadInbound = filteredInbound.filter((m) => !m.isRead).length;

        let totalAttempts = 0;
        for (const e of filteredEmails) {
          totalAttempts += e.deliveryAttempts || 1;
        }
        const avgAttempts = totalSent > 0 ? (totalAttempts / totalSent).toFixed(1) : "1.0";

        // Assign to Chart Buckets
        for (const e of filteredEmails) {
          const t = new Date(e.createdAt).getTime();
          for (const b of buckets) {
            if (t >= b.start && t <= b.end) {
              b.outbound += 1;
              break;
            }
          }
        }

        for (const m of filteredInbound) {
          const t = new Date(m.receivedAt || m.createdAt).getTime();
          for (const b of buckets) {
            if (t >= b.start && t <= b.end) {
              b.inbound += 1;
              break;
            }
          }
        }

        // Domain Breakdown
        const domainStats = domains.map((dom) => {
          const domEmails = filteredEmails.filter((e) => (e.domainId || e.domain?.id) === dom.id);
          const domSent = domEmails.length;
          const domDelivered = domEmails.filter((e) => (e.status || "").toUpperCase() === "DELIVERED").length;
          const domBounced = domEmails.filter((e) => {
            const s = (e.status || "").toUpperCase();
            return s === "BOUNCED" || s === "SUPPRESSED" || s === "FAILED";
          }).length;
          const domRate = domSent > 0 ? `${((domDelivered / domSent) * 100).toFixed(1)}%` : "100.0%";
          return {
            domainId: dom.id,
            domainName: dom.domainName,
            sent: domSent,
            delivered: domDelivered,
            bounced: domBounced,
            deliveryRate: domRate,
            status: dom.status || "VERIFIED",
          };
        });

        // Status Breakdown
        const statusBreakdown = [
          { status: "Delivered", count: delivered, percentage: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 100, color: "var(--cf-success)" },
          { status: "Queued / Sending", count: queued, percentage: totalSent > 0 ? Math.round((queued / totalSent) * 100) : 0, color: "var(--cf-chart-blue)" },
          { status: "Bounced", count: bounced - suppressed - failed > 0 ? bounced - suppressed - failed : 0, percentage: totalSent > 0 ? Math.round(((bounced - suppressed - failed) / totalSent) * 100) : 0, color: "var(--cf-orange)" },
          { status: "Suppressed", count: suppressed, percentage: totalSent > 0 ? Math.round((suppressed / totalSent) * 100) : 0, color: "var(--cf-amber)" },
          { status: "Failed", count: failed, percentage: totalSent > 0 ? Math.round((failed / totalSent) * 100) : 0, color: "var(--kumo-danger)" },
        ];

        return {
          timeRange,
          totalSent,
          delivered,
          bounced,
          queued,
          failed,
          suppressed,
          deliveryRate,
          bounceRate,
          totalInbound,
          unreadInbound,
          avgAttempts,
          chartOutbound: buckets.map((b) => ({ time: b.label, val: b.outbound })),
          chartInbound: buckets.map((b) => ({ time: b.label, val: b.inbound })),
          domainStats,
          statusBreakdown,
          health: {
            database: health?.services?.database === "connected",
            redis: health?.services?.redis === "connected",
            worker: health?.services?.worker === "running" || health?.services?.redis === "connected",
          },
        };
      },
    },

    system: {
      getHealth: async (): Promise<{
        status: string;
        uptime: number;
        services: {
          database: string;
          redis: string;
          worker?: string;
        };
      }> => {
        return apiFetch("/health");
      },
    },
  };
