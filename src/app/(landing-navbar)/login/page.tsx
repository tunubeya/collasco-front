import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LoginPageClient from '@/ui/components/auth/login-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login');
  return { title: t('title_01'), description: t('description_01') };
}

export default async function LoginPage() {
  return <LoginPageClient />;
}
