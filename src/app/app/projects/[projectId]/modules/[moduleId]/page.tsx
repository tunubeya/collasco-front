import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { StructureModuleNode } from "@/lib/definitions";
import { fetchModuleById, fetchModuleStructure } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import { RoutesEnum } from "@/lib/utils";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";
import { handlePageError } from "@/lib/handle-page-error";

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
  const tProjectDetail = await getTranslations("app.projects.detail");
  const formatter = await getFormatter();

  // 1) Metadata del módulo
  let currentModule: Module | null = null;
  try {
    currentModule = await fetchModuleById(session.token, moduleId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!currentModule) notFound();

  // 2) Árbol completo del módulo (intercalado y ordenado)
  let structureNode: StructureModuleNode;
  try {
    const { node } = await fetchModuleStructure(session.token, moduleId);
    structureNode = node;
  } catch (error) {
    await handlePageError(error);
  }

  const formattedUpdatedAt = formatter.dateTime(
    new Date(currentModule.updatedAt),
    { dateStyle: "medium" }
  );

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header className="rounded-xl border bg-background p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{currentModule.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tModule("header.project", { id: projectId })}
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
                  className="inline-flex items-center rounded border px-2 py-1 transition-colors hover:bg-muted"
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
            <div className="flex gap-2">
              <Link
                href={`/app/projects/${projectId}/modules/${moduleId}/edit`}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {tModule("actions.edit", { default: "Editar" })}
              </Link>

              <form action={deleteModule.bind(null, projectId, moduleId)}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg border border-destructive bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors"
                >
                  {tModule("actions.delete", { default: "Eliminar" })}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
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

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/projects/${projectId}/modules/new?parent=${currentModule.id}`}
          className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          {tModule("actions.addChild")}
        </Link>
        <Link
          href={`/app/projects/${projectId}/features/new?moduleId=${currentModule.id}`}
          className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          {tModule("actions.addFeature")}
        </Link>
      </div>
    </div>
  );
}
