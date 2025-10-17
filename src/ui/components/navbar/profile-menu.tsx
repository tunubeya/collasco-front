import { LogOut, CircleUserRound } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { logout } from '@/lib/actions';
import { Session } from '@/lib/definitions';
import PopoverOptions from '@/ui/components/popover/popover-options';
import { getTranslations } from 'next-intl/server';

const ProfileMenu = async ({ session }: { session: Session | null }) => {
  const t = await getTranslations('ui.navbar.profile-menu');
  return (
    session?.token && (
      <>
        <div className="hidden md:block">
          <PopoverOptions
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full bg-gray-200 hover:bg-gray-300 transition"
              >
                <CircleUserRound className="w-8 h-8 text-purple-dark" />
              </Button>
            }
          >
            <form action={logout}>
              <Button className="text-red-600" variant="option" type="submit">
                <LogOut className="w-5 h-5" />
                {t('logout')}
              </Button>
            </form>
          </PopoverOptions>
        </div>
        <div className="block md:hidden">
          <form action={logout}>
            <Button className="text-red-600" variant="option" type="submit">
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </Button>
          </form>
        </div>
      </>
    )
  );
};

export default ProfileMenu;