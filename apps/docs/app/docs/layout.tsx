import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      searchToggle={{
        enabled: false,
      }}
      nav={{
        title: (
          <div className="flex items-center select-none py-1">
            <span className="font-logo font-extrabold tracking-tight text-xl sm:text-2xl text-[#FF6600] leading-none">
              emitmail
            </span>
          </div>
        ),
      }}
      githubUrl="https://github.com/omkarbhosale-dev/emitmail"
      links={[
        {
          text: 'Back to Dashboard',
          url: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000',
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
