import {useLocale, useTranslations} from 'next-intl';
import { locales } from '@/lib/i18n/config';
import LangSelectorClient from './lang-selector-client';

type Props = {
  allowInApp?: boolean;
  initialLocale?: string | null;
  hasLocaleCookie?: boolean;
};

export default function LangSelector({
  allowInApp = false,
  initialLocale,
  hasLocaleCookie = true
}: Props) {
  const t = useTranslations('ui.i18n.langSelector');
  const locale = useLocale();

  return (
    <LangSelectorClient
      defaultValue={locale}
      items={locales.map((l) => ({
        value: l,
        label: t(l)
      }))}
      label={"Change language"}
      allowInApp={allowInApp}
      initialLocale={initialLocale}
      hasLocaleCookie={hasLocaleCookie}
    />
  );
}
