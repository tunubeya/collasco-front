// ui/components/auth/register-account.tsx
'use client';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/form/input';
import Link from 'next/link';
import { Checkbox } from '@/ui/components/form/checkbox';
import { signup } from '@/lib/actions';
import { useActionState, useState, useEffect, useRef, FormEvent, useTransition } from 'react';
import { toast } from 'sonner';
import type { SignUpErrorState, Session } from '@/lib/definitions';
import { useRouter } from 'next/navigation';
import { RoutesEnum } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type Field = {
  name: 'email' | 'password' | 'confirmPassword';
  label: string;
  placeholder: string;
  type: 'email' | 'password';
  description?: string;
};

export default function RegisterAccount({ session }: Readonly<{ session: Session | null }>) {
  const t = useTranslations('auth.register');
  const [isPending, startTransition] = useTransition();
  const [state, action] = useActionState(signup, undefined);
  const [checkbox, setCheckbox] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      // 🔁 Sin confirmación: login directo → HOME
      toast.success(t('toast.success'), {
        onAutoClose: () => router.push(RoutesEnum.APP_ROOT),
        onDismiss: () => router.push(RoutesEnum.APP_ROOT),
        duration: 900,
      });
    } else {
      const generic = t('toast.error');
      const firstError =
        state.errors && (Object.values(state.errors).find(Boolean) as string | undefined);
      toast.error(firstError ?? generic);
    }
  }, [state, router, t]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!checkbox) {
      toast.message(t('mustAccept') ?? 'Please accept the terms to continue.');
      return;
    }
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      startTransition(() => action(formData));
    }
  }

  const fields: Field[] = [
    { name: 'email', label: t('emailLabel'), placeholder: t('emailPlaceholder'), type: 'email' },
    {
      name: 'password',
      label: t('passwordLabel'),
      placeholder: t('passwordPlaceholder'),
      description: t('passwordDescription'),
      type: 'password',
    },
    {
      name: 'confirmPassword',
      label: t('confirmPasswordLabel'),
      placeholder: t('confirmPasswordPlaceholder'),
      type: 'password',
    },
  ];

  return (
    <div className="bg-surface border border-[color:var(--color-border)] shadow-sm rounded-2xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title_01')}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">{t('description_01')}</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
        {fields.map((f) => {
          const errorKey = f.name as keyof SignUpErrorState;
          return (
            <Input
              key={f.name}
              name={f.name}
              label={f.label}
              type={f.type}
              placeholder={f.placeholder}
              errorMessage={state?.errors?.[errorKey]}
              // ✅ ahora es opcional en el tipo
              description={f.description}
            />
          );
        })}

        <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={checkbox} setIsChecked={setCheckbox} />
            <span className="text-[color:var(--color-muted-fg)]">
              {t('acceptTerms.first')}{' '}
              <Link href={RoutesEnum.TERMS_AND_CONDITIONS} className="underline text-primary">
                {t('termsAndConditions')}
              </Link>{' '}
              {t('acceptTerms.second')}{' '}
              <Link href={RoutesEnum.PRIVACY_POLICIES} className="underline text-primary">
                {t('privacyPolicies')}
              </Link>
            </span>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-[color:var(--color-primary-foreground)] hover:opacity-90"
          disabled={isPending || !checkbox}
        >
          {isPending ? t('loading') ?? 'Creating account…' : t('registerButton')}
        </Button>

        <p className="text-center text-sm text-[color:var(--color-muted-fg)]">
          {t('haveAccount')}{' '}
          <Link href={RoutesEnum.LOGIN} className="underline text-primary">
            {t('login')}
          </Link>
        </p>
      </form>
    </div>
  );
}
