import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/ui/components/button';
import RegisterButton from '@/ui/components/auth/register-button';
import LoginButton from '@/ui/components/auth/login-button';
import ProfileMenu from '@/ui/components/navbar/profile-menu';
import ResponsiveMenu from '@/ui/components/navbar/responsive-menu';
import { getSession } from '@/lib/session';
import { RoutesEnum } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

export default async function NavbarLanding() {
  const t = await getTranslations('ui.navbar.landing');
  const session = await getSession();

  const NavLinks = () => (
    <>
      <Button variant="link" redirect={RoutesEnum.WHO_WE_ARE}>
        <span>{t('whoWeAre')}</span>
      </Button>
      <Button variant="link" redirect={RoutesEnum.PLANS}>
        <span>{t('plans')}</span>
      </Button>
      <Button variant="link" redirect={RoutesEnum.SUPPORT}>
        <span>{t('support')}</span>
      </Button>
    </>
  );

  return (
    <nav
      className="sticky top-0 z-40 h-16 md:h-20
                 border-b border-[color:var(--color-border)]
                 bg-[color:var(--color-background)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-background)]/70"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href={RoutesEnum.HOME_LANDING} className="flex items-center gap-2">
          <Image
            src="/logos/horizontal-myflowcheck.svg"  /* <-- actualiza el asset */
            alt="MyFlowCheck"
            width={180}
            height={40}
            className="h-8 w-auto md:h-10"
            priority
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1">
            <NavLinks />
          </div>

          {/* CTA / Auth */}
          <div className="ml-3 flex items-center gap-2">
            {!session?.token && <RegisterButton />}
            <LoginButton session={session} />
            <ProfileMenu session={session} />
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <ResponsiveMenu>
            <div className="flex flex-col gap-3 min-w-64">
              <NavLinks />
              <div className="h-px bg-[color:var(--color-border)] my-1" />
              {!session?.token && <RegisterButton />}
              <LoginButton session={session} />
              <ProfileMenu session={session} />
            </div>
          </ResponsiveMenu>
        </div>
      </div>
    </nav>
  );
}
