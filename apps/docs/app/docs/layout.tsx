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
          <div className="flex items-center select-none py-1.5">
            <span className="font-logo font-black tracking-tight text-2xl sm:text-3xl text-[#FF6600] leading-none">
              emitmail
            </span>
          </div>
        ),
      }}
      githubUrl="https://github.com/omkarbhosale-dev/emitmail"
    >
      {children}
    </DocsLayout>
  );
}
