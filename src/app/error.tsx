'use client';
import { useEffect } from 'react';
import { OctagonAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ErrorPage({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const t = useTranslations('error-pages.error');
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-full min-h-dvh bg-linear-to-r from-background to-light-orange flex p-8 md:p-24 justify-around items-center">
      <div className="flex flex-col gap-8 justify-center items-center max-w-[630px]">
        <OctagonAlert size={100} className="text-secondary-blue" />
        <h2 className="text-4xl font-bold">{t('title')}</h2>
        <button className="text-lg font-medium hover:underline" onClick={reset}>
          {t('button')}
        </button>
      </div>
    </div>
  );
}
