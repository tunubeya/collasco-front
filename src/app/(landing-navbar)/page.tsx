import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { CheckCircle2 } from 'lucide-react';
import BetaProgramForm from '@/ui/components/landing/beta-program-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');

  return {
    title: t('metadata_title'),
    description: t('comingSoon.description')
  };
}

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
    color: 'text-blue-500',
    items: [
      { icon: '🎫', key: 'supportTickets' },
      { icon: '💬', key: 'structuredCommunication' }
    ]
  },
  {
    key: 'validateControl',
    icon: '✅',
    color: 'text-emerald-500',
    items: [
      { icon: '🧪', key: 'testingWorkflows' },
      { icon: '🔍', key: 'reviewApprovals' },
      { icon: '🔄', key: 'changeControl' }
    ]
  },
  {
    key: 'documentDeliver',
    icon: '📦',
    color: 'text-violet-500',
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
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {t('cta.tryPlatform')}
              </a>
              <Link
                href="/login"
                className="rounded-full border border-[color:var(--color-border)] px-6 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                {t('cta.joinBeta')}
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <div className="mx-auto rounded-3xl border border-primary/20 bg-background/60 p-2 shadow-2xl overflow-hidden">
              <Image
                src="/Images/Reciprocity.jpg"
                alt="Collasco Workflow"
                width={600}
                height={400}
                className="w-full h-auto rounded-2xl object-cover"
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase text-primary">{t('vision.label')}</p>
          <h2 className="text-3xl font-semibold">{t('vision.title')}</h2>
          <div className="space-y-4">
            <p className="text-lg text-[color:var(--color-muted-fg)] leading-relaxed">{t('vision.description1')}</p>
            <p className="text-lg text-[color:var(--color-muted-fg)] leading-relaxed">{t('vision.description2')}</p>
          </div>
        </div>
      </section>

{/* Differentiators */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{t('differentiators.label')}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t('differentiators.title')}</h2>
            <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">{t('differentiators.description')}</p>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-background p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-6">
                <span className="text-2xl">🐛</span>
              </div>
              <h3 className="text-lg font-semibold leading-7 tracking-tight">{t('differentiators.items.jira.tool')}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted-fg)]">{t('differentiators.items.jira.challenge')}</p>
              <div className="mt-4 flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{t('differentiators.items.jira.edge')}</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-background p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-6">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-semibold leading-7 tracking-tight">{t('differentiators.items.notion.tool')}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted-fg)]">{t('differentiators.items.notion.challenge')}</p>
              <div className="mt-4 flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{t('differentiators.items.notion.edge')}</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-background p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold leading-7 tracking-tight">{t('differentiators.items.linear.tool')}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted-fg)]">{t('differentiators.items.linear.challenge')}</p>
              <div className="mt-4 flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{t('differentiators.items.linear.edge')}</span>
              </div>
            </div>
          </div>
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
                className="group rounded-2xl border border-[color:var(--color-border)] bg-background/80 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
              >
                <div className="text-3xl transform transition-transform group-hover:scale-110">{persona.icon}</div>
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
          <p className="mt-4 text-lg text-[color:var(--color-muted-fg)] max-w-2xl mx-auto">{t('features.description')}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featureClusters.map((cluster) => (
            <div key={cluster.key} className="relative rounded-2xl border border-[color:var(--color-border)] bg-surface/30 p-6 transition-all duration-300 hover:shadow-lg">
              <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl bg-gradient-to-b ${cluster.key === 'captureAlign' ? 'from-blue-400 to-blue-600' : cluster.key === 'validateControl' ? 'from-emerald-400 to-emerald-600' : 'from-violet-400 to-violet-600'}`} />
              <div className="space-y-4">
                <div className="flex items-center gap-3 pl-3">
                  <span className="text-2xl">{cluster.icon}</span>
                  <h3 className="text-lg font-semibold">{t(`features.clusters.${cluster.key}.title`)}</h3>
                </div>
                <div className="space-y-3">
                  {cluster.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex gap-3 rounded-xl border border-[color:var(--color-border)] bg-background/50 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-background"
                    >
                      <span className="text-lg">{item.icon}</span>
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
          className="mt-8 inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-xl"
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
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-[color:var(--color-border)] bg-background/80 px-5 py-3">
              <span className="text-sm font-semibold uppercase text-[color:var(--color-muted-fg)]">
                {t('stayConnected.integrationsLabel')}{' '}
              </span>
              <span className="font-medium">{t('stayConnected.integrationsValue')}</span>
            </div>
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
