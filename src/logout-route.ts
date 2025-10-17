//src/logout-route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRootDomain, RoutesEnum } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? RoutesEnum.LOGIN;

  const host = req.headers.get("host") ?? "";
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = isProduction ? getRootDomain(host) : undefined;

  const resp = NextResponse.redirect(new URL(next, req.nextUrl.origin));

  const expired = {
    httpOnly: true,
    secure: isProduction,
    expires: new Date(0),
    sameSite: "lax" as const,
    path: "/",
    domain: cookieDomain,
  };

  resp.cookies.set({ name: "session", value: "", ...expired });
  resp.cookies.set({ name: "store-data", value: "", ...expired });
  resp.cookies.set({ name: "refresh-info", value: "", ...expired });

  return resp;
}
