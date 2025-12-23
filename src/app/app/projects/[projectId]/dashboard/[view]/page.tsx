import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { loadProjectDashboardContext } from "../utils";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { actionButtonClass } from "@/ui/styles/action-button";
import { RoutesEnum } from "@/lib/utils";
import { ProjectQaDashboard, type DashboardDetailType } from "../../project-qa-dashboard.client";

type Params = { projectId: string; view: string };

const VIEW_CONFIG: Record<
  string,
  {
    type: DashboardDetailType;
    titleKey: string;
    descriptionKey: string;
    detailParams?: Partial<Record<DashboardDetailType, Record<string, string>>>;
  }
> = {
  "no-description": {
    type: "featuresMissingDescription",
    titleKey: "missingDescription.title",
    descriptionKey: "missingDescription.description",
  },
  "no-test-cases": {
    type: "featuresWithoutTestCases",
    titleKey: "featuresWithoutTestCases.title",
    descriptionKey: "featuresWithoutTestCases.description",
  },
  "with-runs": {
    type: "featureHealth",
    titleKey: "metrics.featuresWithRuns",
    descriptionKey: "featureHealth.description",
  },
  coverage: {
    type: "featureCoverage",
    titleKey: "featureCoverage.title",
    descriptionKey: "featureCoverage.description",
  },
  "open-runs": {
    type: "openRuns",
    titleKey: "openRuns.title",
    descriptionKey: "openRuns.description",
  },
  fullpass: {
    type: "runsWithFullPass",
    titleKey: "runsWithFullPass.title",
    descriptionKey: "runsWithFullPass.description",
  },
};

export default async function ProjectDashboardDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { projectId, view } = await params;
  const config = VIEW_CONFIG[view];
  if (!config) notFound();

  const [{ token, project }, tBreadcrumbs, tDashboard] = await Promise.all([
    loadProjectDashboardContext(projectId),
    getTranslations("app.common.breadcrumbs"),
    getTranslations("app.qa.dashboard"),
  ]);

  const title = tDashboard(config.titleKey);
  const description = tDashboard(config.descriptionKey);

  const breadcrumbItems = [
    { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
    { label: project.name, href: `/app/projects/${project.id}` },
    {
      label: tBreadcrumbs("dashboard"),
      href: `/app/projects/${project.id}/dashboard`,
    },
    { label: title },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} className="mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project.name}</p>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={`/app/projects/${project.id}/dashboard`}
          className={actionButtonClass({ variant: "neutral" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          {tDashboard("detail.back")}
        </Link>
      </div>

      <ProjectQaDashboard
        token={token}
        projectId={projectId}
        initialDetail={config.type}
        showSummary={false}
        showHeader={false}
        detailParams={config.detailParams}
      />
    </div>
  );
}
