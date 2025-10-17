// src/lib/server-auth-helpers.ts

/** Error de señal para 401/419 (token vencido/no válido) */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Type guard cómodo */
function isResponse(e: unknown): e is Response {
  return typeof Response !== "undefined" && e instanceof Response;
}

/**
 * Si es 401/419 -> lanza UnauthorizedError (para que la página redirija a /api/auth/logout)
 * Si no, no hace nada (deja que el caller maneje 403/404 u otros).
 */
export async function handleUnauthorized(error: unknown): Promise<void> {
  if (isResponse(error)) {
    if (error.status === 401 || error.status === 419) {
      throw new UnauthorizedError();
    }
  }
  // no-op para otros casos
}
