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
      githubUrl="https://github.com/emitmail/emitmail"
      links={[
        {
          text: 'Dashboard',
          url: 'http://localhost:3000',
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
