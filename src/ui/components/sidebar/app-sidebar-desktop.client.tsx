'use client';

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';

import NotificationsBell from '@/ui/components/notifications/notifications-bell.client';
import { cn } from '@/lib/utils';
import AppSidebarClient, { type AppSidebarItem } from './app-sidebar-client';

const EXPANDED_WIDTH = '16rem';
const COLLAPSED_WIDTH = '5rem';
const STORAGE_KEY = 'qms-sidebar-collapsed';

type AppSidebarDesktopClientProps = {
  items: AppSidebarItem[];
  token: string | null;
  displayInitial: string;
  displayName: string;
  displayEmail: string;
  footerExtra: ReactNode;
  collapseLabel: string;
  expandLabel: string;
};

export default function AppSidebarDesktopClient({
  items,
  token,
  displayInitial,
  displayName,
  displayEmail,
  footerExtra,
  collapseLabel,
  expandLabel,
}: AppSidebarDesktopClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === 'true') {
      setCollapsed(true);
    }
    setHasLoadedPreference(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreference) return;

    document.documentElement.style.setProperty(
      '--app-sidebar-width',
      collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    );
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed, hasLoadedPreference]);

  const toggleLabel = collapsed ? expandLabel : collapseLabel;

  function handleSidebarClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const interactiveTarget = target.closest(
      'a, button, input, select, textarea, [role="button"], [role="menuitem"]',
    );
    if (interactiveTarget) return;

    setCollapsed((current) => !current);
  }

  return (
    <aside
      className={cn(
        'hidden md:flex fixed top-0 left-0 bottom-0 z-40 cursor-pointer flex-col justify-between bg-white border-r border-[color:#AEC8FF] py-10 transition-[width,padding] duration-200',
        collapsed ? 'w-20 px-3' : 'w-64 px-4',
      )}
      aria-label={toggleLabel}
      title={toggleLabel}
      onClick={handleSidebarClick}
    >
      <div
        className={cn(
          'flex gap-3 px-2 pb-4',
          collapsed
            ? 'flex-col items-center'
            : 'items-center justify-between',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-3',
            collapsed && 'justify-center',
          )}
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex shrink-0 items-center justify-center text-[color:var(--color-foreground)] font-semibold">
            {displayInitial}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              {displayEmail ? (
                <p className="text-xs text-[color:var(--color-muted-fg)] truncate">
                  {displayEmail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-2',
            collapsed && 'flex-col',
          )}
        >
          <NotificationsBell
            token={token}
            placement="right-start"
            contentClassName="ml-2"
          />
        </div>
      </div>

      <AppSidebarClient items={items} token={token} collapsed={collapsed} />

      <AppSidebarClient
        footerOnly
        footerExtra={footerExtra}
        collapsed={collapsed}
      />
    </aside>
  );
}
