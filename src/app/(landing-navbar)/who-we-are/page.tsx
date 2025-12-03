import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('who-we-are');
  return {
    title: t('metadata_title'),
    description: t('history.title')
  };
}

const pillars = [
  {
    title: 'Evidence-led design',
    description:
      'We craft workspaces where every requirement links to proof — tests, validations, and sign-offs stay stitched together.'
  },
  {
    title: 'Many disciplines, one rhythm',
    description:
      'Product, engineering, QA, and compliance keep their voice, yet collaborate inside one cadence of reviews and releases.'
  },
  {
    title: 'Rituals over heroics',
    description:
      'Predictable rituals replace late-night firefights; Collasco favors sustainable progress over adrenaline.'
  }
];

const timeline = [
  {
    year: '2018',
    headline: 'Hard lessons in regulated delivery',
    body: 'Our founders shipped software for pharma clients and felt the pain of spreadsheets and siloed audits.'
  },
  {
    year: '2020',
    headline: 'Sketching Collasco',
    body: 'A small remote crew started prototyping a shared “quality OS” that blended PM, QA, and documentation needs.'
  },
  {
    year: '2022',
    headline: 'Embedded within partner teams',
    body: 'We co-located with design agencies and medical device builders to learn how collaboration really happens.'
  },
  {
    year: '2024',
    headline: 'Naming the promise',
    body: 'Collasco became the brand for translating messy communication into accountable, audited narratives.'
  }
];

const values = [
  { label: 'Make audits boring', detail: 'If evidence is ready-on-demand, inspections become a formality.' },
  { label: 'Translate across crafts', detail: 'We obsess over language so engineers, QA, and customers read the same story.' },
  { label: 'Design for second brains', detail: 'Documentation should serve as memory, not homework.' },
  { label: 'Celebrate tiny proofs', detail: 'Every test step, screenshot, and approval is a win that deserves permanence.' }
];

export default function WhoWeArePage() {
  return (
    <main className="flex flex-1 flex-col bg-background text-[color:var(--color-foreground)]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-primary-soft)]/40">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center md:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Who we are</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            The crew behind Collasco
          </h1>
          <p className="mt-6 text-lg text-[color:var(--color-muted-fg)]">
            We are facilitators, auditors, and makers who decided that collaboration tools should feel like
            working with a producer—someone who captures every take, aligns the crew, and ships a polished record.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm font-semibold">
            <div className="rounded-full border border-primary/30 px-6 py-3 text-primary">Auditors with empathy</div>
            <div className="rounded-full border border-primary/30 px-6 py-3 text-primary">Product + QA crew</div>
            <div className="rounded-full border border-primary/30 px-6 py-3 text-primary">Remote-first craft</div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-16 text-center md:grid-cols-2">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-surface/50 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase text-primary">Mission</p>
          <h2 className="mt-3 text-2xl font-semibold">Document trust in every release.</h2>
          <p className="mt-4 text-[color:var(--color-muted-fg)]">
            Our mission is to capture conversations, test outcomes, and approvals the moment they happen, so trust
            becomes a tangible artifact instead of a promise.
          </p>
        </div>
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-surface/50 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase text-primary">Vision</p>
          <h2 className="mt-3 text-2xl font-semibold">A studio for complex software work.</h2>
          <p className="mt-4 text-[color:var(--color-muted-fg)]">
            We imagine Collasco as the studio where every discipline can plug in, improvise, and still leave with
            a coherent, compliant result.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase text-primary">Our pillars</p>
            <h2 className="mt-3 text-3xl font-semibold">How we approach collaboration</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-[color:var(--color-border)] bg-background/80 p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm text-[color:var(--color-muted-fg)]">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase text-primary">Our story</p>
          <h2 className="mt-3 text-3xl font-semibold">Moments that shaped Collasco</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {timeline.map((item) => (
            <div
              key={item.year}
              className="rounded-3xl border border-[color:var(--color-border)] bg-surface/60 p-6"
            >
              <p className="text-sm font-semibold uppercase text-primary">{item.year}</p>
              <h3 className="mt-2 text-xl font-semibold">{item.headline}</h3>
              <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-[color:var(--color-primary-soft)]/35 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase text-primary">Values</p>
            <h2 className="mt-3 text-3xl font-semibold">What guides us every sprint</h2>
          </div>
          <div className="mt-10 space-y-4">
            {values.map((value) => (
              <div
                key={value.label}
                className="rounded-2xl border border-[color:var(--color-border)] bg-background/70 px-5 py-4 shadow-sm"
              >
                <p className="text-base font-semibold">{value.label}</p>
                <p className="text-sm text-[color:var(--color-muted-fg)]">{value.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold">Join the early partners shaping Collasco.</h2>
        <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">
          We collaborate with teams that view quality as a shared responsibility. If that is you,
          let us build the future of structured co-creation together.
        </p>
        <button className="mt-8 rounded-full bg-primary px-10 py-3 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-lg shadow-primary/30 transition hover:-translate-y-0.5">
          Start the conversation
        </button>
      </section>
    </main>
  );
}
