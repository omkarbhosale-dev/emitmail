import { MobileNav } from "./mobile-nav";
import type { UserProfile, SystemHealth } from "@/lib/api/types";

interface AppHeaderProps {
  user: UserProfile | null;
  health: SystemHealth | null;
  version?: string;
}

export function AppHeader({ user, health, version }: AppHeaderProps) {
  const isHealthy = health?.status === "healthy";

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#e5e5e5] bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav user={user} version={version} />
        <span className="text-support font-medium text-[#262626]">
          EmitMail Cloud Console
        </span>
      </div>

      <div className="flex items-center gap-3">
        {health && (
          <div className="flex h-8 items-center gap-2 rounded-[9999px] border border-[#e5e5e5] px-3 text-meta">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isHealthy ? "bg-[#059669]" : "bg-[#dc2626]"
              }`}
              aria-hidden="true"
            />
            <span className="font-medium text-[#262626]">
              {isHealthy ? "Cluster Healthy" : "Degraded"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
