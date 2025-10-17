import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { ProjectStatus, ProjectStructureResponse, StructureFeatureItem, StructureModuleNode } from "@/lib/definitions";
import { fetchProjectById, fetchProjectStructure } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import type { Project } from "@/lib/model-definitions/project";
import type { Feature } from "@/lib/model-definitions/feature";
import ProjectDetailClient from "@/ui/components/projects/project-detail.client";
import { RoutesEnum } from "@/lib/utils";
import { handlePageError } from "@/lib/handle-page-error";
import { deleteProject } from "@/app/app/projects/actions";


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

  const formattedUpdatedAt = formatter.dateTime(new Date(project.updatedAt), {
    dateStyle: "medium",
  });

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
               <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-sm mt-1">{project.description}</p>
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
          <div className="flex gap-2">
            <Link
              href={`/app/projects/${project.id}/edit`}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              {t("actions.edit", { default: "Editar" })}
            </Link>

            {/* Eliminar proyecto (igual patrón que en /edit) */}
            <form action={deleteProject.bind(null, project.id)}>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-destructive bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors"
              >
                {t("actions.delete", { default: "Eliminar" })}
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Tu cliente ahora recibe toda la jerarquía desde root */}
      <ProjectDetailClient project={project} structureModules={structureResult.modules} />

      <div>
        <Link
          href={`/app/projects/${project.id}/modules/new`}
          className="inline-flex items-center rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          {t("actions.addModule")}
        </Link>
      </div>
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
