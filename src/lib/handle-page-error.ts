import { redirect, notFound } from "next/navigation";
import { handleUnauthorized, UnauthorizedError } from "@/lib/server-auth-helpers";
import { RoutesEnum } from "@/lib/utils";

async function readResponseMessage(res: Response) {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => null);
      if (j && (j.message || j.error)) {
        return String(j.message || j.error);
      }
      return JSON.stringify(j);
    }
    const txt = await res.text().catch(() => "");
    return txt || res.statusText;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function handlePageError(error: unknown) {
  const res = error instanceof Response ? error : undefined;

  // 🚫 Forbidden
  if (res?.status === 403) {
    redirect(RoutesEnum.ERROR_UNAUTHORIZED);
  }

  // ❌ Not Found
  if (res?.status === 404) {
    notFound();
  }

  // 🔒 Unauthorized or expired token
  try {
    await handleUnauthorized(error);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect(`/api/auth/logout?next=${encodeURIComponent(RoutesEnum.LOGIN)}`);
    }
    throw e;
  }
    if (res) {
    const msg = await readResponseMessage(res);
    throw new Error(`Request failed (${res.status}): ${msg}`);
  }


  // 🔁 Otros errores → relanzar
  throw error;
}