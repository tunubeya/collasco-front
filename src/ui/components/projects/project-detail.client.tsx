// src/ui/components/projects/project-detail.client.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/model-definitions/project";
import type { Feature } from "@/lib/model-definitions/feature";
import { StructureFeatureItem, StructureModuleNode } from "@/lib/definitions";

// 👇 NUEVO: íconos
import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";

type ExpandedMap = Record<string, boolean>;

export default function ProjectDetailClient({
  project,
  structureModules,
}: {
  project: Project;
  structureModules: StructureModuleNode[];
}) {
  const t = useTranslations("app.projects.detail");
  const [expanded, setExpanded] = useState<ExpandedMap>({});

  const allModuleIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (mods: StructureModuleNode[] | undefined) => {
      if (!mods) return;
      for (const m of mods) {
        ids.push(m.id);
        const children = m.items.filter(
          (i): i is StructureModuleNode => i.type === "module"
        );
        walk(children);
      }
    };
    walk(structureModules);
    return ids;
  }, [structureModules]);

  const hasAny = (structureModules?.length ?? 0) > 0;

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{t("modules.title")}</h2>

        {hasAny && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setExpanded(Object.fromEntries(allModuleIds.map((id) => [id, true])))
              }
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              ⤢ {t("modules.expandAll", { default: "Expandir todo" })}
            </button>
            <button
              type="button"
              onClick={() => setExpanded({})}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              ⤡ {t("modules.collapseAll", { default: "Colapsar todo" })}
            </button>
          </div>
        )}
      </div>
      {project.description && (
        <p className="mb-4 text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">{t("modules.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {structureModules.map((m) => (
            <li key={m.id}>
              <ModuleNode
                projectId={project.id}
                node={m}
                expanded={expanded}
                setExpanded={setExpanded}
                level={0}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ModuleNode({
  projectId,
  node,
  expanded,
  setExpanded,
  level
}: {
  projectId: string;
  node: StructureModuleNode;
  expanded: ExpandedMap;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedMap>>;
  level: number;
}) {
  const isOpen = !!expanded[node.id];
  const toggle = (open: boolean) =>
    setExpanded((prev) => ({ ...prev, [node.id]: open }));

  const paddingLeft = Math.min(level, 6) * 12; // 🔸 un poco más de sangría

  return (
    <details
       className="group rounded-md px-1 py-0.5"
      open={isOpen}
      onToggle={(e) => toggle((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className="flex cursor-pointer select-none items-center gap-2 rounded-md pr-2 transition-colors hover:bg-muted/30"
        style={{ paddingLeft }}
      >
        {/* Caret estilo chevron */}
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
          aria-hidden
        />

        {/* Carpeta abierta/cerrada como en la imagen */}
        {isOpen ? (
          <FolderOpen className="h-4 w-4 text-slate-700" aria-hidden />
        ) : (
          <Folder className="h-4 w-4 text-slate-700" aria-hidden />
        )}

        <Link
          href={`/app/projects/${projectId}/modules/${node.id}`}
          className="text-sm font-medium hover:underline"
        >
          {node.name}
        </Link>
      </summary>

      {node.items.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.items.map((item) =>
            item.type === "module" ? (
              <li key={item.id}>
                <ModuleNode
                  projectId={projectId}
                  node={item}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  level={level + 1}
                />
              </li>
            ) : (
              <li key={item.id}>
                <FeatureRow feature={item} projectId={projectId} level={level + 1} />
              </li>
            )
          )}
        </ul>
      )}
    </details>
  );
}

function FeatureRow({
  feature,
  projectId,
  level
}: {
  feature: StructureFeatureItem;
  projectId: string;
  level: number;
}) {
  const paddingLeft = Math.min(level, 6) * 16 + 24; // +24 para alinear con iconos del summary
  return (
    <Link
      href={`/app/projects/${projectId}/features/${feature.id}`}
      className="flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/30"
      style={{ paddingLeft }}
    >
      <div className="flex items-center gap-2">
        {/* Documento como en la imagen */}
        <FileText className="h-4 w-4 text-slate-700" aria-hidden />
        <span>{feature.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={feature.status as Feature["status"]} />
        {feature.priority && (
          <PriorityBadge priority={feature.priority as Feature["priority"]} />
        )}
      </div>
    </Link>
  );
}

/** ---------- Badges / helpers ---------- */

function StatusBadge({ status }: { status: Feature["status"] }) {
  const tone =
    status === "DONE"
      ? "border-green-200 bg-green-100 text-green-800"
      : status === "IN_PROGRESS"
      ? "border-yellow-200 bg-yellow-100 text-yellow-800"
      : "border-slate-200 bg-slate-100 text-slate-800";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-2xs ${tone}`}>
      {status.toLowerCase()}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Feature["priority"] }) {
  const tone =
    priority === "HIGH"
      ? "border-red-200 bg-red-100 text-red-800"
      : priority === "LOW"
      ? "border-sky-200 bg-sky-100 text-sky-800"
      : "border-slate-200 bg-slate-100 text-slate-800";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-2xs ${tone}`}>
      {priority!.toLowerCase()}
    </span>
  );
}
