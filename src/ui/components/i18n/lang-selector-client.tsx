'use client';
import { useEffect, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Locale, normalizeLocale } from '@/lib/i18n/config';
import { setUserLocale, setUserLocalePreference } from '@/lib/i18n/locale.service';
import { Menu, MenuItem } from '@/ui/components/dropdown/dropdown';
import { Languages } from 'lucide-react';
import { Button } from '@/ui/components/button';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
  allowInApp?: boolean;
  initialLocale?: string | null;
  hasLocaleCookie?: boolean;
};

export default function LangSelectorClient({
  defaultValue,
  items,
  label,
  allowInApp = false,
  initialLocale,
  hasLocaleCookie = true
}: Readonly<Props>) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const shouldHide = pathname?.startsWith('/app') && !allowInApp;
  const normalizedInitialLocale = normalizeLocale(initialLocale);

  useEffect(() => {
    if (hasLocaleCookie || !normalizedInitialLocale || normalizedInitialLocale === defaultValue) {
      return;
    }

    startTransition(async () => {
      await setUserLocale(normalizedInitialLocale);
      router.refresh();
    });
  }, [defaultValue, hasLocaleCookie, normalizedInitialLocale, router, startTransition]);

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(async () => {
      if (allowInApp) {
        await setUserLocalePreference(locale);
      } else {
        await setUserLocale(locale);
      }
      router.refresh();
    });
  }
  if (shouldHide) {
    return null;
  }

  return (
    <div className="relative">
      <Menu
        label={label}
        trigger={
          <Button
            variant={'outline'}
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            aria-label={label}
            disabled={isPending}
          >
            <Languages className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-900" />
            <span className="text-slate-900">{defaultValue}</span>
          </Button>
        }
      >
        {items.map((item) => (
          <MenuItem
            key={item.value}
            label={item.label}
            onClick={() => onChange(item.value)}
          />
        ))}
      </Menu>
    </div>
  );
}
