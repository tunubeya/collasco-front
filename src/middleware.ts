import { NextRequest, NextResponse } from "next/server";
import { fetchRefreshToken } from "@/lib/data";
import { decrypt, encrypt } from "@/lib/session";
import {
  Session,
  RefreshInfoPayload,
  CollectedCookies,
} from "@/lib/definitions";
import { auth } from "@/auth";
import { RoutesEnum, getRootDomain } from "@/lib/utils";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};

const publicRoutes = [
  RoutesEnum.HOME_LANDING,
  RoutesEnum.LOGIN,
  RoutesEnum.REGISTER,
  RoutesEnum.FORGOT_PASSWORD,
  RoutesEnum.RESET_PASSWORD,
  RoutesEnum.PRIVACY_POLICIES,
  RoutesEnum.TERMS_AND_CONDITIONS,
  RoutesEnum.PLANS,
  RoutesEnum.WHO_WE_ARE,
  RoutesEnum.SUPPORT,
  RoutesEnum.REDIRECT,
  RoutesEnum.AUTH_ALL,
  "/404",
  "/500",
];

const expirationTimeDays = 7;
// Set session cookie to expire later than the token to allow refresh
// Define a type for the results returned by the helper functions
type SessionResult = {
  redirect?: NextResponse;
  newToken?: string;
  encryptedSessionData?: string;
  newSessionExpiresAt?: Date;
  encryptedRefreshInfo?: string;
  newRefreshInfoExpiresAt?: Date;
};

// Refactored refreshSession: Only validates and collects new token data
async function refreshSession(request: NextRequest): Promise<SessionResult> {
  const unauthorizedUrl = new URL(
    RoutesEnum.ERROR_UNAUTHORIZED,
    request.nextUrl.origin
  );
  const sessionCookie = request.cookies.get("session")?.value;
  const refreshInfoCookie = request.cookies.get("refresh-info")?.value;

  // If no refresh info cookie, user needs to log in again
  if (!refreshInfoCookie) {
    console.log("err >> no refresh-info cookie");
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }

  let refreshInfo: RefreshInfoPayload;
  let session: Session | null = null;

  try {
    refreshInfo = (await decrypt(refreshInfoCookie)) as RefreshInfoPayload;
  } catch (decryptError) {
    console.error("Failed to decrypt refresh-info cookie:", decryptError);
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }

  // Try to decrypt session cookie if it exists
  if (sessionCookie) {
    try {
      session = (await decrypt(sessionCookie)) as Session;
    } catch (decryptError) {
      console.log(
        "Session cookie exists but failed to decrypt, will refresh token"
      );
      console.error(decryptError);
      // Continue with refresh logic even if session cookie is corrupted/expired
    }
  }

  if (!refreshInfo) {
    console.log("err >> no refresh info after decrypt");
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }

  const refreshTokenExpirationDate = new Date(
    refreshInfo.refreshTokenExpirationDate
  );

  // Check if refresh token is expired (expire 2 minutes before the expiration date)
  const twoMinsInFuture = Date.now() + 120000;
  const refreshTokenExpired =
    refreshTokenExpirationDate.getTime() < twoMinsInFuture;

  // If refresh token is expired, redirect to login
  if (refreshTokenExpired) {
    console.log("Refresh token expired, redirecting to login");
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }

  // Check if we need to refresh the access token
  let needsRefresh = false;

  if (!session) {
    // No valid session cookie, definitely need to refresh
    needsRefresh = true;
  } else {
    // Check if access token is expired or about to expire
    const accessTokenExpirationDate = new Date(session.expiresAt);
    const accessTokenExpired =
      accessTokenExpirationDate.getTime() < twoMinsInFuture;
    needsRefresh = accessTokenExpired;
  }

  if (needsRefresh) {
    try {
      const resp = await fetchRefreshToken(
        refreshInfo.refreshToken,
        refreshInfo.email
      );
      if (resp && resp.accessToken) {
        // Create new session object
        const newSession: Session = {
          token: resp.accessToken,
          storeId: resp.storeId,
          confirmed: resp.confirmed,
          expiresAt: resp.accessTokenExpirationDate,
          role: resp.role,
        } as Session;

        const newRefreshInfo: RefreshInfoPayload = {
          email: refreshInfo.email,
          refreshToken: resp.refreshToken,
          refreshTokenExpirationDate: resp.refreshTokenExpirationDate,
        };

        const encryptedNewSession = await encrypt(newSession);
        const encryptedNewRefreshInfo = await encrypt(newRefreshInfo);

        // Set session cookie to expire much later than the token to allow for refresh
        // const sessionCookieExpiresAt = new Date(
        //   Date.now() + sessionCookieExpirationDays * 24 * 60 * 60 * 1000
        // );
        console.log(
          "new session expiration date >>",
          resp.accessTokenExpirationDate
        );
        console.log(
          "new refresh expiration date >>",
          resp.refreshTokenExpirationDate
        );
        return {
          encryptedSessionData: encryptedNewSession,
          newSessionExpiresAt: new Date(resp.accessTokenExpirationDate), // Cookie expires later than token
          encryptedRefreshInfo: encryptedNewRefreshInfo,
          newRefreshInfoExpiresAt: new Date(resp.refreshTokenExpirationDate),
          newToken: resp.accessToken,
        };
      } else {
        console.log("err >> fetch refresh failed, no access token in response");
        return { redirect: NextResponse.redirect(unauthorizedUrl) };
      }
    } catch (error) {
      console.error("refreshSession error:", error);
      return { redirect: NextResponse.redirect(unauthorizedUrl) };
    }
  }

  // Tokens are valid, nothing to refresh/collect
  return {};
}

// New function to set cookies and return the response
async function applyCookiesAndRespond(
  response: NextResponse,
  collectedData: CollectedCookies,
  rootDomain: string
): Promise<NextResponse> {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = isProduction ? rootDomain : undefined;
  if (collectedData.encryptedSessionData && collectedData.newSessionExpiresAt) {
    response.cookies.set({
      name: "session",
      value: collectedData.encryptedSessionData,
      httpOnly: true,
      secure: isProduction,
      expires: collectedData.newSessionExpiresAt,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
    });
  }
  if (
    collectedData.encryptedRefreshInfo &&
    collectedData.newRefreshInfoExpiresAt
  ) {
    response.cookies.set({
      name: "refresh-info",
      value: collectedData.encryptedRefreshInfo,
      httpOnly: true,
      secure: isProduction,
      expires: collectedData.newRefreshInfoExpiresAt,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
    });
  }

  const expiresAt = new Date(
    Date.now() + expirationTimeDays * 24 * 60 * 60 * 1000
  );
  if (collectedData.encryptedStoreData) {
    response.cookies.set({
      name: "store-data",
      value: collectedData.encryptedStoreData,
      httpOnly: true,
      secure: isProduction,
      expires: expiresAt,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
    });
  }
  return response;
}

export default auth(async (req) => {
  try {
    const collectedCookieData: CollectedCookies = {};
    // Subdomain extraction logic
    const host = req.headers.get("host") ?? "";
    const rootDomain = getRootDomain(host);
    const isLoggedIn = !!req.auth;
    // Add redirection for subdomains when route is '/'

    // ✅ Solo usuarios logueados saltan al /home
    if (req.nextUrl.pathname === "/") {
      if (isLoggedIn) {
        const newUrl = new URL(RoutesEnum.APP_ROOT, req.nextUrl.origin);
        return NextResponse.redirect(newUrl);
      }
      return NextResponse.next(); // público ve la landing en "/"
    }
    const isResource =
      req.nextUrl.pathname.includes(".svg") ||
      req.nextUrl.pathname.includes(".jpg") ||
      req.nextUrl.pathname.includes(".png") ||
      req.nextUrl.pathname.includes(".ico") ||
      req.nextUrl.pathname.includes(".css") ||
      req.nextUrl.pathname.includes(".js");
    const isPublicRoute = publicRoutes.includes(
      req.nextUrl.pathname as RoutesEnum
    );
    const isGoogleAuthCallback = req.nextUrl.pathname.includes(
      RoutesEnum.GOOGLE_CALLBACK
    );
    const isUnauthorizedRoute = req.nextUrl.pathname.includes(
      RoutesEnum.ERROR_UNAUTHORIZED
    );

    // Allow static resources to pass through
    if (isResource || isGoogleAuthCallback) {
      return NextResponse.next();
    }

    // Handle initial public/login checks and redirects
    if (!isLoggedIn && !isPublicRoute) {
      const newUrl = new URL(RoutesEnum.LOGIN, req.nextUrl.origin);
      return Response.redirect(newUrl);
    }

    // If on an unauthorized route, allow access to display the page
    if (isUnauthorizedRoute) {
      return NextResponse.next();
    }

    let response = NextResponse.next(); // Start with the default next response
    // Always perform session refresh logic for authenticated routes
    // This handles both logged-in users and users with expired session cookies
    if (isLoggedIn || req.cookies.get("refresh-info")) {
      const refreshResult = await refreshSession(req);
      // If refreshSession returned a redirect, prioritize it
      if (refreshResult.redirect) {
        return refreshResult.redirect;
      }
      // Collect potential new session data
      if (refreshResult.encryptedSessionData) {
        collectedCookieData.encryptedSessionData =
          refreshResult.encryptedSessionData;
        collectedCookieData.newSessionExpiresAt =
          refreshResult.newSessionExpiresAt;
      }
      if (refreshResult.encryptedRefreshInfo) {
        collectedCookieData.encryptedRefreshInfo =
          refreshResult.encryptedRefreshInfo;
        collectedCookieData.newRefreshInfoExpiresAt =
          refreshResult.newRefreshInfoExpiresAt;
      }
      if (refreshResult.newToken) {
        collectedCookieData.newToken = refreshResult.newToken;
      }
    }

    // Apply collected cookies to the response and return
    response = await applyCookiesAndRespond(
      response,
      collectedCookieData,
      rootDomain
    ); // MODIFIED: Pass root domain

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    // Fallback to unauthorized page on unexpected errors
    const unauthorizedUrl = new URL(
      RoutesEnum.ERROR_UNAUTHORIZED,
      req.nextUrl.origin
    );
    return NextResponse.redirect(unauthorizedUrl);
  }
});
