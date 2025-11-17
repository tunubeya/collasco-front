import { NextRequest, NextResponse } from "next/server";
import { fetchRefreshToken } from "@/lib/data";
import { decrypt, encrypt } from "@/lib/session";
import {
  Session,
  RefreshInfoPayload,
  CollectedCookies,
} from "@/lib/definitions";
import { auth } from "@/auth";
import { RoutesEnum } from "@/lib/utils";

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
async function refreshSession(request: NextRequest): Promise<SessionResult> {
  console.log(">>> [refreshSession] INICIO");
  const start = Date.now();
  const unauthorizedUrl = new URL(
    RoutesEnum.ERROR_UNAUTHORIZED,
    request.nextUrl.origin
  );
  const sessionCookie = request.cookies.get("session")?.value;
  const refreshInfoCookie = request.cookies.get("refresh-info")?.value;

  if (!refreshInfoCookie) {
    console.log("❌ No existe refresh-info cookie");
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }

  let refreshInfo: RefreshInfoPayload;
  let session: Session | null = null;

  try {
    refreshInfo = (await decrypt(refreshInfoCookie)) as RefreshInfoPayload;
  } catch (e) {
    console.log("❌ Error decrypt refresh-info:", e);
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }

  if (sessionCookie) {
    try {
      session = (await decrypt(sessionCookie)) as Session;
    } catch (e) {
      console.log("⚠ session decrypt falló, se forzará refresh:", e);
    }
  }

  if (!refreshInfo) {
    console.log("❌ No hay refreshInfo después del decrypt");
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }
  const refreshTokenExpirationDate = new Date(
    refreshInfo.refreshTokenExpirationDate
  );

  const twoMinsInFuture = Date.now() + 2 * 60 * 1000; // 2 minutos
  const refreshTokenExpired =
    refreshTokenExpirationDate.getTime() < twoMinsInFuture;
  if (refreshTokenExpired) {
    console.log("❌ Refresh token expirado → redirigir a login");
    return { redirect: NextResponse.redirect(unauthorizedUrl) };
  }
  let needsRefresh = false;
  if (!session) {
    console.log("No existe session cookie → se necesita refresh");
    needsRefresh = true;
  } else {
    const accessExp = new Date(session.expiresAt);
    const accessTokenExpired = accessExp.getTime() < twoMinsInFuture;
    console.log("Estado access token:", {
      expira: accessExp.toISOString(),
      expired: accessTokenExpired,
    });
    needsRefresh = accessTokenExpired;
  }

  if (needsRefresh) {
    console.log("⚙ Ejecutando fetchRefreshToken...");
    try {
      const resp = await fetchRefreshToken(refreshInfo.refreshToken);
      if (resp && resp.accessToken) {
        console.log("✅ Refresh exitoso, nuevos tokens generados.");
        const newSession: Session = {
          token: resp.accessToken,
          expiresAt: resp.accessTokenExpirationDate,
        } as Session;

        const newRefreshInfo: RefreshInfoPayload = {
          email: refreshInfo.email,
          refreshToken: resp.refreshToken,
          refreshTokenExpirationDate: resp.refreshTokenExpirationDate,
        };

        const encryptedNewSession = await encrypt(newSession);
        const encryptedNewRefreshInfo = await encrypt(newRefreshInfo);

        console.log("Nuevas fechas:", {
          accessExp: resp.accessTokenExpirationDate,
          refreshExp: resp.refreshTokenExpirationDate,
        });

        console.log(
          ">>> [refreshSession] FIN OK. Duración:",
          Date.now() - start,
          "ms"
        );
        return {
          encryptedSessionData: encryptedNewSession,
          newSessionExpiresAt: new Date(resp.accessTokenExpirationDate),
          encryptedRefreshInfo: encryptedNewRefreshInfo,
          newRefreshInfoExpiresAt: new Date(resp.refreshTokenExpirationDate),
          newToken: resp.accessToken,
        };
      } else {
        console.log("❌ fetchRefreshToken sin accessToken en respuesta");
        return { redirect: NextResponse.redirect(unauthorizedUrl) };
      }
    } catch (error) {
      console.log("❌ Error en refreshSession:", error);
      return { redirect: NextResponse.redirect(unauthorizedUrl) };
    }
  }

  console.log(
    "✅ No se requiere refresh (token válido). Duración:",
    Date.now() - start,
    "ms"
  );
  return {};
}

// New function to set cookies and return the response
async function applyCookiesAndRespond(
  response: NextResponse,
  collectedData: CollectedCookies
): Promise<NextResponse> {
  const isProduction = process.env.NODE_ENV === "production";
  if (collectedData.encryptedSessionData && collectedData.newSessionExpiresAt) {
    response.cookies.set({
      name: "session",
      value: collectedData.encryptedSessionData,
      httpOnly: true,
      secure: isProduction,
      expires: collectedData.newSessionExpiresAt,
      sameSite: "lax",
      path: "/",
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
    });
  }
  return response;
}

export default auth(async (req) => {
  try {
    const collectedCookieData: CollectedCookies = {};
    const isLoggedIn = !!req.auth;
    if (req.nextUrl.pathname === "/") {
      if (isLoggedIn) {
        const newUrl = new URL(RoutesEnum.APP_ROOT, req.nextUrl.origin);
        return NextResponse.redirect(newUrl);
      }
      return NextResponse.next();
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
    let response = NextResponse.next();

    if (isLoggedIn || req.cookies.get("refresh-info")) {
      const refreshResult = await refreshSession(req);
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
    console.log("after settings the collected cookies");
    response = await applyCookiesAndRespond(response, collectedCookieData);
    console.log("after apply and respond the collected cookies");
    console.log(response);
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
