"use server";

import { login } from "@/lib/api";
import { setSessionToken, clearSessionToken } from "@/lib/session";
import { redirect } from "next/navigation";

export interface LoginActionState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  _prevState: LoginActionState | null,
  formData: FormData
): Promise<LoginActionState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Please provide both username and password." };
  }

  try {
    const res = await login({ username: username.trim(), password });
    if (res.accessToken) {
      await setSessionToken(res.accessToken);
    } else {
      return { error: "Login failed: No access token returned." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid login credentials.";
    return { error: message };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionToken();
  redirect("/login");
}
