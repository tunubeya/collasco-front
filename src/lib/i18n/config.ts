export type Locale = (typeof locales)[number];

export const locales = ['es', 'en', 'pt', 'nl', 'fr'] as const;
export const defaultLocale: Locale = 'es';