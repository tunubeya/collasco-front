import { NextResponse } from "next/server";

import { fetchRefreshToken } from "@/lib/data";
import { encrypt, getRefreshInfo } from "@/lib/session";

export async function POST() {
  const refreshInfo = await getRefreshInfo();
  if (!refreshInfo?.refreshToken) {
    return NextResponse.json(
      { error: "Missing refresh token" },
      { status: 401 },
    );
  }

  try {
    const refreshed = await fetchRefreshToken(refreshInfo.refreshToken);
    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.json({
      newAccessToken: refreshed.accessToken,
      expiresAt: refreshed.accessTokenExpirationDate,
    });

    const encryptedSession = await encrypt({
      token: refreshed.accessToken,
      expiresAt: refreshed.accessTokenExpirationDate,
    });
    const encryptedRefreshInfo = await encrypt({
      email: refreshInfo.email,
      refreshToken: refreshed.refreshToken,
      refreshTokenExpirationDate: refreshed.refreshTokenExpirationDate,
    });

    response.cookies.set({
      name: "session",
      value: encryptedSession,
      httpOnly: true,
      secure: isProduction,
      expires: new Date(refreshed.accessTokenExpirationDate),
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set({
      name: "refresh-info",
      value: encryptedRefreshInfo,
      httpOnly: true,
      secure: isProduction,
      expires: new Date(refreshed.refreshTokenExpirationDate),
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Failed to refresh token", error);
    return NextResponse.json(
      { error: "Refresh failed" },
      { status: 401 },
    );
  }
}
