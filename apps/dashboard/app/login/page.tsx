"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { WarningCircle } from "@phosphor-icons/react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md rounded-[4px] border border-[#e5e5e5] bg-white p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-[2px] bg-[#ff5e1f]" aria-hidden="true" />
            <span className="text-brand text-[#262626]">
              EmitMail
            </span>
          </div>
          <h1 className="mt-5 text-page-title text-[#262626]">Sign in to Console</h1>
          <p className="mt-2 text-body text-[#595959]">
            Self-hosted email deliverability dashboard
          </p>
        </div>

        {state?.error && (
          <div
            id="login-error-message"
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-[2px] border border-[#fecaca] bg-[#fef2f2] p-3 text-support text-[#991b1b]"
          >
            <WarningCircle size={18} weight="bold" className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-label uppercase text-[#595959]"
            >
              Username or Email
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              aria-describedby={state?.error ? "login-error-message" : undefined}
              defaultValue="admin"
              className="mt-1.5 block h-11 w-full rounded-[2px] border border-[#a3a3a3] bg-white px-3 text-body text-[#262626] transition-colors focus:border-[#ff5e1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#262626]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-label uppercase text-[#595959]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-describedby={state?.error ? "login-error-message" : undefined}
              defaultValue="emitmail"
              className="mt-1.5 block h-11 w-full rounded-[2px] border border-[#a3a3a3] bg-white px-3 text-body text-[#262626] transition-colors focus:border-[#ff5e1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#262626]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary mt-6 w-full"
          >
            {isPending ? "Authenticating..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#e5e5e5] pt-4 text-center text-meta text-[#595959]">
          Default credentials: <code className="font-mono text-[#262626]">admin</code> /{" "}
          <code className="font-mono text-[#262626]">emitmail</code>
        </div>
      </div>
    </div>
  );
}
