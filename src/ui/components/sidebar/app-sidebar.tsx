// app-sidebar.tsx
import { getTranslations } from 'next-intl/server';
import AppSidebarClient, { AppSidebarItem } from './app-sidebar-client';
import ResponsiveMenu from '@/ui/components/navbar/responsive-menu';
import { getSession } from '@/lib/session';
import { fetchGetUserProfile } from '@/lib/data';
import type { User } from '@/lib/model-definitions/user';
import LangSelector from '@/ui/components/i18n/lang-selector';
import NotificationsBell from '@/ui/components/notifications/notifications-bell.client';
import { UserRole } from '@/lib/definitions';

export default async function AppSidebar() {
  const t = await getTranslations('app.sidebar');
  const session = await getSession();
  let profile: User | null = null;

  if (session?.token) {
    try {
      profile = await fetchGetUserProfile(session.token);
    } catch {
      profile = null;
    }
  }

  const items: AppSidebarItem[] = [
    { key: 'home',     label: t('home'),           href: '/app',          icon: 'home' },
    { key: 'projects', label: t('projectSection'), href: '/app/projects', icon: 'projects' },
    { key: 'tickets', label: t('tickets'), href: '/app/tickets', icon: 'tickets' },
    { key: 'notifications', label: t('notifications'), href: '/app/notifications', icon: 'notifications' },
    { key: 'settings', label: t('settingSection'), href: '/app/settings', icon: 'settings' },
    { key: 'support', label: t('support'), href: '/app/support', icon: 'support' },
  ];

  if (session?.role === UserRole.ADMIN) {
    items.push({ key: 'admin', label: t('adminPanel'), href: '/app/admin', icon: 'admin' });
  }

  const displayName =
    profile?.name?.trim() ||
    (profile?.email ? profile.email.split('@')[0] : t('menuAdmin'));
  const displayEmail = profile?.email ?? '';
  const displayInitial =
    displayName?.charAt(0).toUpperCase() ||
    (displayEmail ? displayEmail.charAt(0).toUpperCase() : 'U');

  return (
    <>
      {/* Desktop */}
      <aside className="
        hidden md:flex fixed top-0 left-0 bottom-0 w-64
        flex-col justify-between
        bg-white border-r border-[color:#AEC8FF]
        px-4 py-10
      ">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-2 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15
                            flex items-center justify-center
                            text-[color:var(--color-foreground)] font-semibold">
              {displayInitial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              {displayEmail ? (
                <p className="text-xs text-[color:var(--color-muted-fg)] truncate">
                  {displayEmail}
                </p>
              ) : null}
            </div>
          </div>
          <NotificationsBell token={session?.token ?? null} />
        </div>

        {/* Nav */}
        <AppSidebarClient items={items} />

        {/* Footer */}
        <AppSidebarClient
          footerOnly
          footerExtra={<LangSelector allowInApp />}
        />
      </aside>

      {/* Mobile Drawer trigger (usa tu ResponsiveMenu) */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <ResponsiveMenu closeButton>
          <div className="w-64 h-auto bg-white px-4 py-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-2 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15
                                flex items-center justify-center
                                text-[color:var(--color-foreground)] font-semibold">
                  {displayInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  {displayEmail ? (
                    <p className="text-xs text-[color:var(--color-muted-fg)] truncate">
                      {displayEmail}
                    </p>
                  ) : null}
                </div>
              </div>
              <NotificationsBell token={session?.token ?? null} />
            </div>

            <AppSidebarClient items={items} />
            <div className="mt-3 space-y-3">
              <LangSelector allowInApp />
              <AppSidebarClient footerOnly />
            </div>
          </div>
        </ResponsiveMenu>
      </div>
    </>
  );
}
