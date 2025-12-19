import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { ProjectMemberRole, ProjectStatus, ProjectStructureResponse, StructureModuleNode } from "@/lib/definitions";
import { fetchGetUserProfile, fetchProjectById, fetchProjectStructure } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Project } from "@/lib/model-definitions/project";
import { ProjectTabs } from "./project-tabs.client";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";
import type { FeatureOption } from "./project-qa.types";
import { RoutesEnum } from "@/lib/utils";
import { handlePageError } from "@/lib/handle-page-error";
import { deleteProject } from "@/app/app/projects/actions";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Pencil, Trash2 } from "lucide-react";


type Params = { projectId: string };
export default async function ProjectDetailPage({
  params,
}: {
  // 👇 Next 15+ App Router: params es Promise
  params: Promise<Params>;
}) {
  const { projectId } = await params;

  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const t = await getTranslations("app.projects.detail");
  const tStatus = await getTranslations("app.common.projectStatus");
  const tBreadcrumbs = await getTranslations("app.common.breadcrumbs");
  const formatter = await getFormatter();

  // 1) Proyecto
  let project: Project | null = null;
  try {
    project = await fetchProjectById(session.token, projectId);
  }  catch (error) {
  await handlePageError(error);
}
  if (!project) notFound();

  // 2) Estructura (módulos + submódulos + features)
  let structureResult: ProjectStructureResponse | null = null;
  try {
    structureResult = await fetchProjectStructure(session.token, projectId, {
      sort: "sortOrder",
      limit: 100,
    });
  }  catch (error) {
  await handlePageError(error);
}
  if (!structureResult) notFound();

  let currentUserId: string | null = null;
  try {
    const profile = await fetchGetUserProfile(session.token);
    currentUserId = profile.id;
  } catch (error) {
    await handlePageError(error);
  }

  const featureOptions = extractFeatureOptions(structureResult.modules);

  const formattedUpdatedAt = formatter.dateTime(new Date(project.updatedAt), {
    dateStyle: "medium",
  });

  const breadcrumbItems = [
    { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
    { label: project.name },
  ];
  const inferredRole =
    project.members?.find((member) => member.userId === currentUserId)?.role ??
    (project.ownerId === currentUserId ? ProjectMemberRole.OWNER : null);
  const membershipRole = project.membershipRole ?? inferredRole ?? null;
  const canManageProject =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER;

  return (
    <div className="grid gap-6">
      <Breadcrumb items={breadcrumbItems} className="mb-2" />
      <header className="flex items-center justify-between">
               <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <div className="mt-1">
              <RichTextPreview
                value={project.description}
                emptyLabel={t("description.empty")}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t("updated", { date: formattedUpdatedAt })}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ProjectStatusBadge
            status={project.status}
            label={tStatus(project.status)}
          />

          {/* Botones de acción */}
          {canManageProject && (
            <div className="flex gap-2">
              <Link
                href={`/app/projects/${project.id}/edit`}
                className={actionButtonClass()}
              >
                <Pencil className="mr-2 h-4 w-4" aria-hidden />
                {t("actions.edit", { default: "Editar" })}
              </Link>

              {/* Eliminar proyecto (igual patrón que en /edit) */}
              <form action={deleteProject.bind(null, project.id)}>
                <button
                  type="submit"
                  className={actionButtonClass({ variant: "destructive" })}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.delete", { default: "Eliminar" })}
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <ProjectTabs
        project={project}
        projectId={projectId}
        structureModules={structureResult.modules}
        token={session.token}
        featureOptions={featureOptions}
        currentUserId={currentUserId ?? undefined}
        membershipRole={membershipRole ?? undefined}
      />
    </div>
  );
}

function ProjectStatusBadge({
  status,
  label,
}: {
  status: Project["status"];
  label: string;
}) {
  const tone =
    status === ProjectStatus.ACTIVE
      ? "border-green-200 bg-green-100 text-green-800"
      : status === ProjectStatus.FINISHED
      ? "border-blue-200 bg-blue-100 text-blue-800"
      : "border-yellow-200 bg-yellow-100 text-yellow-800";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {label}
    </span>
  );
}

function extractFeatureOptions(modules: StructureModuleNode[]): FeatureOption[] {
  const features: FeatureOption[] = [];
  const visit = (nodes: StructureModuleNode[]) => {
    nodes.forEach((node) => {
      node.items.forEach((item) => {
        if (item.type === "feature") {
          features.push({ id: item.id, name: item.name });
        } else {
          visit([item]);
        }
      });
    });
  };
  visit(modules);
  return features;
}
