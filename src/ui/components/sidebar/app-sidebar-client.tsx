'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, FileText, FolderTree, HelpCircle, Home, Settings, ShieldCheck } from 'lucide-react';

import LogoutButton from '@/ui/components/auth/logout-button';
import { cn } from '@/lib/utils';
import { useUnreadNotificationsCount } from '@/ui/components/notifications/use-unread-notifications-count';

export type AppSidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: 'home' | 'projects' | 'tickets' | 'notifications' | 'settings' | 'admin' | 'support';
};

export default function AppSidebarClient({
  items,
  footerOnly = false,
  footerExtra,
  token = null,
}: {
  items?: AppSidebarItem[];
  footerOnly?: boolean;
  footerExtra?: ReactNode;
  token?: string | null;
}) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadNotificationsCount(token);
  const hasUnreadNotifications = unreadCount > 0;
  const unreadBadgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  const IconMap = {
    home: Home,
    projects: FolderTree,
    tickets: FileText,
    notifications: Bell,
    settings: Settings,
    admin: ShieldCheck,
    support: HelpCircle,
  } as const;

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
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
              active
                ? 'bg-primary/15 text-[color:var(--color-foreground)] border-r-2 border-primary'
                : 'text-[color:var(--color-muted-fg)] hover:bg-[color:var(--color-cream-100)]',
            )}
          >
            <Icon size={18} className={active ? '' : 'opacity-80'} />
            <span className={cn('min-w-0 flex-1 truncate', active && 'font-medium')}>
              {item.label}
            </span>
            {item.key === 'notifications' && hasUnreadNotifications ? (
              <span
                className={cn(
                  'ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-red-500 text-white'
                )}
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadBadgeText}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
