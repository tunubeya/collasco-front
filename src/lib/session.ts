import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { SessionPayload, Session, RefreshInfoPayload } from '@/lib/definitions';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { getRootDomain } from './utils';

const secretKey = process.env.AUTH_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);
const expirationTimeDays = 7;

//ADD THIS ENVIRONMENT VARIABLES
const secret = process.env.CRYPTO_SECRET!;
const iv = process.env.CRYPTO_IV!;

export async function encrypt(
  payload: SessionPayload | RefreshInfoPayload
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationTimeDays}d`)
    .sign(encodedKey);
}
export function encryptWithCrypto(payload: SessionPayload): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret), iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf-8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}
export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256']
    });
    return payload;
  } catch (error) {
    console.error(error);
  }
}
export async function createSession(sessionPayload: SessionPayload) {
  const expiresAt = new Date(sessionPayload.expiresAt);
  const session = await encrypt(sessionPayload);
  const cookieStore = await cookies();
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? getRootDomain(host) : undefined;
  console.log("cookie domain > ", cookieDomain);

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain
  });
}
export async function updateSession({
  token,
  role
}: {
  token?: string;
  role?: string
}) {
  const session = (await cookies()).get('session')?.value;
  const payload = (await decrypt(session)) as SessionPayload | undefined;
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? getRootDomain(host) : undefined;
  if (!session || !payload) {
    return null;
  }
  let newSession = session;
  newSession = await encrypt({
    ...payload,
    token: token ?? payload.token,
    expiresAt: payload.expiresAt,
    role: role ?? payload.role
  });

  const cookieStore = await cookies();
  cookieStore.set('session', newSession, {
    httpOnly: true,
    secure: true,
    expires: new Date(payload.expiresAt),
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain
  });
}
export async function deleteSession() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? getRootDomain(host) : undefined;

  const expiredCookieOptions = {
    httpOnly: true,
    secure: true,
    expires: new Date(0),
    sameSite: "lax" as const,
    path: '/',
    domain: cookieDomain
  };
  cookieStore.set('session', ``, expiredCookieOptions);
  cookieStore.set('store-data', '', expiredCookieOptions);
  cookieStore.set('refresh-info', '', expiredCookieOptions);
}
export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) {
    return null;
  }
  return (await decrypt(session)) as Session;
}
export async function saveRefreshInfo(infoPayload: RefreshInfoPayload) {
  const refreshInfo = await encrypt(infoPayload);
  const cookieStore = await cookies();
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? getRootDomain(host) : undefined;
  cookieStore.set('refresh-info', refreshInfo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(infoPayload.refreshTokenExpirationDate),
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain
  });
}
export async function getRefreshInfo() {
  const refreshInfo = (await cookies()).get('refresh-info')?.value;
  if (!refreshInfo) {
    return null;
  }
  return (await decrypt(refreshInfo)) as RefreshInfoPayload;
}
export async function updateRefreshInfo({
  refreshToken,
  refreshTokenExpirationDate
}: {
  refreshToken?: string;
  refreshTokenExpirationDate?: string;
}) {
  const refreshInfo = (await cookies()).get('refresh-info')?.value;
  const payload = (await decrypt(refreshInfo)) as RefreshInfoPayload | undefined;
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? getRootDomain(host) : undefined;
  if (!refreshInfo || !payload) {
    return null;
  }

  const updatedPayload = {
    ...payload,
    refreshToken: refreshToken ?? payload.refreshToken,
    refreshTokenExpirationDate: refreshTokenExpirationDate ?? payload.refreshTokenExpirationDate
  };

  const newRefreshInfo = await encrypt(updatedPayload);
  const cookieStore = await cookies();
  cookieStore.set('refresh-info', newRefreshInfo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(updatedPayload.refreshTokenExpirationDate),
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain
  });
}