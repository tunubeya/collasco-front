import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ResetPasswordForm from '@/ui/components/auth/reset-password-form';
import { RoutesEnum } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { AuthSplitLayout } from '@/ui/components/auth/auth-split-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.reset-password');
  return { title: t('title'), description: t('description') };
}

// ✅ Usa Promise en searchParams (coincide con tu PageProps global)
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] | undefined }>;
}) {
  const t = await getTranslations('auth.reset-password');

  // Desempaqueta y normaliza el token
  const { token } = await searchParams;
  const tokenStr =
    typeof token === 'string' ? token : Array.isArray(token) ? token[0] : '';

  if (!tokenStr) redirect(RoutesEnum.APP_ROOT);

  return (
    <AuthSplitLayout
      footer={
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} Collasco. All rights reserved.
        </p>
      }
    >
      <div className="mb-7 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">
          {t('description')}
        </p>
      </div>

      <ResetPasswordForm token={tokenStr} />
    </AuthSplitLayout>
  );
}
