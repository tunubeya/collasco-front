'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Input } from '@/ui/components/form/input';
import { Button } from '@/ui/components/button';
import { recoverPassword } from '@/lib/actions';

export default function ForgotPasswordClient() {
  const t = useTranslations('auth.forgot-password');
  const [mailSent, setMailSent] = useState(false);
  const [state, action, pending] = useActionState(recoverPassword, undefined);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(t('toast.success'));
      setMailSent(true);
    } else {
      // Muestra error genérico o específico si tu acción lo envía
      toast.error(state.error ?? t('toast.error'));
    }
  }, [state, t]);

  return (
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

      <form action={action} className="flex flex-col gap-5 max-w-sm mx-auto">
        <Input
          name="email"
          type="email"
          label={t('emailPlaceholder') ?? 'Email'}
          placeholder={t('emailPlaceholder')}
          disabled={mailSent}
        />

        <Button
          type="submit"
          className="w-full bg-primary text-[color:var(--color-primary-foreground)] hover:opacity-90"
          disabled={pending || mailSent}
        >
          {mailSent ? t('recoverButtonSent') : t('recoverButton')}
        </Button>

        {/* Hint post-envío */}
        {mailSent && (
          <p className="text-xs text-center text-[color:var(--color-muted-fg)]">
            {t('afterSendHint') ?? 'If an account exists for that email, you will receive a reset link shortly.'}
          </p>
        )}
      </form>
    </div>
  );
}
