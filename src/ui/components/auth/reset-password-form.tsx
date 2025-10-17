'use client';

import { Input } from '@/ui/components/form/input';
import { Button } from '@/ui/components/button';
import { useActionState, useEffect, useRef, FormEvent, useTransition } from 'react';
import { resetPassword } from '@/lib/actions';
import type { ResetPassErrorState } from '@/lib/definitions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { RoutesEnum } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type Field = {
  name: 'password' | 'confirmPassword';
  label: string;
  placeholder: string;
  type: 'password';
  description?: string; // <- opcional para evitar el error TS
};

export default function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const t = useTranslations('auth.reset-password');
  const [isPending, startTransition] = useTransition();
  const [state, action] = useActionState(resetPassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(t('toast.success'), {
        onAutoClose: () => router.push(RoutesEnum.LOGIN),
        onDismiss: () => router.push(RoutesEnum.LOGIN),
        duration: 900,
      });
    } else {
      // muestra error específico si llega; si no, usa genérico
      toast.error(
        state.errors && (state.errors.password?.[0] || state.errors.confirmPassword?.[0])
          ? state.errors.password?.[0] || state.errors.confirmPassword?.[0]
          : t('toast.error')
      );
    }
  }, [state, router, t]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.append('token', token);
    startTransition(() => action(formData));
  }

  const fields: Field[] = [
    {
      name: 'password',
      label: t('passwordLabel'),
      placeholder: t('passwordPlaceholder'),
      type: 'password',
      description: t('passwordDescription'),
    },
    {
      name: 'confirmPassword',
      label: t('confirmPasswordLabel'),
      placeholder: t('confirmPasswordPlaceholder'),
      type: 'password',
    },
  ];

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 w-full max-w-sm mx-auto"
    >
      {fields.map((field) => {
        const errorKey = field.name as keyof ResetPassErrorState;
        return (
          <Input
            key={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            placeholder={field.placeholder}
            errorMessage={state?.errors?.[errorKey]}
            {...(field.description && { description: field.description })}
          />
        );
      })}

      <Button
        type="submit"
        className="w-full bg-primary text-[color:var(--color-primary-foreground)] hover:opacity-90"
        disabled={isPending}
      >
        {t('recoverButton')}
      </Button>
    </form>
  );
}
