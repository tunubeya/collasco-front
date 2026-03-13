import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";
import type {
  TicketDetail,
  TicketListResponse,
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

async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

function buildListUrl(base: string, params?: ListTicketsParams) {
  const url = new URL(`${apiUrl}${base}`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
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

export async function listTicketsMine(
  token: string,
  params?: ListTicketsParams
): Promise<TicketListResponse> {
  try {
    const res = await fetchWithAuth(
      buildListUrl("/tickets/mine", params),
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

export async function listTicketsAssigned(
  token: string,
  params?: ListTicketsParams
): Promise<TicketListResponse> {
  try {
    const res = await fetchWithAuth(
      buildListUrl("/tickets/assigned", params),
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

export async function listTicketsByProject(
  token: string,
  projectId: string,
  params?: ListTicketsParams
): Promise<TicketListResponse> {
  try {
    const res = await fetchWithAuth(
      buildListUrl(`/projects/${projectId}/tickets`, params),
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

export async function listTicketsByFeature(
  token: string,
  featureId: string,
  params?: ListTicketsParams
): Promise<TicketListResponse> {
  try {
    const res = await fetchWithAuth(
      buildListUrl(`/features/${featureId}/tickets`, params),
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
