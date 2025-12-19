import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { fetchProjectById } from "@/lib/data";
import { handlePageError } from "@/lib/handle-page-error";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { actionButtonClass } from "@/ui/styles/action-button";
import { ProjectQaDashboard } from "../project-qa-dashboard.client";
import type { Project } from "@/lib/model-definitions/project";

type Params = { projectId: string };

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const [tBreadcrumbs, tTabs, tActions] = await Promise.all([
    getTranslations("app.common.breadcrumbs"),
    getTranslations("app.projects.detail.tabs"),
    getTranslations("app.projects.detail.actions"),
  ]);

  let project: Project | null = null;
  try {
    project = await fetchProjectById(session.token, projectId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!project) notFound();

  const breadcrumbItems = [
    { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
    { label: project.name, href: `/app/projects/${project.id}` },
    { label: tBreadcrumbs("dashboard") },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbItems} className="mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project.name}</p>
          <h1 className="text-2xl font-bold">{tTabs("dashboard")}</h1>
        </div>
        <Link
          href={`/app/projects/${project.id}`}
          className={actionButtonClass({ variant: "neutral" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          {tActions("backToProject", { default: "Back to project" })}
        </Link>
      </div>
      <ProjectQaDashboard token={session.token} projectId={projectId} />
    </div>
  );
}
