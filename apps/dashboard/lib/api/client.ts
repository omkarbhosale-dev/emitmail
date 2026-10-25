import { getSessionToken } from "../session";
import type { ApiSuccessResponse, ApiErrorResponse } from "./types";

export class ApiClientError extends Error {
  statusCode: number;
  errors?: { path?: string; message: string }[];

  constructor(message: string, statusCode: number, errors?: { path?: string; message: string }[]) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

const DEFAULT_API_URL = "http://localhost:4000/api/v1";

export function getBaseApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "");
  }
  return DEFAULT_API_URL;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...rest } = options;
  const baseUrl = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getSessionToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    cache: "no-store",
  });

  const rawJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = rawJson as ApiErrorResponse | null;
    const message =
      errorPayload?.message ||
      `API request failed with HTTP ${response.status} (${response.statusText})`;
    throw new ApiClientError(message, response.status, errorPayload?.errors);
  }

  const successPayload = rawJson as ApiSuccessResponse<T>;
  return successPayload.data;
}
