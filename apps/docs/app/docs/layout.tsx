import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  const logo = (
    <div className="flex items-center select-none py-1.5">
      <span
        className="font-logo font-black tracking-tight leading-none text-2xl sm:text-3xl"
        style={{
          color: '#FF6600',
          fill: '#FF6600',
          WebkitTextFillColor: '#FF6600',
          fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, sans-serif',
          fontWeight: 900,
          fontSize: '1.875rem',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        emitmail
      </span>
    </div>
  );

  return (
    <DocsLayout
      tree={source.pageTree}
      searchToggle={{
        enabled: false,
      }}
      nav={{
        title: logo,
      }}
      sidebar={{
        banner: logo,
      }}
      githubUrl="https://github.com/omkarbhosale-dev/emitmail"
    >
      {children}
    </DocsLayout>
  );
}
