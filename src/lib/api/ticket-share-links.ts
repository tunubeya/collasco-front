import { fetchWithAuth } from "@/lib/utils";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type TicketShareLink = {
  id: string;
  name?: string | null;
  token?: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  ticket?: {
    id: string;
    title?: string | null;
  } | null;
  revokedAt?: string | null;
  active?: boolean;
};

export type CreateTicketShareLinkResponse = {
  id: string;
  token: string;
  createdAt: string;
};

export type ListTicketShareLinksResponse = {
  items: TicketShareLink[];
};

export async function createTicketShareLink(
  token: string,
  projectId: string,
  payload?: { name?: string }
): Promise<CreateTicketShareLinkResponse> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/ticket-share-links`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    },
    token
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to create share link");
  }
  return (await res.json()) as CreateTicketShareLinkResponse;
}

export async function listTicketShareLinks(
  token: string,
  projectId: string
): Promise<ListTicketShareLinksResponse> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/ticket-share-links`,
    { method: "GET" },
    token
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to load share links");
  }
  const payload = await res.json();
  if (Array.isArray(payload)) {
    return { items: payload as TicketShareLink[] };
  }
  if (payload && typeof payload === "object" && "items" in payload) {
    return payload as ListTicketShareLinksResponse;
  }
  return { items: [] };
}

export async function refreshTicketShareLink(
  token: string,
  projectId: string,
  linkId: string
): Promise<CreateTicketShareLinkResponse> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/ticket-share-links/${linkId}/refresh`,
    { method: "POST" },
    token
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to refresh share link");
  }
  return (await res.json()) as CreateTicketShareLinkResponse;
}

export async function revokeTicketShareLink(
  token: string,
  projectId: string,
  linkId: string
): Promise<{ ok: boolean }> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/ticket-share-links/${linkId}`,
    { method: "DELETE" },
    token
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to revoke share link");
  }
  return (await res.json()) as { ok: boolean };
}
