import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";

import { createFeature } from "@/app/app/projects/[projectId]/features/new/actions";
import { fetchProjectModules, fetchProjectStructure } from "@/lib/data";
import { handleUnauthorized } from "@/lib/server-auth-helpers";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import { RoutesEnum } from "@/lib/utils";
import { FeatureForm } from "@/ui/components/projects/FeatureForm.client";
import type { StructureModuleNode } from "@/lib/definitions";

type Params = { projectId: string };
type SearchParams = { moduleId?: string };

export default async function NewFeaturePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const { projectId } = await params;
  const sp = (await searchParams) ?? {};
  const preselectedModule = sp.moduleId;

  const t = await getTranslations("app.projects.feature.new");

  let modules: { id: string; name: string; path: string | null }[] = [];

  // --- Intento A: listar módulos (puede fallar según tu API)
  try {
    const res = await fetchProjectModules(session.token, projectId, {
      limit: 500,
      sort: "-updatedAt",
    });
    const mods: Module[] = res.items ?? [];
    modules = mods.map((m) => ({ id: m.id, name: m.name, path: m.path ?? null }));
  } catch (error) {
    // Manejo fino de errores
    await handleUnauthorized(error);
    if (error instanceof Response) {
      if (error.status === 403) redirect(RoutesEnum.ERROR_UNAUTHORIZED);
      if (error.status === 404) notFound();

      // --- Intento B (fallback robusto): usar la estructura del proyecto y aplanar
      try {
        const structure = await fetchProjectStructure(session.token, projectId, {
          limit: 1000,
          sort: "sortOrder",
        });

        const flat: { id: string; name: string; path: string | null }[] = [];
        const walk = (node: StructureModuleNode, prefix: string[]) => {
          const pathArr = [...prefix, node.name];
          // construimos un path legible por si tu tipo Module.path es null en este flujo
          const prettyPath = pathArr.join(" / ");

          flat.push({ id: node.id, name: node.name, path: prettyPath });

          node.items
            .filter((i): i is StructureModuleNode => i.type === "module")
            .forEach((child) => walk(child, pathArr));
        };

        (structure.modules ?? []).forEach((root) => walk(root, []));
        modules = flat;
      } catch (fallbackErr) {
        await handleUnauthorized(fallbackErr);
        if (fallbackErr instanceof Response) {
          if (fallbackErr.status === 403) redirect(RoutesEnum.ERROR_UNAUTHORIZED);
          if (fallbackErr.status === 404) notFound();
        }
        // Si también falla el fallback, re-lanzamos un error limpio (evita [object Response])
        throw new Error("No se pudieron cargar los módulos del proyecto.");
      }
    } else {
      // Error no-Response (network u otro)
      throw error;
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        {t("title")}
      </h1>

      <FeatureForm
        mode="create"
        action={createFeature.bind(null, projectId)}
        modules={modules}
        defaultValues={{ moduleId: preselectedModule }}
      />
    </div>
  );
}
