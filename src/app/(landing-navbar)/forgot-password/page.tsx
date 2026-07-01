import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ForgotPasswordClient from '@/ui/components/auth/forgot-password-page';
import { AuthSplitLayout } from '@/ui/components/auth/auth-split-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.forgot-password');
  return { title: t('title'), description: t('description') };
}

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout
      footer={
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} Collasco. All rights reserved.
        </p>
      }
    >
      <ForgotPasswordClient />
    </AuthSplitLayout>
  );
}
