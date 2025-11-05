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

export async function handleUnauthorized(error: unknown): Promise<void> {
  if (isResponse(error)) {
    if (error.status === 401 || error.status === 419) {
      throw new UnauthorizedError();
    }
  }
  // no-op para otros casos
}
