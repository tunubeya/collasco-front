"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { defaultLocale, locales } from "@/lib/i18n/config";

export function useLocaleQueryParam() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localeParam = searchParams?.get("locale");

  useEffect(() => {
    const nextLocale =
      localeParam && locales.includes(localeParam as (typeof locales)[number])
        ? localeParam
        : defaultLocale;
    const cookieMatch = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="));
    const currentLocale = cookieMatch?.split("=")[1];
    if (currentLocale === nextLocale) return;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; samesite=lax`;
    router.refresh();
  }, [localeParam, router]);
}
