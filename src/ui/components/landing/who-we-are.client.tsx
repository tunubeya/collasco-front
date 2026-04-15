'use client';

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
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.15 }
};

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
        <motion.div 
          className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary/10),transparent)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">About Collasco</p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Building the future of <span className="text-primary">structured collaboration</span>.
            </h1>
            <p className="mt-8 text-lg leading-8 text-[color:var(--color-muted-fg)]">
              We are a product team dedicated to creating tools that bring order to the chaos of software delivery.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why We Exist - Manifesto style */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-16 items-center"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why we exist</h2>
              <p className="mt-6 text-lg leading-8 text-[color:var(--color-muted-fg)]">
                We believe software improves when customers and teams build it together — with clarity in every step. 
                Collasco exists to bring structure to that collaboration, from requirements to delivery and beyond.
              </p>
              <motion.div 
                className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>ISO-ready structure</span>
                </div>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Real-time validation</span>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="rounded-3xl bg-surface p-8 shadow-sm border border-[color:var(--color-border)] lg:p-12"
              variants={fadeInUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <MessageSquare className="h-10 w-10 text-primary mb-6" />
              <blockquote className="text-xl font-medium italic leading-9 text-[color:var(--color-foreground)]">
                "Our mission is to give teams the tools they need to build customer confidence through transparent, validated processes."
              </blockquote>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The Team - Modern Cards */}
      <section className="bg-surface py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            className="mx-auto max-w-2xl lg:mx-0"
            {...fadeInUp}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The team</h2>
            <p className="mt-6 text-lg leading-8 text-[color:var(--color-muted-fg)]">
              A small, focused team combining product thinking and technical expertise.
            </p>
          </motion.div>
          <motion.div 
            className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:mx-0 lg:max-w-none"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {team.map((member) => (
              <motion.li 
                key={member.name} 
                className="group relative"
                variants={fadeInUp}
              >
                <motion.div 
                  className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-background p-8"
                  whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  transition={{ duration: 0.3 }}
                >
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
                    <motion.a 
                      href={`mailto:${member.email}`} 
                      className="rounded-full bg-surface p-2 text-primary"
                      whileHover={{ scale: 1.1, backgroundColor: 'var(--color-primary)', color: 'white' }}
                      transition={{ duration: 0.2 }}
                    >
                      <Mail className="h-5 w-5" />
                    </motion.a>
                    <motion.a 
                      href={member.linkedin} 
                      className="rounded-full bg-surface p-2 text-primary"
                      whileHover={{ scale: 1.1, backgroundColor: 'var(--color-primary)', color: 'white' }}
                      transition={{ duration: 0.2 }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Linkedin className="h-5 w-5" />
                    </motion.a>
                  </div>
                </motion.div>
              </motion.li>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-24 sm:py-32">
        <motion.div 
          className="mx-auto max-w-7xl px-6 lg:px-8 text-center"
          {...fadeInUp}
        >
          <Globe className="h-12 w-12 text-primary mx-auto mb-8" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">Proven Expertise</h2>
          <motion.div 
            className="mx-auto max-w-3xl rounded-2xl bg-primary/5 border border-primary/10 p-8"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xl leading-8 text-[color:var(--color-muted-fg)]">
              We build software used in real operational environments such as <span className="font-semibold text-primary">culture venues, schools and healthcare</span>. 
              Our work focuses on systems where structure, validation, and reliability are essential.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* How We Work - Grid of Values */}
      <section className="bg-surface py-24 sm:py-32 border-t border-[color:var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            className="mx-auto max-w-2xl text-center"
            {...fadeInUp}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How we work</h2>
            <p className="mt-4 text-lg text-[color:var(--color-muted-fg)]">
              Our core values guide every decision we make and every line of code we write.
            </p>
          </motion.div>
          <motion.div 
            className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {values.map((value) => (
                <motion.div 
                  key={value.title} 
                  className="flex flex-col"
                  variants={fadeInUp}
                >
                  <dt className="text-base font-semibold leading-7">
                    <motion.div 
                      className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <value.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </motion.div>
                    {value.title}
                  </dt>
                  <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-[color:var(--color-muted-fg)]">
                    <p className="flex-auto">{value.description}</p>
                  </dd>
                </motion.div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* Working With Us - CTA */}
      <section className="py-24 sm:py-32">
        <motion.div 
          className="mx-auto max-w-7xl px-6 lg:px-8"
          {...fadeInUp}
        >
          <motion.div 
            className="relative isolate overflow-hidden bg-primary px-6 py-24 shadow-2xl rounded-3xl sm:px-24 xl:py-32"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to collaborate?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-primary-soft">
              We actively collaborate with teams who want to improve how they build and deliver software. 
              Early feedback and co-creation are a core part of how Collasco evolves.
            </p>
            <motion.div 
              className="mt-10 flex justify-center gap-x-6"
            >
              <motion.a
                href="mailto:daniel@orderflow.be"
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-primary shadow-sm"
                whileHover={{ scale: 1.05, backgroundColor: 'var(--color-cream-50)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                Get in touch
              </motion.a>
            </motion.div>
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
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}