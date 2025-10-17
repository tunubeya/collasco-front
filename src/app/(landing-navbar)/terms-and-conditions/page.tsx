import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import React from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('terms-and-conditions');
  return {
    title: t('title'),
    description: t('conditions.0.description'),
  };
}

export default function TermsAndConditionsPage() {
  const t = useTranslations('terms-and-conditions');
  const conditions = [
    {
      id: '1',
      title: t('conditions.0.title'),
      description: t('conditions.0.description'),
    },
    {
      id: '2',
      title: t('conditions.1.title'),
      description: t('conditions.1.description'),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] w-full 
                    bg-gradient-to-br from-surface to-primary/10 
                    flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl bg-surface 
                      border border-[color:var(--color-border)] 
                      shadow-sm rounded-2xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-8">
          {t('title')}
        </h1>

        <div className="max-h-[70vh] overflow-y-auto space-y-6 divide-y divide-[color:var(--color-border)] pr-2">
          {conditions.map((c) => (
            <div key={c.id} className="pt-4 first:pt-0">
              <h2 className="text-xl font-semibold mb-2 text-[color:var(--color-foreground)]">
                {c.title}
              </h2>
              <div className="text-sm text-[color:var(--color-muted-fg)] leading-relaxed">
                {c.description.split('\n').map((line, index) => {
                  if (line.startsWith('* ')) {
                    return (
                      <ul key={index} className="list-disc list-inside mb-2">
                        <li>{line.slice(2)}</li>
                      </ul>
                    );
                  }
                  return (
                    <p key={index} className="mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-center text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} MyFlowCheck. All rights reserved.
        </p>
      </div>
    </div>
  );
}
