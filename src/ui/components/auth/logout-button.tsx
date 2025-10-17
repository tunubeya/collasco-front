'use client';
import { Button } from '@/ui/components/button';
import { logout } from '@/lib/actions';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function LogoutButton() {
  const t = useTranslations('auth.login');
  return (
    <form action={logout} className='mt-4 md:mt-0'>
      <Button variant="secondary" type="submit">
        <LogOut className="w-5 h-5 mr-2" />
        {t('logout')}
      </Button>
    </form>
  );
}