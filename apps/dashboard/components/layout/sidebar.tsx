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
    <aside className="flex h-full w-[240px] flex-shrink-0 flex-col border-r border-[#f0f0f0] bg-[#f0f0f0]">
      {/* Brand Header */}
      <div className="flex h-12 items-center justify-between border-b border-[#f0f0f0] bg-white px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[1px] bg-[#ff5e1f]" />
          <span className="text-[15px] font-medium tracking-tight text-[#262626]">
            EmitMail
          </span>
        </div>
        <span className="rounded-[9999px] bg-[#ecfdf5] px-1.5 py-0.5 text-[10px] font-medium text-[#065f46]">
          ESP
        </span>
      </div>

      {/* Nav List */}
      <nav aria-label="Primary" className="flex-1 space-y-0.5 py-3">
        <SidebarNavLink href="/" label="Overview" icon={<House size={16} />} />
        <SidebarNavLink href="/domains" label="Domains" icon={<Globe size={16} />} />
        <SidebarNavLink href="/api-keys" label="API Keys" icon={<Key size={16} />} />
        <SidebarNavLink href="/webhooks" label="Webhooks" icon={<WebhooksLogo size={16} />} />

        <div className="my-2 border-t border-[#e5e5e5]" />

        <SidebarNavLink href="/settings" label="Settings" icon={<Gear size={16} />} />
      </nav>

      {/* Footer User & Version */}
      <div className="border-t border-[#e5e5e5] p-2">
        <UserMenu user={user} />
        <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-[#595959]">
          <span>Engine v{version}</span>
          <span>Self-Hosted</span>
        </div>
      </div>
    </aside>
  );
}
