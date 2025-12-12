import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getTestRun } from "@/lib/api/qa";
import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { handlePageError } from "@/lib/handle-page-error";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { ProjectTestRunClient } from "./project-test-run.client";

type Params = { projectId: string; runId: string };

export default async function ProjectTestRunPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { projectId, runId } = await params;
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const tBreadcrumbs = await getTranslations("app.common.breadcrumbs");
  const tRuns = await getTranslations("app.qa.runs");

  let run = null;
  try {
    run = await getTestRun(session.token, runId);
  } catch (error) {
    await handlePageError(error);
  }

  if (!run || run.projectId !== projectId) {
    notFound();
  }

  const projectLabel = run.project?.name ?? projectId;
  const runLabel = run.name?.trim() || tRuns("list.runFallback", { id: run.id });

  const breadcrumbItems =
    run.feature && run.feature.id
      ? [
          { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
          {
            label: projectLabel,
            href: `${RoutesEnum.APP_PROJECTS}/${projectId}`,
          },
          {
            label: run.feature.name ?? run.feature.id,
            href: `${RoutesEnum.APP_PROJECTS}/${projectId}/features/${run.feature.id}`,
          },
          { label: runLabel },
        ]
      : [
          { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
          {
            label: projectLabel,
            href: `${RoutesEnum.APP_PROJECTS}/${projectId}`,
          },
          { label: runLabel },
        ];

  return (
    <div className="grid gap-6">
      <Breadcrumb items={breadcrumbItems} />
      <ProjectTestRunClient token={session.token} run={run} />
    </div>
  );
}
