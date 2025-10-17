import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { StructureModuleNode } from "@/lib/definitions";
import { fetchModuleById, fetchModuleStructure } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import { RoutesEnum } from "@/lib/utils";
import ModuleItemsTree from "@/ui/components/projects/ModuleItemsTree";
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

  const t = await getTranslations("app.projects.module");
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
              {t("header.project", { id: projectId })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("header.updated", { date: formattedUpdatedAt })}
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
                  {t("actions.backToParent")}
                </Link>
              ) : (
                <span className="rounded border px-2 py-1">
                  {t("badges.root")}
                </span>
              )}
            </div>

            {/* Acciones del módulo: Editar / Eliminar */}
            <div className="flex gap-2">
              <Link
                href={`/app/projects/${projectId}/modules/${moduleId}/edit`}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {t("actions.edit", { default: "Editar" })}
              </Link>

              <form action={deleteModule.bind(null, projectId, moduleId)}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg border border-destructive bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors"
                >
                  {t("actions.delete", { default: "Eliminar" })}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {currentModule.description ?? t("description.empty")}
        </div>
      </header>

      {/* Árbol expandible (módulos + features intercalados en orden) */}
      <section className="rounded-xl border bg-background p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{t("children.title")}</h2>
          <div className="flex gap-3">
            <Link
              href={`/app/projects/${projectId}/modules/new?parent=${currentModule.id}`}
              className="text-xs text-primary hover:underline"
            >
              {t("actions.addChild")}
            </Link>
            <Link
              href={`/app/projects/${projectId}/features/new?moduleId=${currentModule.id}`}
              className="text-xs text-primary hover:underline"
            >
              {t("actions.addFeature")}
            </Link>
          </div>
        </div>

        {structureNode!.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("children.empty")}</p>
        ) : (
          <ModuleItemsTree projectId={projectId} root={structureNode!} />
        )}
      </section>
    </div>
  );
}
