'use client';
import { useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Locale } from '@/lib/i18n/config';
import { setUserLocale } from '@/lib/i18n/locale.service';
import { Menu, MenuItem } from '@/ui/components/dropdown/dropdown';
import { Languages } from 'lucide-react';
import { Button } from '@/ui/components/button';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LangSelectorClient({
  defaultValue,
  items,
  label
}: Readonly<Props>) {
  const startTransition = useTransition()[1];
  const pathname = usePathname();
  const shouldHide = pathname?.startsWith('/app');

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
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
