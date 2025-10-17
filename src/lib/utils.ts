import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import countryToCurrency from 'country-to-currency';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export enum RoutesEnum {
  HOME_LANDING = '/',
  // Authentication related routes
  LOGIN = '/login',
  REGISTER = '/register',
  FORGOT_PASSWORD = '/forgot-password',
  RESET_PASSWORD = '/reset-password',

  AUTH_ALL = '/api/auth/**',

  // Miscellaneous pages
  PLANS = '/plans',
  PRIVACY_POLICIES = '/privacy-policies',
  TERMS_AND_CONDITIONS = '/terms-and-conditions',
  WHO_WE_ARE = '/who-we-are',
  SUPPORT = '/support',
  NOT_FOUND = '/not-found',
  ERROR = '/error',
  ERROR_UNAUTHORIZED = '/error-unauthorized',
  REDIRECT = '/auth/redirect',
  
  // Logged-in user routes
  APP_ROOT = '/app',
  APP_PROJECTS = '/app/projects',
  APP_PROJECT_NEW = '/app/projects/new',

  APP_SETTINGS = '/app/settings',
  APP_SETTINGS_PROFILE = '/app/settings/profile',
  APP_SETTINGS_GENERAL = '/app/settings/general',
  // Google callback
  GOOGLE_CALLBACK = '/api/auth/callback/google'
}
export function generatePagination(currentPage: number, totalPages: number) {
  // If the total number of pages is 7 or less,
  // display all pages without any ellipsis.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If the current page is among the first 3 pages,
  // show the first 3, an ellipsis, and the last 2 pages.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // If the current page is among the last 3 pages,
  // show the first 2, an ellipsis, and the last 3 pages.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If the current page is somewhere in the middle,
  // show the first page, an ellipsis, the current page and its neighbors,
  // another ellipsis, and the last page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages
  ];
}

export function formatPriceStringToFloatString(priceStr: string): string {
  // Remove currency symbols and trim whitespace
  const normalized = priceStr
    .replace(/[A-Za-z$€£¥₹₽]/g, '') // Remove common currency symbols and letters
    .trim();
  
  // Count dots and commas to determine their roles
  const dotCount = (normalized.match(/\./g) || []).length;
  const commaCount = (normalized.match(/,/g) || []).length;
  
  // If there's only one separator, determine if it's decimal or thousands
  if (dotCount === 1 && commaCount === 0) {
    // Single dot - check if it's likely a decimal separator
    const dotIndex = normalized.indexOf('.');
    const afterDot = normalized.substring(dotIndex + 1);
    
    // If there are exactly 2 digits after the dot, treat as decimal
    if (afterDot.length === 2) {
      return normalized;
    }
    // Otherwise, treat as thousands separator
    else {
      return normalized.replace('.', '');
    }
  }
  
  if (dotCount === 0 && commaCount === 1) {
    // Single comma - check if it's likely a decimal separator
    const commaIndex = normalized.indexOf(',');
    const afterComma = normalized.substring(commaIndex + 1);
    
    // If there are exactly 2 digits after the comma, treat as decimal
    if (afterComma.length === 2) {
      return normalized.replace(',', '.');
    }
    // Otherwise, treat as thousands separator
    else {
      return normalized.replace(',', '');
    }
  }
  
  // Multiple separators - determine format
  if (dotCount > 0 && commaCount > 0) {
    // Find the last separator
    const lastDotIndex = normalized.lastIndexOf('.');
    const lastCommaIndex = normalized.lastIndexOf(',');
    
    if (lastDotIndex > lastCommaIndex) {
      // Dot is the last separator - European format with comma as thousands
      // Remove all commas, keep dot as decimal
      return normalized.replace(/,/g, '');
    } else {
      // Comma is the last separator - US format with dot as thousands
      // Remove all dots, replace comma with dot for decimal
      return normalized.replace(/\./g, '').replace(',', '.');
    }
  }
  
  // Multiple dots or commas (thousands separators)
  if (dotCount > 1) {
    // Multiple dots - remove all (thousands separators)
    return normalized.replace(/\./g, '');
  }
  
  if (commaCount > 1) {
    // Multiple commas - remove all (thousands separators)
    return normalized.replace(/,/g, '');
  }
  
  // No separators - return as is
  return normalized;
}
export const parseCurrencyValue = (
  value: string,
  allowNegative: boolean = false,
  min: number = 0,
  max: number = 10000000
): number => {
  // Remove currency symbol, thousand separators, etc.
  const cleanedValue = value.replace(/[^\d.-]/g, '');

  if (cleanedValue === '' || cleanedValue === '-') {
    return 0;
  }

  let numberValue = parseFloat(cleanedValue);

  // Handle validation constraints
  if (!allowNegative && numberValue < 0) {
    numberValue = 0;
  }

  if (min !== undefined && numberValue < min) {
    numberValue = min;
  }

  if (max !== undefined && numberValue > max) {
    numberValue = max;
  }

  return numberValue;
};
export function formatAsCurrency(
  value: number,
  locale: string = 'es-BO',
  currency: string = 'BOB',
  precision: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(value);
}
export function getCurrencySymbol(countryCode: string, locale?: string) {
  try {
    const countryCodeUpper = countryCode.toUpperCase();
    const currencyCode =
      countryToCurrency[countryCodeUpper as keyof typeof countryToCurrency];
    const locale_ = locale ?? `es-${countryCode}`;
    const formatter = new Intl.NumberFormat(locale_, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0, // No decimal places for symbol only
      maximumFractionDigits: 0 // No decimal places for symbol only
    });
    // Format a dummy number to extract the symbol
    return formatter.format(0).replace(/\d/g, '').trim();
  } catch (error) {
    console.error('Invalid currency code or locale:', error);
    return null;
  }
}

let refreshingPromise: Promise<string | undefined> | null = null;

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  accessToken: string
) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    if (typeof window === 'undefined') {
      return response;
    }

    if (!refreshingPromise) {
      console.warn('[fetchWithAuth] 401 detectado. Iniciando refresh...');
      refreshingPromise = fetch('/api/auth/refresh', { method: 'POST' })
        .then((refreshResp) => {
          if (!refreshResp.ok) throw new Error('No se pudo refrescar el token');
          return refreshResp.json();
        })
        .then((data) => {
          console.info(
            '[fetchWithAuth] Nuevo accessToken recibido:',
            data.newAccessToken
          );
          return data.newAccessToken;
        })
        .catch((err) => {
          console.error('[fetchWithAuth] Error al refrescar:', err);
          return undefined;
        })
        .finally(() => {
          refreshingPromise = null;
        });
    } else {
      console.log('[fetchWithAuth] Esperando el refresh de otro request...');
    }

    const newAccessToken = await refreshingPromise;
    if (newAccessToken) {
      // Reintenta el request con el nuevo token
      response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newAccessToken}`
        }
      });
      if (response.status !== 401) {
        return response;
      }
    }
    // Si sigue fallando, login obligado
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada. Redirigiendo al login.');
  }

  return response;
}
// --- Helper function to get the root domain ---
export function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  // Handles cases like 'tunubeya.com', 'www.tunubeya.com', 'tienda1.tunubeya.com'
  // and also 'localhost' for development.
  if (parts.length > 2) {
    // e.g., tienda1.tunubeya.com -> .tunubeya.com
    return `.${parts.slice(-2).join('.')}`;
  }
  if (parts.length === 2 && parts[1] !== 'localhost') {
    // e.g., tunubeya.com -> .tunubeya.com
    return `.${hostname}`;
  }
  // For 'localhost' or other single-part hostnames in development
  return hostname;
}
