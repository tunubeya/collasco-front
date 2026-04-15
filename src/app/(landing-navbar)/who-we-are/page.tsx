import type { Metadata } from 'next';
import { 
  Users, 
  Target, 
  ShieldCheck, 
  Zap, 
  Mail, 
  Linkedin, 
  Globe, 
  MessageSquare,
  CheckCircle2
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Who We Are | Collasco',
    description: 'We are a product team building structured collaboration tools for software delivery.'
  };
}

const team = [
  { 
    name: 'Thomas', 
    role: 'Product', 
    email: 'thomas@orderflow.be', 
    linkedin: 'https://www.linkedin.com/in/tcleenewerck/',
    initials: 'T',
    description: 'Focuses on product strategy and user experience to ensure clarity in every feature.'
  },
  { 
    name: 'Daniel', 
    role: 'Architecture', 
    email: 'daniel@orderflow.be', 
    linkedin: 'https://www.linkedin.com/in/daniel-camacho-santacruz/',
    initials: 'D',
    description: 'Leads the technical foundation, building reliable and scalable systems for delivery.'
  }
] as const;

const values = [
  {
    title: 'Customer-Centric',
    description: 'We build with customers, not for customers, ensuring real needs are met.',
    icon: Users
  },
  {
    title: 'Clarity First',
    description: 'We focus on clarity and structure in every step of the development process.',
    icon: Target
  },
  {
    title: 'Continuous Validation',
    description: 'We validate continuously through feedback, testing, and frequent releases.',
    icon: Zap
  },
  {
    title: 'Living Documentation',
    description: 'We treat documentation as part of the product, not an afterthought.',
    icon: ShieldCheck
  }
] as const;

export default function WhoWeArePage() {
  return (
    <main className="flex-1 bg-background text-[color:var(--color-foreground)]">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-primary-soft)]/20 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary/10),transparent)]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">About Collasco</p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Building the future of <span className="text-primary">structured collaboration</span>.
            </h1>
            <p className="mt-8 text-lg leading-8 text-[color:var(--color-muted-fg)]">
              We are a product team dedicated to creating tools that bring order to the chaos of software delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Why We Exist - Manifesto style */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why we exist</h2>
              <p className="mt-6 text-lg leading-8 text-[color:var(--color-muted-fg)]">
                We believe software improves when customers and teams build it together — with clarity in every step. 
                Collasco exists to bring structure to that collaboration, from requirements to delivery and beyond.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>ISO-ready structure</span>
                </div>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Real-time validation</span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-surface p-8 shadow-sm border border-[color:var(--color-border)] lg:p-12">
              <MessageSquare className="h-10 w-10 text-primary mb-6" />
              <blockquote className="text-xl font-medium italic leading-9 text-[color:var(--color-foreground)]">
                "Our mission is to give teams the tools they need to build customer confidence through transparent, validated processes."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* The Team - Modern Cards */}
      <section className="bg-surface py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The team</h2>
            <p className="mt-6 text-lg leading-8 text-[color:var(--color-muted-fg)]">
              A small, focused team combining product thinking and technical expertise.
            </p>
          </div>
          <ul role="list" className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
            {team.map((member) => (
              <li key={member.name} className="group relative">
                <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-background p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-center gap-x-6">
                    <div className="h-16 w-16 flex-none rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold leading-7 tracking-tight">{member.name}</h3>
                      <p className="text-sm font-semibold leading-6 text-primary">{member.role}</p>
                    </div>
                  </div>
                  <p className="mt-6 text-base leading-7 text-[color:var(--color-muted-fg)]">
                    {member.description}
                  </p>
                  <div className="mt-8 flex gap-4">
                    <a href={`mailto:${member.email}`} className="rounded-full bg-surface p-2 text-primary hover:bg-primary hover:text-white transition-colors">
                      <Mail className="h-5 w-5" />
                    </a>
                    <a href={member.linkedin} className="rounded-full bg-surface p-2 text-primary hover:bg-primary hover:text-white transition-colors">
                      <Linkedin className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <Globe className="h-12 w-12 text-primary mx-auto mb-8" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">Proven Expertise</h2>
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary/5 border border-primary/10 p-8">
            <p className="text-xl leading-8 text-[color:var(--color-muted-fg)]">
              We build software used in real operational environments such as <span className="font-semibold text-primary">culture venues, schools and healthcare</span>. 
              Our work focuses on systems where structure, validation, and reliability are essential.
            </p>
          </div>
        </div>
      </section>

      {/* How We Work - Grid of Values */}
      <section className="bg-surface py-24 sm:py-32 border-t border-[color:var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How we work</h2>
            <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">
              Our core values guide every decision we make and every line of code we write.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {values.map((value) => (
                <div key={value.title} className="flex flex-col">
                  <dt className="text-base font-semibold leading-7">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <value.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {value.title}
                  </dt>
                  <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-[color:var(--color-muted-fg)]">
                    <p className="flex-auto">{value.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Working With Us - CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative isolate overflow-hidden bg-primary px-6 py-24 shadow-2xl rounded-3xl sm:px-24 xl:py-32">
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to collaborate?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-primary-soft">
              We actively collaborate with teams who want to improve how they build and deliver software. 
              Early feedback and co-creation are a core part of how Collasco evolves.
            </p>
            <div className="mt-10 flex justify-center gap-x-6">
              <a
                href="mailto:daniel@collasco.com"
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
              >
                Get in touch
              </a>
            </div>
            <svg
              viewBox="0 0 1024 1024"
              className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
              aria-hidden="true"
            >
              <circle cx="512" cy="512" r="512" fill="url(#gradient)" fillOpacity="0.2" />
              <defs>
                <radialGradient id="gradient">
                  <stop stopColor="white" />
                  <stop offset={1} stopColor="#CBDCEB" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>
    </main>
  );
}