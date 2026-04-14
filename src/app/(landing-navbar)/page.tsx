import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import BetaProgramForm from '@/ui/components/landing/beta-program-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');

  return {
    title: t('metadata_title'),
    description: t('comingSoon.description')
  };
}

const heroNodeKeys = ['team', 'qa', 'design', 'customer', 'release', 'feedback'] as const;

const personas = [
  { icon: '🧩', key: 'productManagers' },
  { icon: '💻', key: 'developers' },
  { icon: '🤝', key: 'customers' },
  { icon: '🧾', key: 'qualityTeams' }
] as const;

const featureClusters = [
  {
    key: 'captureAlign',
    icon: '📥',
    items: [
      { icon: '🎫', key: 'supportTickets' },
      { icon: '💬', key: 'structuredCommunication' }
    ]
  },
  {
    key: 'validateControl',
    icon: '✅',
    items: [
      { icon: '🧪', key: 'testingWorkflows' },
      { icon: '🔍', key: 'reviewApprovals' },
      { icon: '🔄', key: 'changeControl' }
    ]
  },
  {
    key: 'documentDeliver',
    icon: '📦',
    items: [
      { icon: '🧾', key: 'versionDocs' },
      { icon: '📘', key: 'manuals' },
      { icon: '🤖', key: 'aiSupport' }
    ]
  }
] as const;

export default async function LandingPage() {
  const t = await getTranslations('landing');
  const scheduleMeetingUrl =
    process.env.NEXT_PUBLIC_SCHEDULE_MEETING_URL ??
    `mailto:daniel@orderflow.be?subject=${encodeURIComponent(
      t('cta.scheduleEmailSubject')
    )}&body=${encodeURIComponent(t('cta.scheduleEmailBody'))}`;

  return (
    <main className="flex-1 bg-background text-[color:var(--color-foreground)]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-primary-soft)]/40">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-background opacity-80" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 md:flex-row md:items-center md:py-28">
          <div className="flex-1 space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              {t('hero.tagline')}
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{t('hero.title')}</h1>
            <p className="text-lg text-[color:var(--color-muted-fg)] md:text-xl">
              {t('hero.description')}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={scheduleMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-lg shadow-primary/30 transition hover:-translate-y-0.5"
              >
                {t('cta.tryPlatform')}
              </a>
              <Link
                href="/login"
                className="rounded-full border border-[color:var(--color-border)] px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                {t('cta.joinBeta')}
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <div className="mx-auto grid max-w-lg grid-cols-3 gap-6 rounded-3xl border border-primary/20 bg-background/60 p-10 shadow-2xl">
              {heroNodeKeys.map((labelKey) => (
                <div key={labelKey} className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),_transparent)] p-2 text-sm font-semibold">
                    {t(`hero.nodes.${labelKey}`)}
                  </div>
                  <span className="text-xs text-[color:var(--color-muted-fg)]">{t('hero.nodeLabel')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase text-primary">{t('vision.label')}</p>
          <h2 className="text-3xl font-semibold">{t('vision.title')}</h2>
          <p className="text-lg text-[color:var(--color-muted-fg)]">{t('vision.description1')}</p>
          <p className="text-lg text-[color:var(--color-muted-fg)]">{t('vision.description2')}</p>
        </div>
      </section>

      {/* Personas */}
      <section className="bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase text-primary">{t('personas.label')}</p>
            <h2 className="text-3xl font-semibold">{t('personas.title')}</h2>
            <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">{t('personas.description')}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {personas.map((persona) => (
              <div
                key={persona.key}
                className="rounded-2xl border border-[color:var(--color-border)] bg-background/80 p-6 shadow-sm"
              >
                <div className="text-3xl">{persona.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{t(`personas.items.${persona.key}.title`)}</h3>
                <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">
                  {t(`personas.items.${persona.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase text-primary">{t('features.label')}</p>
          <h2 className="text-3xl font-semibold">{t('features.title')}</h2>
          <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">{t('features.description')}</p>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {featureClusters.map((cluster) => (
            <div key={cluster.key} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cluster.icon}</span>
                <h3 className="text-lg font-semibold">{t(`features.clusters.${cluster.key}.title`)}</h3>
              </div>
              <div className="space-y-3">
                {cluster.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex gap-3 rounded-xl border border-[color:var(--color-border)] bg-surface/50 p-4"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <h4 className="font-semibold">{t(`features.clusters.${cluster.key}.items.${item.key}.title`)}</h4>
                      <p className="text-sm text-[color:var(--color-muted-fg)]">
                        {t(`features.clusters.${cluster.key}.items.${item.key}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Promise */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center md:py-20">
        <p className="text-sm font-semibold uppercase text-primary">{t('promise.label')}</p>
        <h2 className="mt-4 text-3xl font-semibold">{t('promise.title')}</h2>
        <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">{t('promise.description')}</p>
        <a
          href={scheduleMeetingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-lg shadow-primary/30 transition hover:-translate-y-0.5"
        >
          {t('cta.becomeEarlyAdopter')}
        </a>
      </section>

      {/* Stay connected */}
      <section className="bg-surface py-16 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">{t('stayConnected.label')}</p>
            <h2 className="mt-4 text-3xl font-semibold">{t('stayConnected.title')}</h2>
            <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">{t('stayConnected.description')}</p>
            <p className="mt-6 font-semibold">
              {t('stayConnected.integrationsLabel')}{' '}
              <span className="font-normal">{t('stayConnected.integrationsValue')}</span>
            </p>
          </div>
          <BetaProgramForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--color-border)] bg-background px-6 py-10 text-center text-sm text-[color:var(--color-muted-fg)]">
        <p>{t('footer.copyright')}</p>
        <p className="mt-2">
          {t('footer.contactLabel')}{' '}
          <a href="mailto:daniel@orderflow.be" className="underline">
            daniel@orderflow.be
          </a>
        </p>
      </footer>
    </main>
  );
}
