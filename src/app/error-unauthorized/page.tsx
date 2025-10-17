'use client';
import { useEffect } from 'react';
import { Siren } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RoutesEnum } from '@/lib/utils';
import { logout } from '@/lib/actions';
import { useTranslations } from 'next-intl';

export default function ErrorUnauthorizedPage() {
  const router = useRouter();
  const t = useTranslations('error-pages.error-unauthorized');
  
  useEffect(() => {
    // logout and redirect in 1 seconds
    logout()
      .then(() => {
        setTimeout(() => {
          router.push(RoutesEnum.LOGIN);
        }, 1000);
      })
      .catch((error) => {
        console.error('Error during logout:', error);
      });
  }, []);

  return (
    <div className="w-full min-h-dvh bg-linear-to-r from-background to-light-orange flex p-8 md:p-24 justify-around items-center">
      <div className="flex flex-col gap-8 justify-center items-center max-w-[630px]">
        <Siren size={100} className="text-secondary-blue" />
        <h2 className="text-4xl font-bold">{t('title')}</h2>
        <p className="text-lg text-center">{t('description')}</p>
      </div>
    </div>
  );
}
