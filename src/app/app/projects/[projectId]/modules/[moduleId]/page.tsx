import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { ProjectMemberRole, StructureModuleNode } from "@/lib/definitions";
import {
  fetchModuleById,
  fetchModuleStructure,
  fetchProjectById,
  fetchProjectStructure,
  fetchGetUserProfile,
} from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import type { Project } from "@/lib/model-definitions/project";
import { RoutesEnum } from "@/lib/utils";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";
import { handlePageError } from "@/lib/handle-page-error";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { findModulePath } from "@/lib/structure-helpers";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Pencil, Plus, Trash2 } from "lucide-react";

// 👇 importa la acción de borrado (ya la usas en /edit)
import { deleteModule } from "@/app/app/projects/[projectId]/modules/[moduleId]/edit/actions";

type Params = {
  projectId: string;
  moduleId: string;
};

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { projectId, moduleId } = await params;

  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const tModule = await getTranslations("app.projects.module");
  const tBreadcrumbs = await getTranslations("app.common.breadcrumbs");
  const tProjectDetail = await getTranslations("app.projects.detail");
  const formatter = await getFormatter();

  // 1) Metadata del proyecto
  let project: Project | null = null;
  try {
    project = await fetchProjectById(session.token, projectId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!project) notFound();

  // 2) Metadata del módulo
  let currentModule: Module | null = null;
  try {
    currentModule = await fetchModuleById(session.token, moduleId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!currentModule) notFound();

  // 3) Árbol completo del módulo (intercalado y ordenado)
  let structureNode: StructureModuleNode;
  try {
    const { node } = await fetchModuleStructure(session.token, moduleId);
    structureNode = node;
  } catch (error) {
    await handlePageError(error);
  }

  // 4) Path del módulo dentro de la estructura del proyecto
  let moduleCrumbs: { id: string; name: string }[] = [];
  try {
    const structure = await fetchProjectStructure(session.token, projectId, {
      limit: 1000,
      sort: "sortOrder",
    });
    const chain = findModulePath(structure.modules, currentModule.id);
    if (chain) {
      moduleCrumbs = chain.map((node) => ({ id: node.id, name: node.name }));
    }
  } catch (error) {
    await handlePageError(error);
  }
  if (moduleCrumbs.length === 0) {
    moduleCrumbs = [{ id: currentModule.id, name: currentModule.name }];
  }

  const formattedUpdatedAt = formatter.dateTime(
    new Date(currentModule.updatedAt),
    { dateStyle: "medium" }
  );

  const breadcrumbItems = [
    { label: tBreadcrumbs("projects"), href: RoutesEnum.APP_PROJECTS },
    { label: project.name, href: `/app/projects/${projectId}` },
    ...moduleCrumbs.map((crumb, index) => ({
      label: crumb.name,
      href:
        index === moduleCrumbs.length - 1
          ? undefined
          : `/app/projects/${projectId}/modules/${crumb.id}`,
    })),
  ];

  let currentUserId: string | null = null;
  try {
    const profile = await fetchGetUserProfile(session.token);
    currentUserId = profile.id;
  } catch (error) {
    await handlePageError(error);
  }

  const membershipRole =
    project.membershipRole ??
    project.members?.find((member) => member.userId === currentUserId)?.role ??
    (project.ownerId === currentUserId ? ProjectMemberRole.OWNER : null);
  const canManageStructure =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER;

  return (
    <div className="grid gap-6">
      <Breadcrumb items={breadcrumbItems} className="mb-2" />
      {/* Header */}
      <header className="rounded-xl border bg-background p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{currentModule.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tModule("header.project", { name: project.name })}
            </p>
            <p className="text-xs text-muted-foreground">
              {tModule("header.updated", { date: formattedUpdatedAt })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right text-xs text-muted-foreground">
            {/* Botones de navegación */}
            <div className="flex gap-2">
              {currentModule.parentModuleId ? (
                <Link
                  href={`/app/projects/${projectId}/modules/${currentModule.parentModuleId}`}
                  className={actionButtonClass({ variant: "neutral", size: "xs" })}
                >
                  {tModule("actions.backToParent")}
                </Link>
              ) : (
                <span className="rounded border px-2 py-1">
                  {tModule("badges.root")}
                </span>
              )}
            </div>

            {/* Acciones del módulo: Editar / Eliminar */}
            {canManageStructure && (
              <div className="flex gap-2">
                <Link
                  href={`/app/projects/${projectId}/modules/${moduleId}/edit`}
                  className={actionButtonClass()}
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  {tModule("actions.edit", { default: "Editar" })}
                </Link>

                <form action={deleteModule.bind(null, projectId, moduleId)}>
                  <button
                    type="submit"
                    className={actionButtonClass({ variant: "destructive" })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    {tModule("actions.delete", { default: "Eliminar" })}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
          {currentModule.description ?? tModule("description.empty")}
        </div>
      </header>

      <StructureTree
        projectId={projectId}
        roots={[structureNode!]}
        title={tModule("children.title")}
        emptyLabel={tModule("children.empty")}
        expandLabel={tProjectDetail("modules.expandAll", { default: "Expand all" })}
        collapseLabel={tProjectDetail("modules.collapseAll", { default: "Collapse all" })}
      />

      {canManageStructure && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/projects/${projectId}/modules/new?parent=${currentModule.id}`}
            className={actionButtonClass()}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {tModule("actions.addChild")}
          </Link>
          <Link
            href={`/app/projects/${projectId}/features/new?moduleId=${currentModule.id}`}
            className={actionButtonClass()}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {tModule("actions.addFeature")}
          </Link>
        </div>
      )}
    </div>
  );
}
