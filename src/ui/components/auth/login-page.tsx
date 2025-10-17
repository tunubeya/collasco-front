'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/form/input';
import { authenticate } from '@/lib/actions';
import { toast } from 'sonner';
import { RoutesEnum } from '@/lib/utils';

export default function LoginPageClient() {
  const t = useTranslations('auth.login');
  const [state, action, pending] = useActionState(authenticate, undefined);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(t('toast.success'), {
        onAutoClose: () => router.push(RoutesEnum.APP_ROOT),
        onDismiss: () => router.push(RoutesEnum.APP_ROOT),
        duration: 900,
      });
    } else {
      toast.error(state.error);
    }
  }, [state, router, t]);

  // (Opcional) si ya no hay subdominios tipo Tunubeya, podemos quitar esto.
  // Lo dejo comentado por si luego lo necesitas.
  // useEffect(() => {
  //   const host = window.location.hostname;
  //   if (host !== 'myflowcheck.com' && host.endsWith('.myflowcheck.com')) {
  //     localStorage.setItem('returnToSubdomain', window.location.origin);
  //   }
  // }, []);

  const fields = [
    { name: 'email', label: t('emailLabel'), placeholder: t('emailPlaceholder'), type: 'email' },
    { name: 'password', label: t('passwordLabel'), placeholder: t('passwordPlaceholder'), type: 'password' },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-64px)] w-full
                    bg-gradient-to-br from-surface to-primary/10
                    flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-surface border border-[color:var(--color-border)]
                        shadow-sm rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--color-foreground)]">
              {t('title_01')}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">
              {t('description_01')}
            </p>
          </div>

          {/* Form */}
          <form action={action} className="flex flex-col gap-5">
            {fields.map(f => (
              <Input
                key={f.name}
                name={f.name}
                label={f.label}
                type={f.type}
                placeholder={f.placeholder}
              />
            ))}

            <div className="flex items-center justify-between text-sm">
              <Link href={RoutesEnum.FORGOT_PASSWORD} className="underline text-primary hover:opacity-90">
                {t('recover')}
              </Link>
            </div>

            <Button type="submit" disabled={pending} className="w-full bg-primary text-[color:var(--color-primary-foreground)] hover:opacity-90">
              {pending ? t('loading') ?? 'Signing in…' : t('loginButton')}
            </Button>
          </form>

          {/* Divider (sin Google) */}
          {/* Si más adelante reactivas Google, aquí reinsertas el botón */}
          {/* <div className="mt-6">
              <GoogleLoginButton redirectUrl={RoutesEnum.LOGGED_OPTIONS} />
            </div> */}

          {/* Footer links */}
          <p className="mt-6 text-center text-sm text-[color:var(--color-muted-fg)]">
            {t('alreadyAccount')}{' '}
            <Link href={RoutesEnum.REGISTER} className="underline text-primary hover:opacity-90">
              {t('createAccount')}
            </Link>
          </p>
        </div>

        {/* Mini disclaimer/brand */}
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} MyFlowCheck. All rights reserved.
        </p>
      </div>
    </div>
  );
}
