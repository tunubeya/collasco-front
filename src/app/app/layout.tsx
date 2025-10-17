// app/app/layout.tsx
import AppSidebar from '@/ui/components/sidebar/app-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative md:pl-64 pt-16 md:pt-0 min-h-screen bg-background">
      <AppSidebar />
      <div className="px-4 md:px-8 py-6">{children}</div>
    </section>
  );
}
