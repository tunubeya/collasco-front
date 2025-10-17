import type { Metadata } from 'next';
import './globals.css';
import { plusJakartaSans } from '@/ui/fonts/fonts';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import LangSelector from '@/ui/components/i18n/lang-selector';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  return {
    title: t('root.title'),
    description: t('root.description'),
    icons: {
      icon: '/logos/isotipo-myflowcheck.svg',
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster richColors />
        <div className='relative'>
          <div className='fixed bottom-8 right-8 z-0'>
            <LangSelector />
          </div>
        </div>
      </body>
    </html>
  );
}
