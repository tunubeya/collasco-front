'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/ui/components/form/input';
import { Textarea } from '@/ui/components/form/textarea';
import { Button } from '@/ui/components/button';

const WHATSAPP_NUMBER = '59177485774';
const SUPPORT_EMAIL = 'daniel@orderflow.com';

export default function SupportPageClient() {
  const t = useTranslations('support');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const subjectMax = 80;
  const descMax = 1000;

  const isValid = useMemo(
    () => subject.trim().length > 2 && description.trim().length > 10,
    [subject, description],
  );

  const buildMessage = () => {
    const header = `MyFlowCheck • Support`;
    const lines = [
      header,
      `Subject: ${subject.trim()}`,
      '',
      description.trim(),
    ];
    return encodeURIComponent(lines.join('\n'));
  };

  const handleWhatsApp = () => {
    const message = buildMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    const message = decodeURIComponent(buildMessage()); // para mailto sin doble encode
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `Support • ${subject.trim()}`,
    )}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
  };

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

      <div className="flex flex-col gap-5 max-w-sm mx-auto">
        <div>
          <Input
            name="subject"
            type="text"
            label={t('subjectPlaceholder') ?? 'Subject'}
            placeholder={t('subjectPlaceholder')}
            value={subject}
            maxLength={subjectMax}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-[color:var(--color-muted-fg)] text-right">
            {subject.length}/{subjectMax}
          </p>
        </div>

        <div>
          <Textarea
            name="description"
            label={t('descriptionPlaceholder') ?? 'Description'}
            placeholder={t('descriptionPlaceholder')}
            value={description}
            maxLength={descMax}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
          />
          <p className="mt-1 text-[10px] text-[color:var(--color-muted-fg)] text-right">
            {description.length}/{descMax}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            className="w-full bg-primary text-[color:var(--color-primary-foreground)] hover:opacity-90"
            onClick={handleWhatsApp}
            disabled={!isValid}
          >
            {t('sendButton') /* Enviar por WhatsApp */}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border border-[color:var(--color-border)] hover:opacity-90"
            onClick={handleEmail}
            disabled={!isValid}
          >
            {t('sendEmail') ?? 'Send by Email'}
          </Button>
        </div>

        <p className="text-[10px] text-center text-[color:var(--color-muted-fg)] mt-2">
          {t('metadata_title') ??
            'We use this information only to assist you and improve our service.'}
        </p>
      </div>
    </div>
  );
}
