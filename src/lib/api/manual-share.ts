import { fetchWithAuth } from "@/lib/utils";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ManualShareLabel = {
  id: string;
  name: string;
  isMandatory?: boolean;
  order?: number;
};

export type ManualShareLink = {
  id: string;
  projectId?: string;
  labelIds: string[];
  labels?: ManualShareLabel[];
  createdAt: string;
  revokedAt?: string | null;
  isRevoked?: boolean;
};

export type CreateManualShareLinkResponse = ManualShareLink;

export type ListManualShareLinksResponse = {
  items: ManualShareLink[];
};

export async function createManualShareLink(
  token: string,
  projectId: string,
  labelIds: string[],
): Promise<CreateManualShareLinkResponse> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/manual/share-links`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelIds }),
    },
    token,
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to create share link");
  }
  return (await res.json()) as CreateManualShareLinkResponse;
}

export async function listManualShareLinks(
  token: string,
  projectId: string,
): Promise<ListManualShareLinksResponse> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/manual/share-links`,
    { method: "GET" },
    token,
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to load share links");
  }
  return (await res.json()) as ListManualShareLinksResponse;
}

export async function revokeManualShareLink(
  token: string,
  projectId: string,
  linkId: string,
): Promise<{ ok: boolean }> {
  const res = await fetchWithAuth(
    `${apiUrl}/projects/${projectId}/manual/share-links/${linkId}`,
    { method: "DELETE" },
    token,
  );
  if (!res.ok) {
    const message = await res.text().catch(() => null);
    throw new Error(message || "Failed to revoke share link");
  }
  return (await res.json()) as { ok: boolean };
}
