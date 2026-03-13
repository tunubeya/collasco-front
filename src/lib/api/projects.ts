import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";
import type { Project } from "@/lib/model-definitions/project";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ListProjectsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
};

export type ProjectListResponse = {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

export async function listProjectsMine(
  token: string,
  params?: ListProjectsParams
): Promise<ProjectListResponse> {
  try {
    const url = new URL(`${apiUrl}/projects/mine`);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.sort) url.searchParams.set("sort", params.sort);
    if (params?.q) url.searchParams.set("q", params.q);
    const res = await fetchWithAuth(url.toString(), { method: "GET" }, token);
    if (!res.ok) throw res;
    return await parseJson<ProjectListResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

