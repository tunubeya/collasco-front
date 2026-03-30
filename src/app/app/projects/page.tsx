// src/app/app/projects/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { fetchGetUserProfile, fetchProjectsMine } from "@/lib/data";
import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import ProjectsList from "@/ui/components/projects/projects-list.client";
import { handlePageError } from "@/lib/handle-page-error";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Plus } from "lucide-react";
import { listProjectRoles } from "@/lib/api/project-roles";
import { hasPermission, resolveMemberRoleId, resolveRolePermissions } from "@/lib/permissions";

type SearchParams = {
  page?: string;
  limit?: string;
  q?: string;
  sort?: string;
};

// 👇 Cambia la firma: Promise<SearchParams>
type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);
  const token = session.token;
  const t = await getTranslations("app.projects.list");

  const page = Math.max(1, Number.parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const limit = Math.max(
    1,
    Number.parseInt((await searchParams)?.limit ?? "20", 10) || 20
  );
  const q = (await searchParams)?.q?.trim();
  const sort = (await searchParams)?.sort ?? "-updatedAt";

  let result;
  try {
    result = await fetchProjectsMine(token, { page, limit, q, sort });
  }  catch (error) {
  await handlePageError(error);
}

  const items = result?.items ?? [];
  const total = Math.max(0, Number(result?.total) || items.length);
  const currentPage = Math.max(1, Number(result?.page) || page);
  const currentLimit = Math.max(1, Number(result?.limit) || limit);
  let currentUserId: string | null = null;
  try {
    const profile = await fetchGetUserProfile(token);
    currentUserId = profile.id;
  } catch (error) {
    await handlePageError(error);
  }

  const canReadByProjectId: Record<string, boolean> = {};
  for (const project of items) {
    try {
      const roles = await listProjectRoles(token, project.id);
      const roleId = resolveMemberRoleId({
        project,
        members: project.members ?? null,
        currentUserId,
        roles,
      });
      const permissionKeys = resolveRolePermissions(roles, roleId);
      const permissionSet = new Set(permissionKeys);
      canReadByProjectId[project.id] = hasPermission(
        permissionSet,
        "project.read",
      );
    } catch {
      // If role permissions cannot be fetched, assume no read access
      canReadByProjectId[project.id] = false;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/app/projects/new"
          className={actionButtonClass()}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {t("create")}
        </Link>
      </div>

      <ProjectsList
        items={items}
        canReadByProjectId={canReadByProjectId}
        pagination={{
          total,
          page: currentPage,
          limit: currentLimit,
          q: q ?? "",
          sort,
        }}
      />
    </div>
  );
}
