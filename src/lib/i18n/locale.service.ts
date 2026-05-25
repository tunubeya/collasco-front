'use server';
import { Locale, defaultLocale, normalizeLocale } from './config';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { fetchUpdateCurrentUser } from '@/lib/data';

// In this example the locale is read from a cookie. You could alternatively
// also read it from a database, backend service, or any other source.
const COOKIE_NAME = 'NEXT_LOCALE';

export async function getUserLocale() {
    const cookieLocale = normalizeLocale((await cookies()).get(COOKIE_NAME)?.value);
    return cookieLocale || defaultLocale;
}

export async function setUserLocale(locale: Locale) {
    (await cookies()).set(COOKIE_NAME, locale);
}

export async function hasUserLocaleCookie() {
    return Boolean((await cookies()).get(COOKIE_NAME)?.value);
}

export async function setUserLocalePreference(locale: Locale) {
    await setUserLocale(locale);

    const session = await getSession();
    if (!session?.token) {
        return;
    }

    try {
        await fetchUpdateCurrentUser(session.token, { locale });
    } catch (error) {
        console.error('Failed to save user locale preference:', error);
    }
}
