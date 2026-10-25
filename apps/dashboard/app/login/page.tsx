"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { WarningCircle } from "@phosphor-icons/react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm rounded-[4px] border border-[#f0f0f0] bg-white p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[1px] bg-[#ff5e1f]" />
            <span className="text-[18px] font-medium tracking-tight text-[#262626]">
              EmitMail
            </span>
          </div>
          <h1 className="mt-4 text-[22px] font-normal tracking-[-0.6px] text-[#262626]">
            Sign in to Console
          </h1>
          <p className="mt-1 text-[13px] text-[#595959]">
            Self-hosted email deliverability dashboard
          </p>
        </div>

        {state?.error && (
          <div
            id="login-error-message"
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-[2px] border border-[#fee2e2] bg-[#fef2f2] p-3 text-[13px] text-[#991b1b]"
          >
            <WarningCircle size={16} weight="bold" className="flex-shrink-0" aria-hidden="true" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-[12px] font-medium uppercase tracking-wider text-[#595959]"
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
              className="mt-1 block h-10 sm:h-9 w-full rounded-[2px] border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#262626] transition-colors focus:border-[#ff5e1f] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[12px] font-medium uppercase tracking-wider text-[#595959]"
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
              className="mt-1 block h-10 sm:h-9 w-full rounded-[2px] border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#262626] transition-colors focus:border-[#ff5e1f] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 flex h-10 sm:h-9 w-full items-center justify-center rounded-[2px] bg-[#ff5e1f] px-4 text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#ff7038] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Authenticating..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#f0f0f0] pt-4 text-center text-[11px] text-[#595959]">
          Default credentials: <code className="font-mono text-[#262626]">admin</code> /{" "}
          <code className="font-mono text-[#262626]">emitmail</code>
        </div>
      </div>
    </div>
  );
}
