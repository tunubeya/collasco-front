export type Locale = (typeof locales)[number];

export const locales = ['es', 'en', 'pt', 'nl', 'fr'] as const;
export const defaultLocale: Locale = 'en';

export function normalizeLocale(value?: string | null): Locale | null {
  const baseLocale = value?.split('-')[0]?.toLowerCase();
  return locales.includes(baseLocale as Locale) ? (baseLocale as Locale) : null;
}
