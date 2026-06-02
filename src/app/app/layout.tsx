// app/app/layout.tsx
import AppSidebar from '@/ui/components/sidebar/app-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative pt-16 md:pt-0 md:pl-[var(--app-sidebar-width,16rem)] min-h-screen bg-background transition-[padding] duration-200">
      <AppSidebar />
      <div className="px-4 md:px-8 py-6">{children}</div>
    </section>
  );
}
