import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import RegisterAccount from '@/ui/components/auth/register-account';
import { AuthSplitLayout } from '@/ui/components/auth/auth-split-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('title_01'), description: t('description_01') };
}

export default async function RegisterPage() {
  return (
    <AuthSplitLayout
      footer={
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} Collasco. All rights reserved.
        </p>
      }
    >
      <RegisterAccount />
    </AuthSplitLayout>
  );
}
