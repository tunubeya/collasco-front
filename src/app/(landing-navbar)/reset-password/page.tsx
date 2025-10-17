import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ResetPasswordForm from '@/ui/components/auth/reset-password-form';
import { RoutesEnum } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

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
    <div className="min-h-[calc(100vh-64px)] w-full
                    bg-gradient-to-br from-surface to-primary/10
                    flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-[color:var(--color-border)]
                        shadow-sm rounded-2xl p-6 md:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">
              {t('description')}
            </p>
          </div>

          <ResetPasswordForm token={tokenStr} />
        </div>

        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} MyFlowCheck. All rights reserved.
        </p>
      </div>
    </div>
  );
}
