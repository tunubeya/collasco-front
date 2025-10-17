// src/app/app/projects/[projectId]/modules/new/page.tsx
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { createModule } from "@/app/app/projects/[projectId]/modules/new/actions";
import { fetchProjectModules, fetchProjectStructure } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Module } from "@/lib/model-definitions/module";
import { RoutesEnum } from "@/lib/utils";
import { ModuleForm } from "@/ui/components/projects/ModuleForm.client";
import { handlePageError } from "@/lib/handle-page-error";
import { handleUnauthorized } from "@/lib/server-auth-helpers";
import { StructureModuleNode } from "@/lib/definitions";

type Params = { projectId: string };
type SearchParams = { parent?: string };

export default async function NewModulePage({
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
  const preselectedParent = sp.parent ?? null;
  const t = await getTranslations("app.projects.module.new");

  let parentOptions: { id: string; name: string; path: string | null }[] = [];

  try {
    const res = await fetchProjectModules(session.token, projectId, {
      limit: 1000,
      sort: "sortOrder",
      // si quisieras solo roots: parent: null
    });
    const mods: Module[] = res.items ?? [];

    // Si tu API ya trae path calculado, úsalo; si viene null, lo dejaremos como null.
    parentOptions = mods.map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path ?? null,
    }));

    // Si todos (o muchos) vienen con path=null y quieres SIEMPRE ver el “Root / Sub / …”,
    // comenta este try/catch y deja solo el fallback con structure (más abajo).
  } catch (error) {
    // Manejo fino como en Feature New
    await handleUnauthorized(error);
    if (error instanceof Response) {
      if (error.status === 403) redirect(RoutesEnum.ERROR_UNAUTHORIZED);
      if (error.status === 404) notFound();

      // Fallback B: usar estructura y aplanar para construir prettyPath
      try {
        const structure = await fetchProjectStructure(session.token, projectId, {
          limit: 2000,
          sort: "sortOrder",
        });

        const flat: { id: string; name: string; path: string | null }[] = [];
        const walk = (node: StructureModuleNode, prefix: string[]) => {
          const pathArr = [...prefix, node.name];
          const prettyPath = pathArr.join(" / ");
          flat.push({ id: node.id, name: node.name, path: prettyPath });

          node.items
            .filter((i): i is StructureModuleNode => i.type === "module")
            .forEach((child) => walk(child, pathArr));
        };

        (structure.modules ?? []).forEach((root) => walk(root, []));
        parentOptions = flat;
      } catch (fallbackErr) {
        await handleUnauthorized(fallbackErr);
        if (fallbackErr instanceof Response) {
          if (fallbackErr.status === 403) redirect(RoutesEnum.ERROR_UNAUTHORIZED);
          if (fallbackErr.status === 404) notFound();
        }
        throw new Error("No se pudieron cargar los módulos para seleccionar el padre.");
      }
    } else {
      throw error; // error no-Response
    }
  }


  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        {t("title")}
      </h1>

      <ModuleForm
        mode="create"
        action={createModule.bind(null, projectId)}
        parentOptions={parentOptions}
        defaultValues={{ parentModuleId: preselectedParent ?? null }}
      />
    </div>
  );
}
