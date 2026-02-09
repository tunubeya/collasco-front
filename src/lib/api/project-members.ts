import { ProjectMemberRole } from "@/lib/definitions";
import type { ProjectMember } from "@/lib/model-definitions/project";
import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type AddProjectMemberDto = {
  email: string;
  role?: ProjectMemberRole;
};

export type UpdateProjectMemberDto = {
  role: ProjectMemberRole;
};

async function parseMembersResponse(res: Response): Promise<ProjectMember[]> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as ProjectMember[];
  }
  return [];
}

export async function listProjectMembers(
  token: string,
  projectId: string
): Promise<ProjectMember[]> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/members`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseMembersResponse(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function addProjectMember(
  token: string,
  projectId: string,
  dto: AddProjectMemberDto
): Promise<ProjectMember[]> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseMembersResponse(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateProjectMemberRole(
  token: string,
  projectId: string,
  userId: string,
  dto: UpdateProjectMemberDto
): Promise<ProjectMember[]> {
  try {
    
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/members/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseMembersResponse(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function removeProjectMember(
  token: string,
  projectId: string,
  userId: string
): Promise<ProjectMember[]> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/members/${userId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    return await parseMembersResponse(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}
