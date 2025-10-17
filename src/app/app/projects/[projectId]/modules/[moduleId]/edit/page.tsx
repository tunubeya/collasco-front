// src/app/app/projects/[projectId]/modules/[moduleId]/edit/page.tsx
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import {
  deleteModule,
  updateModule,
} from "@/app/app/projects/[projectId]/modules/[moduleId]/edit/actions";
import {
  fetchModuleById,
  fetchProjectStructure,
  fetchModuleStructure, // 👈 para conocer descendientes y excluirlos del selector
} from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import { RoutesEnum } from "@/lib/utils";
import { ModuleForm } from "@/ui/components/projects/ModuleForm.client";
import { handlePageError } from "@/lib/handle-page-error";
import type { StructureModuleNode } from "@/lib/definitions";

type Params = { projectId: string; moduleId: string };

export default async function EditModulePage({
  params,
}: {
  // Next 15: params asíncrono
  params: Promise<Params>;
}) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const t = await getTranslations("app.projects.module.edit");
  const { projectId, moduleId } = await params;

  // 1) Módulo actual (metadata)
  let currentModule: Module | null = null;
  try {
    currentModule = await fetchModuleById(session.token, moduleId);
  } catch (error) {
    await handlePageError(error);
  }
  if (!currentModule) notFound();

  // 2) (Opcional pero recomendado) obtener el subárbol del módulo actual
  //    para excluir el propio módulo y sus hijos del selector de "padre".
  let descendants = new Set<string>([moduleId]);
  try {
    const { node } = await fetchModuleStructure(session.token, moduleId);
    const walkDesc = (n: StructureModuleNode) => {
      n.items
        .filter((i): i is StructureModuleNode => i.type === "module")
        .forEach((child) => {
          descendants.add(child.id);
          walkDesc(child);
        });
    };
    walkDesc(node);
  } catch (error) {
    // si falla, no es crítico; solo no excluiremos descendientes
    // (el backend debería validar de todas formas)
  }

  // 3) Estructura completa del proyecto → aplanar a opciones con “prettyPath”
  let parentOptions: { id: string; name: string; path: string | null }[] = [];
  try {
    const structure = await fetchProjectStructure(session.token, projectId, {
      limit: 100,         // tu API lo limita a 100; si hay muchos roots, ajusta paginando en el back o añade filtro
      sort: "sortOrder",
    });

    const flat: typeof parentOptions = [];
    const walk = (node: StructureModuleNode, prefix: string[]) => {
      const pathArr = [...prefix, node.name];
      // Excluir el propio módulo y sus descendientes del selector (evita ciclos)
      if (!descendants.has(node.id)) {
        flat.push({
          id: node.id,
          name: node.name,
          path: pathArr.join(" / "),
        });
      }
      node.items
        .filter((i): i is StructureModuleNode => i.type === "module")
        .forEach((child) => walk(child, pathArr));
    };

    (structure.modules ?? []).forEach((root) => walk(root, []));
    parentOptions = flat;
  } catch (error) {
    await handlePageError(error);
  }

  return (
    <div className="max-w-3xl space-y-6 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { name: currentModule.name })}
        </p>
      </header>

      <ModuleForm
        mode="edit"
        action={updateModule.bind(null, projectId, moduleId)}
        defaultValues={{
          name: currentModule.name,
          description: currentModule.description,
          parentModuleId: currentModule.parentModuleId,
        }}
        parentOptions={parentOptions}
        // ya filtramos el propio módulo y sus hijos, así que esto es opcional
        disabledOptionId={currentModule.id}
      />

      <form
        action={deleteModule.bind(null, projectId, moduleId)}
        className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-destructive">
              {t("dangerZone.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("dangerZone.description")}
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-lg border border-destructive bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors"
          >
            {t("dangerZone.delete")}
          </button>
        </div>
      </form>
    </div>
  );
}
