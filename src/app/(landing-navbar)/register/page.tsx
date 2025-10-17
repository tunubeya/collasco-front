import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import RegisterAccount from '@/ui/components/auth/register-account';
import { getSession } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('title_01'), description: t('description_01') };
}

export default async function RegisterPage() {
  const session = await getSession();
  return (
    <div className="min-h-[calc(100vh-64px)] w-full
                    bg-gradient-to-br from-surface to-primary/10
                    flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <RegisterAccount session={session} />
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} MyFlowCheck. All rights reserved.
        </p>
      </div>
    </div>
  );
}
