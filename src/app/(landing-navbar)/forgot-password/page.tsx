import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ForgotPasswordClient from '@/ui/components/auth/forgot-password-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.forgot-password');
  return { title: t('title'), description: t('description') };
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full
                    bg-gradient-to-br from-surface to-primary/10
                    flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <ForgotPasswordClient />
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} MyFlowCheck. All rights reserved.
        </p>
      </div>
    </div>
  );
}
