import Link from 'next/link';
import { RoutesEnum } from '@/lib/utils';
import { FileX2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('error-pages.not-found');
  return (
    <div className="w-full min-h-dvh bg-linear-to-r from-background to-light-orange flex p-8 md:p-24 justify-around items-center">
      <div className="flex flex-col gap-8 justify-center items-center max-w-[630px]">
        <FileX2 size={100} className="text-secondary-blue" />
        <h2 className="text-4xl font-bold">{t('title')}</h2>
        <p>{t('description')}</p>
        <Link
          className="text-lg font-medium hover:underline"
          href={RoutesEnum.HOME_LANDING}
        >
          {t('button')}
        </Link>
      </div>
    </div>
  );
}
