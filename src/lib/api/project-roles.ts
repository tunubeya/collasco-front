import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ProjectRole = {
  id: string;
  name: string;
  description?: string | null;
  isOwner: boolean;
  isDefault: boolean;
  permissionKeys: string[];
  memberCount: number;
};

export type ProjectPermission = {
  key: string;
  description?: string | null;
};

export type ProjectPermissionsResponse = {
  items: ProjectPermission[];
};

export type CreateProjectRoleDto = {
  name: string;
  description?: string | null;
  permissionKeys: string[];
};

export type UpdateProjectRoleDto = Partial<CreateProjectRoleDto>;

async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return [] as T;
}

export async function listProjectRoles(
  token: string,
  projectId: string
): Promise<ProjectRole[]> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/roles`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<ProjectRole[]>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listProjectPermissions(
  token: string,
  projectId: string
): Promise<ProjectPermissionsResponse> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/permissions`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<ProjectPermissionsResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createProjectRole(
  token: string,
  projectId: string,
  dto: CreateProjectRoleDto
): Promise<ProjectRole> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/roles`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as ProjectRole;
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateProjectRole(
  token: string,
  projectId: string,
  roleId: string,
  dto: UpdateProjectRoleDto
): Promise<ProjectRole> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/roles/${roleId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as ProjectRole;
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function deleteProjectRole(
  token: string,
  projectId: string,
  roleId: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/projects/${projectId}/roles/${roleId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as { success: boolean };
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}
