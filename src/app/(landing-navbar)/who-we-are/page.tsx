import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('who-we-are');
  return {
    title: t('metadata_title'),
    description: t('history.title'),
  };
}


export default async function WhoWeArePage() {
  const t = await getTranslations('who-we-are');
  return (
    <div className="w-full bg-[var(--color-background)] flex flex-col mb-20 md:mb-32">
      {/* HISTORIA Section */}
      <section className="w-full flex flex-col items-center pt-10 pb-8 px-4 md:px-0 bg-[var(--color-background)]">
        {/* Top Dots and Title */}
        <div className="flex flex-col items-center w-full max-w-6xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-orange)] inline-block" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-primary-orange)] mb-2 tracking-wide text-center">{t('history.title')}</h1>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-5 h-5 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-orange)] inline-block" />
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-orange)] inline-block" />
          </div>
        </div>
        {/* Content Row */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl gap-8 md:gap-0">
          {/* Text */}
          <div className="flex-1 text-[var(--color-secondary-blue)] text-base md:text-lg font-medium max-w-xl md:pr-8">
            <p className="mb-2">{t('history.paragraph1')}</p>
            <p className="mb-2">{t('history.paragraph2')}</p>
            <p className="mb-2">{t('history.paragraph3')}</p>
          </div>
          {/* Mockup Image */}
          <div className="flex-1 flex justify-center items-center w-full md:w-auto">
            <div className="relative w-[320px] h-[220px] md:w-[420px] md:h-[290px] lg:w-[500px] lg:h-[340px]">
              <Image
                src="/Images/landing_page_2.png"
                alt="Mockup Tunubeya"
                fill
                style={{ objectFit: 'contain' }}
                sizes="(max-width: 768px) 320px, (max-width: 1024px) 420px, 500px"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* MISION & VISION Section */}
      <section className="w-full flex flex-col md:flex-row mt-8 md:mt-0 min-h-[320px]">
        {/* MISION */}
        <div className="flex-1 bg-background flex flex-col items-center justify-center py-10 px-6 md:px-12 border-b md:border-b-0 md:border-r border-[var(--color-custom-gray)]">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-primary-orange)] mb-4 text-center">{t('misionTitle')}</h2>
          <p className="text-[var(--color-secondary-blue)] text-base md:text-lg text-center max-w-md">
            {t('mision')}
          </p>
        </div>
        {/* VISION */}
        <div className="flex-1 bg-background flex flex-col items-center justify-center py-10 px-6 md:px-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-purple)] mb-4 text-center">{t('visionTitle')}</h2>
          <p className="text-[var(--color-secondary-blue)] text-base md:text-lg text-center max-w-md">
            {t('vision')}
          </p>
        </div>
      </section>
    </div>
  );
}
