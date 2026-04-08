import { fetchWithAuth } from "@/lib/utils";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type TicketShareLink = {
  id: string;
  token?: string | null;
  createdAt: string;
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
  projectId: string
): Promise<CreateTicketShareLinkResponse> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/ticket-share-links`,
    { method: "POST" },
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
  return (await res.json()) as ListTicketShareLinksResponse;
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
