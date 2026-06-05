import { handleUnauthorized } from "@/lib/server-auth-helpers";
import { fetchWithAuth } from "@/lib/utils";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ReleaseStatus = "DRAFT" | "PREPARED" | "RELEASED";
export type ReleaseEntityType = "PROJECT" | "MODULE" | "FEATURE";
export type ReleaseChangeType = "added" | "removed" | "modified";

export type ReleaseUser = {
  id: string;
  email: string;
  name: string | null;
};

export type ReleaseListItem = {
  id: string;
  versionNumber: number;
  name: string | null;
  status: ReleaseStatus;
  notesGeneratedAt: string | null;
  preparedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documentationItemCount: number;
};

export type ReleaseDocumentationItem = {
  id: string;
  entityType: ReleaseEntityType;
  entityId: string;
  entityName: string | null;
  documentationVersion: {
    id: string;
    versionNumber: number;
    status: "PUBLISHED";
    changelog: string | null;
    publishedAt: string | null;
  };
};

export type ReleaseDetail = {
  id: string;
  projectId: string;
  versionNumber: number;
  name: string | null;
  status: ReleaseStatus;
  notesContent: string | null;
  notesGeneratedAt: string | null;
  preparedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ReleaseUser | null;
  notesUpdatedBy: ReleaseUser | null;
  documentationItems: ReleaseDocumentationItem[];
};

export type ReleaseChangedLabel = {
  labelId: string;
  labelName: string;
  changeType: ReleaseChangeType;
};

export type DocumentationStatus = {
  projectId: string;
  hasMissingPublishedVersions: boolean;
  hasPendingChanges: boolean;
  entityCount: number;
  missingPublishedVersions: Array<{
    entityType: ReleaseEntityType;
    entityId: string;
    entityName: string;
  }>;
  pendingChanges: Array<{
    entityType: ReleaseEntityType;
    entityId: string;
    entityName: string;
    draftVersionNumber: number;
    baseVersionNumber: number | null;
    changedLabels: ReleaseChangedLabel[];
  }>;
};

export type ReleasePreview = {
  release: {
    id: string;
    versionNumber: number;
    name: string | null;
  };
  previousRelease: {
    id: string;
    versionNumber: number;
    name: string | null;
  } | null;
  changes: Array<{
    entityType: ReleaseEntityType;
    entityId: string;
    entityName: string | null;
    previousVersionNumber: number | null;
    currentVersionNumber: number | null;
    changeType: ReleaseChangeType;
    changedLabels: Array<
      ReleaseChangedLabel & {
        before: {
          content: string | null;
          isNotApplicable: boolean;
        } | null;
        after: {
          content: string | null;
          isNotApplicable: boolean;
        } | null;
      }
    >;
  }>;
};

export type ReleaseNotes = {
  releaseId: string;
  content: string | null;
  generatedAt: string | null;
  updatedAt: string;
  notesUpdatedById: string | null;
};

export type ReleaseShareLink = {
  id: string;
  projectId: string;
  token: string;
  url: string;
  expiresAt: string | null;
  createdAt: string;
};

export type ListReleaseShareLinksResponse =
  | ReleaseShareLink[]
  | { items?: ReleaseShareLink[] };

export type PublicReleaseNotesResponse = {
  project: {
    id: string;
    name: string;
  };
  releases: Array<{
    id: string;
    versionNumber: number;
    name: string | null;
    releasedAt: string | null;
    changelog: {
      content: string | null;
      updatedAt: string;
    };
  }>;
};

export type PrepareReleaseResponse = {
  release: ReleaseDetail;
  documentationStatus: DocumentationStatus;
};

export type ReleaseConflictPayload = {
  statusCode: 409;
  message:
    | string
    | {
        message?: string;
        documentationStatus?: DocumentationStatus;
      };
  error: "Conflict";
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

async function requestRelease<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  try {
    const res = await fetchWithAuth(`${apiUrl}${path}`, init, token);
    if (!res.ok) throw res;
    return await parseJsonResponse<T>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export function listProjectReleases(
  token: string,
  projectId: string,
): Promise<ReleaseListItem[]> {
  return requestRelease(token, `/projects/${projectId}/releases`, {
    method: "GET",
  });
}

export function createProjectRelease(
  token: string,
  projectId: string,
  dto: { name?: string } = {},
): Promise<ReleaseDetail> {
  return requestRelease(token, `/projects/${projectId}/releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}

export function getProjectRelease(
  token: string,
  projectId: string,
  releaseId: string,
): Promise<ReleaseDetail> {
  return requestRelease(token, `/projects/${projectId}/releases/${releaseId}`, {
    method: "GET",
  });
}

export function updateProjectRelease(
  token: string,
  projectId: string,
  releaseId: string,
  dto: { name?: string; status?: Exclude<ReleaseStatus, "RELEASED"> },
): Promise<ReleaseDetail> {
  return requestRelease(token, `/projects/${projectId}/releases/${releaseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}

export function getProjectReleaseDocumentationStatus(
  token: string,
  projectId: string,
): Promise<DocumentationStatus> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/documentation-status`,
    { method: "GET" },
  );
}

export function prepareProjectRelease(
  token: string,
  projectId: string,
  releaseId: string,
): Promise<PrepareReleaseResponse> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/${releaseId}/prepare`,
    { method: "POST" },
  );
}

export function releaseProjectRelease(
  token: string,
  projectId: string,
  releaseId: string,
): Promise<ReleaseDetail> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/${releaseId}/release`,
    { method: "POST" },
  );
}

export function getProjectReleasePreview(
  token: string,
  projectId: string,
  releaseId: string,
): Promise<ReleasePreview> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/${releaseId}/preview`,
    { method: "GET" },
  );
}

export function getProjectReleaseNotes(
  token: string,
  projectId: string,
  releaseId: string,
): Promise<ReleaseNotes> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/${releaseId}/notes`,
    { method: "GET" },
  );
}

export function updateProjectReleaseNotes(
  token: string,
  projectId: string,
  releaseId: string,
  dto: { content?: string },
): Promise<ReleaseNotes> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/${releaseId}/notes`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  );
}

export function generateProjectReleaseNotes(
  token: string,
  projectId: string,
  releaseId: string,
): Promise<ReleaseNotes> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/${releaseId}/notes/generate`,
    { method: "POST" },
  );
}

export function createReleaseShareLink(
  token: string,
  projectId: string,
  dto: { expiresAt?: string | null } = {},
): Promise<ReleaseShareLink> {
  return requestRelease(token, `/projects/${projectId}/releases/share-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}

export async function listReleaseShareLinks(
  token: string,
  projectId: string,
): Promise<ReleaseShareLink[]> {
  const payload = await requestRelease<ListReleaseShareLinksResponse>(
    token,
    `/projects/${projectId}/releases/share-links`,
    { method: "GET" },
  );
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function deleteReleaseShareLink(
  token: string,
  projectId: string,
  linkId: string,
): Promise<{ ok: boolean }> {
  return requestRelease(
    token,
    `/projects/${projectId}/releases/share-links/${linkId}`,
    { method: "DELETE" },
  );
}

export async function getPublicReleaseNotes(
  shareToken: string,
): Promise<PublicReleaseNotesResponse> {
  const res = await fetch(`${apiUrl}/public/releases/links/${shareToken}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw res;
  return await parseJsonResponse<PublicReleaseNotesResponse>(res);
}
