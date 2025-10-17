import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SupportPageClient from '@/ui/components/support/support-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('support');
  return { title: t('metadata_title'), description: t('description') };
}

export default async function SupportPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full
                    bg-gradient-to-br from-surface to-primary/10
                    flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <SupportPageClient />
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} MyFlowCheck. All rights reserved.
        </p>
      </div>
    </div>
  );
}
