// src/app/app/projects/[projectId]/features/[featureId]/page.tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import {
  FeaturePriority,
  FeatureStatus,
  ProjectMemberRole,
  StructureModuleNode,
} from "@/lib/definitions";
import {
  fetchFeatureById,
  fetchGetUserProfile,
  fetchModuleById,
  fetchProjectById,
  fetchProjectStructure,
} from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Feature } from "@/lib/model-definitions/feature";
import type { Project } from "@/lib/model-definitions/project";
import { RoutesEnum } from "@/lib/utils";
import { handlePageError } from "@/lib/handle-page-error";
import type { QaLinkedFeature } from "@/lib/api/qa";
import { getTestHealth, listLinkedFeatures } from "@/lib/api/qa";

// 👇 importa la server action de delete
import { deleteFeature } from "@/app/app/projects/[projectId]/features/[featureId]/edit/actions";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { findModulePath } from "@/lib/structure-helpers";
import { actionButtonClass } from "@/ui/styles/action-button";
import { FeatureTabs } from "./feature-tabs.client";
import { Pencil, Trash2 } from "lucide-react";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";

type Params = { projectId: string; featureId: string };

export default async function FeatureDetailPage({
  params,
}: {
  // 👇 Next 15: params asíncrono
  params: Promise<Params>;
}) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const t = await getTranslations("app.projects.feature");
  const tStatus = await getTranslations("app.common.featureStatus");
  const tPriority = await getTranslations("app.common.featurePriority");
  const tBreadcrumbs = await getTranslations("app.common.breadcrumbs");
  const formatter = await getFormatter();

  // 👇 await params
  const { projectId, featureId } = await params;

  let project: Project | null = null;
  try {
    project = await fetchProjectById(session.token, projectId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!project) notFound();

  let feature: Feature | null = null;
  try {
    feature = await fetchFeatureById(session.token, featureId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!feature) notFound();

  let currentUserId: string | null = null;
  try {
    const profile = await fetchGetUserProfile(session.token);
    currentUserId = profile.id;
  } catch (error) {
    await handlePageError(error);
  }

  let moduleCrumbs: { id: string; name: string }[] = [];
  let linkableFeatures: Array<{
    id: string;
    name: string;
    moduleId: string | null;
    moduleName: string | null;
  }> = [];
  try {
    const structure = await fetchProjectStructure(session.token, projectId, {
      limit: 1000,
      sort: "sortOrder",
    });
    const chain = findModulePath(structure.modules, feature.moduleId);
    if (chain) {
      moduleCrumbs = chain.map((node) => ({ id: node.id, name: node.name }));
    }
    linkableFeatures = extractFeatureOptions(structure.modules).filter(
      (item) => item.id !== feature.id
    );
  } catch (error) {
    await handlePageError(error);
  }
  if (moduleCrumbs.length === 0 && feature.moduleId) {
    try {
      const moduleInfo = await fetchModuleById(session.token, feature.moduleId);
      moduleCrumbs = [{ id: moduleInfo.id, name: moduleInfo.name }];
    } catch (error) {
      await handlePageError(error);
    }
  }

  const formattedUpdatedAt = formatter.dateTime(new Date(feature.updatedAt), {
    dateStyle: "medium",
  });
  const hasFeatureDescription = Boolean(feature.description?.trim());

  const breadcrumbItems = [
    { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
    { label: project.name, href: `/app/projects/${projectId}` },
    ...moduleCrumbs.map((crumb) => ({
      label: crumb.name,
      href: `/app/projects/${projectId}/modules/${crumb.id}`,
    })),
    { label: feature.name },
  ];

  const inferredRole =
    project.members?.find((member) => member.userId === currentUserId)?.role ??
    (project.ownerId === currentUserId ? ProjectMemberRole.OWNER : null);
  const membershipRole = project.membershipRole ?? inferredRole ?? null;
  const canManageFeature =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER;
  const canManageQa =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER ||
    membershipRole === ProjectMemberRole.DEVELOPER;

  let linkedFeatures: QaLinkedFeature[] = [];
  try {
    linkedFeatures = await listLinkedFeatures(session.token, feature.id);
  } catch (error) {
    await handlePageError(error);
  }

  const linkedFeaturesCount =
    feature.linkedFeaturesCount ?? linkedFeatures.length ?? 0;

  let testCasesCount = feature.testCasesCount ?? null;
  if (testCasesCount == null) {
    try {
      const health = await getTestHealth(session.token, feature.id);
      testCasesCount = health.testCaseCounts?.total ?? testCasesCount ?? 0;
    } catch (error) {
      console.error("[FeatureDetailPage] Failed to load QA health:", error);
    }
  }

  return (
    <div className="grid gap-6">
      <Breadcrumb items={breadcrumbItems} className="mb-2" />
      <header className="rounded-xl border bg-background p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{feature.name}</h1>
            {hasFeatureDescription && (
              <div className="mt-2">
                <RichTextPreview
                  value={feature.description}
                  emptyLabel={t("description.empty")}
                />
              </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {t("header.project", { name: project.name })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("header.updated", { date: formattedUpdatedAt })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Badges */}
            <FeatureStatusBadge
              status={feature.status}
              label={tStatus(feature.status)}
            />
            {feature.priority ? (
              <FeaturePriorityBadge
                priority={feature.priority}
                label={tPriority(feature.priority)}
              />
            ) : null}

            {/* Navegar al módulo */}
            <Link
              href={`/app/projects/${projectId}/modules/${feature.moduleId}`}
              className="text-xs text-primary hover:underline"
            >
              {t("header.viewModule")}
            </Link>

            {/* Acciones: Editar / Eliminar */}
            {canManageFeature && (
              <div className="mt-2 flex gap-2">
                <Link
                  href={`/app/projects/${projectId}/features/${featureId}/edit`}
                  className={actionButtonClass({ size: "xs" })}
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.edit", { default: "Editar" })}
                </Link>

                <form
                  action={deleteFeature.bind(
                    null,
                    projectId,
                    featureId,
                    feature.moduleId
                  )}
                >
                  <button
                    type="submit"
                    className={actionButtonClass({
                      variant: "destructive",
                      size: "xs",
                    })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.delete", { default: "Eliminar" })}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <FeatureTabs
        feature={feature}
        project={project}
        featureId={featureId}
        token={session.token}
        currentUserId={currentUserId ?? undefined}
        canManageQa={canManageQa}
        initialLinkedFeatures={linkedFeatures}
        linkableFeatures={linkableFeatures}
        projectId={projectId}
        linkedFeaturesCount={linkedFeaturesCount}
        testCasesCount={testCasesCount ?? 0}
      />
    </div>
  );
}

function extractFeatureOptions(
  modules: StructureModuleNode[]
): Array<{
  id: string;
  name: string;
  moduleId: string | null;
  moduleName: string | null;
}> {
  const result: Array<{
    id: string;
    name: string;
    moduleId: string | null;
    moduleName: string | null;
  }> = [];

  const visitModule = (node: StructureModuleNode) => {
    node.items.forEach((item) => {
      if (item.type === "feature") {
        result.push({
          id: item.id,
          name: item.name,
          moduleId: node.id,
          moduleName: node.name ?? null,
        });
      } else {
        visitModule(item);
      }
    });
  };

  modules.forEach((module) => visitModule(module));

  return result;
}

// … tus badges se mantienen igual …
function FeatureStatusBadge({
  status,
  label,
}: {
  status: Feature["status"];
  label: string;
}) {
  const tone =
    status === FeatureStatus.DONE
      ? "border-blue-200 bg-blue-100 text-blue-800"
      : status === FeatureStatus.IN_PROGRESS
      ? "border-amber-200 bg-amber-100 text-amber-800"
      : "border-slate-200 bg-slate-100 text-slate-800";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function FeaturePriorityBadge({
  priority,
  label,
}: {
  priority: FeaturePriority;
  label: string;
}) {
  const tone =
    priority === FeaturePriority.HIGH
      ? "border-rose-200 bg-rose-100 text-rose-800"
      : priority === FeaturePriority.LOW
      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
      : "border-sky-200 bg-sky-100 text-sky-800";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
