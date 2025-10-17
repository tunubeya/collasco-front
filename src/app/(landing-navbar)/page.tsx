import type { Metadata } from 'next';
import Image from 'next/image';
import RegisterButton from '@/ui/components/auth/register-button';
import LoginButton from '@/ui/components/auth/login-button';
import { getSession } from '@/lib/session';
import { getTranslations } from 'next-intl/server';

/* ── SEO ─────────────────────────────────────────────────────────── */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');
  return {
    title: t('metadata_title'),
    description: `${t('hero.subtitle_01')} ${t('hero.subtitle_02')}`,
  };
}

/* ── UI Helpers ──────────────────────────────────────────────────── */
const HighlightedText = ({ text }: { text: string }) => (
  <span className="relative before:absolute before:inset-x-0 before:bottom-0 before:h-3 before:bg-[color:var(--color-primary-soft)] before:rounded-sm px-0.5">
    <span className="relative font-bold">{text}</span>
  </span>
);

const StepCard = ({
  step,
}: {
  step: { number: string; title: string; description: string };
}) => (
  <div className="flex flex-col items-center text-center p-6 bg-surface rounded-xl shadow-sm border border-[color:var(--color-border)]">
    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-[color:var(--color-primary-foreground)] font-bold text-xl mb-4">
      {step.number}
    </div>
    <h3 className="text-lg font-semibold text-[color:var(--color-foreground)] mb-2">
      {step.title}
    </h3>
    <p className="text-[color:var(--color-muted-fg)]">{step.description}</p>
  </div>
);

const FeatureSection = ({
  title,
  subtitle,
  children,
  image,
  reverse = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  image?: string;
  reverse?: boolean;
}) => (
  <section className="py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-6 md:px-8">
      <div
        className={`flex flex-col ${
          reverse ? 'md:flex-row-reverse' : 'md:flex-row'
        } items-center gap-12`}
      >
        <div className="w-full md:w-1/2">
          <h2 className="text-3xl md:text-4xl font-semibold text-[color:var(--color-foreground)] mb-3">
            {title}
          </h2>
          <p className="text-lg text-[color:var(--color-muted-fg)] mb-8">
            {subtitle}
          </p>
          {children}
        </div>

        <div className="w-full md:w-1/2 flex justify-center">
          <div className="w-full max-w-[560px] aspect-[7/4] bg-[color:var(--color-cream-100)] rounded-xl border border-[color:var(--color-border)] flex items-center justify-center overflow-hidden">
            {image ? (
              <Image
                src={image}
                alt="Feature"
                width={700}
                height={400}
                className="rounded-lg object-contain"
              />
            ) : (
              <div className="w-32 h-32 bg-background rounded-full border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-muted-fg)]">
                No Image
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ── Landing ─────────────────────────────────────────────────────── */
export default async function LandingPage() {
  const t = await getTranslations('landing');
  const session = await getSession();

  return (
    <div className="w-full flex-1">
      {/* HERO */}
      <div className="w-full bg-gradient-to-br from-surface to-primary/10 flex md:flex-row flex-col px-6 md:px-8 py-12 md:py-20 justify-center md:justify-between items-center gap-8">
        <div className="w-full md:w-1/2 flex flex-col gap-6 max-w-[640px]">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-[color:var(--color-foreground)]">
            <HighlightedText text={t('hero.title_01')} /> {t('hero.title_02')}{' '}
            <HighlightedText text={t('hero.title_03')} />
          </h1>
          <p className="text-[color:var(--color-muted-fg)] text-lg md:text-xl">
            <span className="block">{t('hero.subtitle_01')}</span>
            <span className="block">{t('hero.subtitle_02')}</span>
          </p>
          <div className="flex gap-3 pt-1">
            {!session?.token && <RegisterButton />}
            <LoginButton session={session} />
          </div>

          {/* Mini KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {['kpi_0', 'kpi_1', 'kpi_2'].map((k) => (
              <div
                key={k}
                className="bg-surface border border-[color:var(--color-border)] rounded-lg p-3 text-sm text-[color:var(--color-muted-fg)]"
              >
                {t(`hero.${k}`)}
              </div>
            ))}
          </div>
        </div>

        <Image
          src="/Images/grupo-de-chat.png"
          alt="MyFlowCheck dashboard preview"
          width={520}
          height={520}
          className="hidden md:block w-[520px] h-auto"
          priority
        />
      </div>

      {/* HOW IT WORKS */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-[color:var(--color-foreground)] mb-2">
              {t('how.title')}
            </h2>
            <p className="text-lg text-[color:var(--color-muted-fg)]">
              {t('how.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <StepCard
                key={i}
                step={{
                  number: t(`how.steps.${i}.number`),
                  title: t(`how.steps.${i}.title`),
                  description: t(`how.steps.${i}.description`),
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* DOCUMENT CONTROL */}
      <FeatureSection
        title={t('docs.title')}
        subtitle={t('docs.subtitle')}
        image="/Images/grafico-de-barras.png"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-[color:var(--color-foreground)]">
                {t(`docs.features.${i}`)}
              </span>
            </li>
          ))}
        </ul>
      </FeatureSection>

      {/* AUDITS & CAPA */}
      <FeatureSection
        title={t('capa.title')}
        subtitle={t('capa.subtitle')}
        reverse
        image="/Images/supervision.png"
      >
        <p className="text-[color:var(--color-foreground)] leading-relaxed mb-4">
          {t('capa.description')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-muted-fg)]"
            >
              {t(`capa.highlights.${i}`)}
            </div>
          ))}
        </div>
      </FeatureSection>

      {/* DASHBOARDS & COMPLIANCE */}
      <FeatureSection
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        image="/Images/grafico-de-lineas.png"
      >
        <p className="text-[color:var(--color-foreground)] leading-relaxed mb-6">
          {t('dash.description')}
        </p>
        <div className="bg-[color:var(--color-cream-100)] border border-[color:var(--color-border)] p-5 rounded-xl">
          <h4 className="font-semibold text-[color:var(--color-foreground)] mb-2">
            {t('dash.benefits.title')}
          </h4>
          <ul className="space-y-1 text-[color:var(--color-foreground)]">
            {[0, 1, 2].map((i) => (
              <li key={i}>• {t(`dash.benefits.${i}`)}</li>
            ))}
          </ul>
        </div>
      </FeatureSection>
    </div>
  );
}
