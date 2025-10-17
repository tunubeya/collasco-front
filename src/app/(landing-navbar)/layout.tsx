import NavbarLanding from '@/ui/components/navbar/navbar-landing';
import Footer from '@/ui/components/footer';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-background)]">
      <NavbarLanding />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
