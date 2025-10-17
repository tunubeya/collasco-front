import type { Metadata } from 'next';
import PricingCard from '@/ui/components/pricing-card';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plans');
  return { title: t('metadata_title'), description: t('description') };
}

export default async function PlansPage() {
  const t = await getTranslations('plans');
  const headersList = await headers();
  const country = headersList.get('x-vercel-ip-country') ?? 'BO';

  const plans = [
    {
      id: 'monthly',
      label: t('monthly.label'),
      title: t('monthly.title'),
      price: 12,
      period: t('planPeriodMonth'),
      features: [t('monthly.feature1'), t('monthly.feature2')],
    },
    {
      id: 'yearly',
      label: t('yearly.label'),
      title: t('yearly.title'),
      price: 120,
      period: t('planPeriodYear'),
      features: [t('yearly.feature1'), t('yearly.feature2')],
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] w-full
                    bg-gradient-to-br from-surface to-primary/10
                    flex flex-col gap-7 px-6 py-12 items-center">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
        {t('title')}
      </h1>
      <p className="text-sm md:text-base text-[color:var(--color-muted-fg)] max-w-xl text-center">
        {t('description')}
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} countryCode={country} />
        ))}
      </div>
    </div>
  );
}
