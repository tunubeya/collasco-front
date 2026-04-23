import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";
import type {
  TicketDetail,
  TicketListResponse,
  TicketImage,
  TicketSection,
  TicketSectionType,
  TicketStatus,
  TicketUpdateResponse,
  TicketFeature,
} from "@/lib/model-definitions/ticket";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ListTicketsParams = {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  scope?: "mine" | "assigned" | "unassigned" | "resolved" | "all" | "external";
  projectId?: string;
};

export type CreateTicketRequest = {
  title: string;
  content: string;
  featureId?: string;
  projectId?: string;
};

export type UpdateTicketRequest = {
  title?: string;
  status?: TicketStatus;
  assigneeId?: string | null;
  featureId?: string | null;
};

export type CreateTicketSectionRequest = {
  type: TicketSectionType;
  content: string;
  title?: string | null;
};

export type UpdateTicketSectionRequest = {
  content: string;
  title?: string | null;
};

export type TicketOpenResponse = {
  sections: TicketSection[];
  lastMessageId: string | null;
};

export type TicketCountsResponse = {
  counts: {
    all: number;
    mine: number;
    assigned: number;
    unassigned: number;
    resolved: number;
    external: number;
  };
};

async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

function buildListUrl(params?: ListTicketsParams) {
  const url = new URL(`${apiUrl}/tickets`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.scope) url.searchParams.set("scope", params.scope);
  if (params?.projectId) url.searchParams.set("projectId", params.projectId);
  return url.toString();
}

function buildAutocompleteUrl(projectId: string, query?: string) {
  const url = new URL(`${apiUrl}/projects/${projectId}/tickets/autocomplete`);
  if (query) url.searchParams.set("q", query);
  return url.toString();
}

export async function createTicket(
  token: string,
  projectId: string,
  payload: CreateTicketRequest
): Promise<TicketDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, projectId }),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listTicketsAll(
  token: string,
  params?: ListTicketsParams
): Promise<TicketListResponse> {
  try {
    const res = await fetchWithAuth(
      buildListUrl(params),
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketListResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getTicketCounts(
  token: string,
  params?: Pick<ListTicketsParams, "projectId">
): Promise<TicketCountsResponse> {
  try {
    const url = new URL(`${apiUrl}/tickets/counts`);
    if (params?.projectId) url.searchParams.set("projectId", params.projectId);
    const res = await fetchWithAuth(
      url.toString(),
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketCountsResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listTicketsByFeature(
  token: string,
  featureId: string,
  params?: ListTicketsParams
): Promise<TicketListResponse> {
  try {
    const url = new URL(`${apiUrl}/features/${featureId}/tickets`);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.status) url.searchParams.set("status", params.status);
    const res = await fetchWithAuth(
      url.toString(),
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketListResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getTicket(
  token: string,
  ticketId: string
): Promise<TicketDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function openTicket(
  token: string,
  ticketId: string
): Promise<TicketOpenResponse> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}/open`,
      { method: "POST" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketOpenResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateTicket(
  token: string,
  ticketId: string,
  payload: UpdateTicketRequest
): Promise<TicketUpdateResponse> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketUpdateResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function addTicketSection(
  token: string,
  ticketId: string,
  payload: CreateTicketSectionRequest
): Promise<TicketSection> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}/sections`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketSection>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateTicketSection(
  token: string,
  ticketId: string,
  sectionId: string,
  payload: UpdateTicketSectionRequest
): Promise<TicketSection> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}/sections/${sectionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketSection>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function autocompleteTicketFeatures(
  token: string,
  projectId: string,
  query?: string
): Promise<TicketFeature[]> {
  try {
    const res = await fetchWithAuth(
      buildAutocompleteUrl(projectId, query),
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketFeature[]>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listTicketImages(
  token: string,
  ticketId: string
): Promise<TicketImage[]> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}/images`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketImage[]>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function uploadTicketImage(
  token: string,
  ticketId: string,
  payload: { file: File; name: string }
): Promise<TicketImage> {
  try {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("name", payload.name);
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}/images`,
      {
        method: "POST",
        body: formData,
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<TicketImage>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function deleteTicketImage(
  token: string,
  ticketId: string,
  imageId: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}/images/${imageId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<{ success: boolean }>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function deleteTicket(
  token: string,
  ticketId: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/tickets/${ticketId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<{ success: boolean }>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}
