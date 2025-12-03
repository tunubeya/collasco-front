'use client';

import { useTranslations } from 'next-intl';
import { useState, type ChangeEvent, type FormEvent } from 'react';

const betaEmail = process.env.NEXT_PUBLIC_BETA_EMAIL ?? 'info@collasco.com';

type BetaFormState = {
  name: string;
  email: string;
  organization: string;
  challenges: string;
};

const initialState: BetaFormState = {
  name: '',
  email: '',
  organization: '',
  challenges: ''
};

export default function BetaProgramForm() {
  const [formState, setFormState] = useState<BetaFormState>(initialState);
  const t = useTranslations('landing.betaForm');
  const cta = useTranslations('landing.cta');

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof BetaFormState
  ) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = t('emailSubject');
    const body = [
      `${t('nameLabel')}: ${formState.name}`,
      `${t('emailLabel')}: ${formState.email}`,
      `${t('organizationLabel')}: ${formState.organization}`,
      `${t('challengesLabel')}: ${formState.challenges}`
    ]
      .filter((line) => line.trim().length > 0)
      .join('\n');

    const mailtoLink = `mailto:${betaEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[color:var(--color-border)] bg-background/70 p-6 shadow-sm"
    >
      <label className="block text-sm font-medium">
        {t('nameLabel')}
        <input
          type="text"
          name="name"
          value={formState.name}
          onChange={(event) => handleChange(event, 'name')}
          className="mt-2 w-full rounded-xl border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-primary"
          placeholder={t('namePlaceholder')}
        />
      </label>
      <label className="block text-sm font-medium">
        {t('emailLabel')}
        <input
          type="email"
          name="email"
          value={formState.email}
          onChange={(event) => handleChange(event, 'email')}
          className="mt-2 w-full rounded-xl border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-primary"
          placeholder={t('emailPlaceholder')}
        />
      </label>
      <label className="block text-sm font-medium">
        {t('organizationLabel')}
        <input
          type="text"
          name="organization"
          value={formState.organization}
          onChange={(event) => handleChange(event, 'organization')}
          className="mt-2 w-full rounded-xl border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-primary"
          placeholder={t('organizationPlaceholder')}
        />
      </label>
      <label className="block text-sm font-medium">
        {t('challengesLabel')}
        <textarea
          name="challenges"
          rows={4}
          value={formState.challenges}
          onChange={(event) => handleChange(event, 'challenges')}
          className="mt-2 w-full rounded-xl border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-primary"
          placeholder={t('challengesPlaceholder')}
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-[color:var(--color-primary-foreground)] transition hover:-translate-y-0.5"
      >
        {cta('joinBeta')}
      </button>
    </form>
  );
}
