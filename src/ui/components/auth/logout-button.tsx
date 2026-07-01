'use client';
import { Button } from '@/ui/components/button';
import { logout } from '@/lib/actions';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const t = useTranslations('auth.login');
  const label = t('logout');
  return (
    <form action={logout} className='mt-4 md:mt-0'>
      <Button
        size={iconOnly ? 'icon' : 'default'}
        type="submit"
        className="border border-blue-200 bg-white text-[color:var(--color-muted-fg)] hover:bg-blue-100 hover:text-[color:var(--color-foreground)]"
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
      >
        <LogOut className="h-5 w-5" />
        {!iconOnly ? label : null}
      </Button>
    </form>
  );
}
