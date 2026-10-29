import { ApiDomain, ApiKeyItem, CreatedApiKeyResponse, ProcessedEmailItem } from "@/types";

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
