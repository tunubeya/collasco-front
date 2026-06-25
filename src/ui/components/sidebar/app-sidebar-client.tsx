'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, FileText, FolderTree, HelpCircle, Settings, ShieldCheck } from 'lucide-react';

import LogoutButton from '@/ui/components/auth/logout-button';
import { cn } from '@/lib/utils';
import { getTicketCounts } from '@/lib/api/tickets';
import { addTicketCountsChangedListener } from '@/ui/components/tickets/ticket-count-events';

export type AppSidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: 'projects' | 'tickets' | 'notifications' | 'settings' | 'admin' | 'support';
};

export default function AppSidebarClient({
  items,
  footerOnly = false,
  footerExtra,
  token = null,
  collapsed = false,
}: {
  items?: AppSidebarItem[];
  footerOnly?: boolean;
  footerExtra?: ReactNode;
  token?: string | null;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const [assignedTicketsCount, setAssignedTicketsCount] = useState(0);

  const loadAssignedTicketsCount = useCallback(async () => {
    if (!token) {
      setAssignedTicketsCount(0);
      return;
    }

    try {
      const result = await getTicketCounts(token);
      setAssignedTicketsCount(Math.max(0, result.counts.assigned ?? 0));
    } catch {
      setAssignedTicketsCount(0);
    }
  }, [token]);

  useEffect(() => {
    void loadAssignedTicketsCount();
  }, [loadAssignedTicketsCount]);

  useEffect(() => {
    if (!token) return;
    return addTicketCountsChangedListener(() => {
      void loadAssignedTicketsCount();
    });
  }, [loadAssignedTicketsCount, token]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      void loadAssignedTicketsCount();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [loadAssignedTicketsCount, token]);

  const IconMap = {
    projects: FolderTree,
    tickets: FileText,
    notifications: Bell,
    settings: Settings,
    admin: ShieldCheck,
    support: HelpCircle,
  } as const;

  if (footerOnly) {
    return (
      <div className={cn('mt-auto', collapsed ? 'px-0' : 'px-2')}>
        <div
          className={cn(
            'flex w-full items-center rounded-md text-sm text-[color:var(--color-foreground)]',
            collapsed ? 'justify-center py-2' : 'justify-between gap-2 px-2 py-2',
          )}
        >
          <LogoutButton iconOnly={collapsed} />
          {!collapsed ? footerExtra : null}
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
        const showTicketsBadge =
          item.key === 'tickets' && assignedTicketsCount > 0;
        const ticketsBadgeText =
          assignedTicketsCount > 99 ? '99+' : String(assignedTicketsCount);

        return (
          <Link
            key={item.key}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              'relative flex items-center rounded-md text-sm transition-colors',
              collapsed ? 'h-10 justify-center px-0' : 'gap-3 px-2 py-2',
              active
                ? 'bg-primary/15 text-[color:var(--color-foreground)] border-r-2 border-primary'
                : 'text-[color:var(--color-muted-fg)] hover:bg-[color:var(--color-cream-100)]',
            )}
          >
            <Icon size={18} className={cn('shrink-0', active ? '' : 'opacity-80')} />
            {!collapsed ? (
              <span className={cn('min-w-0 flex-1 truncate', active && 'font-medium')}>
                {item.label}
              </span>
            ) : null}
            {showTicketsBadge ? (
              <span
                className={cn(
                  'ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  collapsed && 'absolute right-1 top-1 ml-0 min-w-4 px-1',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-red-500 text-white'
                )}
                aria-label={`${assignedTicketsCount} tickets assigned to me`}
              >
                {ticketsBadgeText}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
