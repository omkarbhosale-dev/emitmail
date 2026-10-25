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
    <header className="flex h-12 w-full items-center justify-between border-b border-[#f0f0f0] bg-white px-4">
      <div className="flex items-center gap-2">
        <MobileNav user={user} version={version} />
        <span className="text-[13px] font-medium text-[#262626]">
          EmitMail Cloud Console
        </span>
      </div>

      <div className="flex items-center gap-3">
        {health && (
          <div className="flex items-center gap-1.5 rounded-[9999px] border border-[#f0f0f0] px-2.5 py-1 text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy ? "bg-[#059669]" : "bg-[#dc2626]"
              }`}
            />
            <span className="text-[#595959]">
              {isHealthy ? "Cluster Healthy" : "Degraded"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
