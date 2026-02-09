'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderTree, Home, Settings } from 'lucide-react';

import LogoutButton from '@/ui/components/auth/logout-button';

export type AppSidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: 'home' | 'projects' | 'settings';
};

export default function AppSidebarClient({
  items,
  footerOnly = false,
  footerExtra,
}: {
  items?: AppSidebarItem[];
  footerOnly?: boolean;
  footerExtra?: ReactNode;
}) {
  const pathname = usePathname();

  const IconMap = { home: Home, projects: FolderTree, settings: Settings } as const;

  if (footerOnly) {
    return (
      <div className="mt-auto px-2">
        <div className="w-full flex items-center justify-between gap-2 text-sm px-2 py-2 rounded-md text-[color:var(--color-foreground)]">
          <LogoutButton />
          {footerExtra}
        </div>
      </div>
    );
  }

  return (
    <nav className="flex-1 mt-2 space-y-1">
      {items!.map((item) => {
        const Icon = IconMap[item.icon];
        const active = item.href === '/app'
          ? pathname === '/app'
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.key}
            href={item.href}
            className={[
              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
              active
                ? 'bg-primary/15 text-[color:var(--color-foreground)] border-r-2 border-primary'
                : 'text-[color:var(--color-muted-fg)] hover:bg-[color:var(--color-cream-100)]',
            ].join(' ')}
          >
            <Icon size={18} className={active ? '' : 'opacity-80'} />
            <span className={active ? 'font-medium' : ''}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
