import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";
import { fetchProjectById } from "@/lib/data";
import { handlePageError } from "@/lib/handle-page-error";
import type { Project } from "@/lib/model-definitions/project";

export async function loadProjectDashboardContext(projectId: string): Promise<{
  token: string;
  project: Project;
}> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);
  let project: Project | null = null;
  try {
    project = await fetchProjectById(session.token, projectId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!project) notFound();
  return { token: session.token, project };
}
