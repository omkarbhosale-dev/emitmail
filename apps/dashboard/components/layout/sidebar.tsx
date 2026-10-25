import { SidebarNavLink } from "./sidebar-nav-link";
import { UserMenu } from "./user-menu";
import type { UserProfile } from "@/lib/api/types";
import {
  House,
  Globe,
  Key,
  WebhooksLogo,
  Gear,
} from "@phosphor-icons/react/dist/ssr";

interface SidebarProps {
  user: UserProfile | null;
  version?: string;
}

export function Sidebar({ user, version = "1.0.0" }: SidebarProps) {
  return (
    <aside className="flex h-full w-[256px] flex-shrink-0 flex-col border-r border-[#e5e5e5] bg-[#f0f0f0]">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] bg-white px-5">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-[2px] bg-[#ff5e1f]" aria-hidden="true" />
          <span className="text-brand text-[#262626]">
            EmitMail
          </span>
        </div>
        <span className="rounded-[9999px] bg-[#ecfdf5] px-2 py-0.5 text-meta font-medium text-[#065f46]">
          ESP
        </span>
      </div>

      {/* Nav List */}
      <nav aria-label="Primary" className="flex-1 space-y-1 py-4">
        <SidebarNavLink href="/" label="Overview" icon={<House size={20} />} />
        <SidebarNavLink href="/domains" label="Domains" icon={<Globe size={20} />} />
        <SidebarNavLink href="/api-keys" label="API Keys" icon={<Key size={20} />} />
        <SidebarNavLink href="/webhooks" label="Webhooks" icon={<WebhooksLogo size={20} />} />

        <div className="!my-3 border-t border-[#d4d4d4]" />

        <SidebarNavLink href="/settings" label="Settings" icon={<Gear size={20} />} />
      </nav>

      {/* Footer User & Version */}
      <div className="border-t border-[#d4d4d4] p-3">
        <UserMenu user={user} />
        <div className="mt-2 flex items-center justify-between px-2 text-meta text-[#595959]">
          <span>Engine v{version}</span>
          <span>Self-Hosted</span>
        </div>
      </div>
    </aside>
  );
}
