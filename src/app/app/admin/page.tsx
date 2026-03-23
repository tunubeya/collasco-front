import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";
import { UserRole } from "@/lib/definitions";
import { listProjectsMine } from "@/lib/api/projects";
import type { Project } from "@/lib/model-definitions/project";
import { fetchGetUserProfile } from "@/lib/data";
import { handlePageError } from "@/lib/handle-page-error";
import AdminNotifications from "./admin-notifications.client";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect(RoutesEnum.LOGIN);
  }

  let isAdmin = session.role === UserRole.ADMIN;
  if (!isAdmin) {
    try {
      const profile = await fetchGetUserProfile(session.token);
      isAdmin = profile.role === UserRole.ADMIN;
    } catch (error) {
      await handlePageError(error);
    }
  }

  if (!isAdmin) {
    redirect(RoutesEnum.ERROR_UNAUTHORIZED);
  }

  let projects: Project[] = [];
  try {
    const result = await listProjectsMine(session.token, { limit: 100 });
    projects = result.items ?? [];
  } catch (error) {
    await handlePageError(error);
  }

  return (
    <div className="p-6 md:p-10">
      <div className="space-y-6">
        <AdminNotifications token={session.token} projects={projects} />
      </div>
    </div>
  );
}
