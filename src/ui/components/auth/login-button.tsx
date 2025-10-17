import { Button } from '@/ui/components/button';
import { RoutesEnum } from '@/lib/utils';
import { Session } from '@/lib/definitions';
import { getTranslations } from 'next-intl/server';

export default async function LoginButton({
  session
}: Readonly<{ session: Session | null }>) {
  const t = await getTranslations('auth.login');
  let redirect: string = RoutesEnum.LOGIN;
  if (session?.token) {
    redirect = RoutesEnum.APP_ROOT;
  }
  return (
    <Button
      variant= 'secondary'
      redirect={redirect}
    >
      <span>{t('title_01')}</span>
    </Button>
  );
}