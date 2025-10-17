// src/ui/components/projects/project-detail.client.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { Module } from "@/lib/model-definitions/module";
import type { Project } from "@/lib/model-definitions/project";
import type { Feature } from "@/lib/model-definitions/feature";
import { StructureFeatureItem, StructureModuleNode } from "@/lib/definitions";

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
  // Construimos un índice de TODOS los módulos para "expandir/colapsar todo"

  // índice de módulos para expandir/colapsar todo
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
    <section className="rounded-xl border bg-background p-4">
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
                tText={{
                  noDescription: t("modules.noDescription"),
                  sortOrder: (order: number) => t("modules.sortOrder", { order }),
                }}
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
  tText,
  level,
}: {
  projectId: string;
  node: StructureModuleNode;
  expanded: ExpandedMap;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedMap>>;
  tText: {
    noDescription: string;
    sortOrder: (order: number) => string;
  };
  level: number;
}) {
  const isOpen = !!expanded[node.id];
  const toggle = (open: boolean) =>
    setExpanded((prev) => ({ ...prev, [node.id]: open }));

  const paddingLeft = Math.min(level, 6) * 12;

  // conteos solo de referencia (no afectan el orden)
  const childrenCount = node.items.filter((i) => i.type === "module").length;
  const featuresCount = node.items.filter((i) => i.type === "feature").length;

  return (
    <details
      className="group rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-muted"
      open={isOpen}
      onToggle={(e) => toggle((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className="flex cursor-pointer items-center justify-between gap-3"
        style={{ paddingLeft }}
      >
        <div className="flex items-center gap-2">
          <Caret isOpen={isOpen} />
          <Link
            href={`/app/projects/${projectId}/modules/${node.id}`}
            className="text-sm font-medium hover:underline"
          >
            {node.name}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <CountBadge label="Submódulos" value={childrenCount} />
          <CountBadge label="Features" value={featuresCount} />
          <span className="text-xs text-muted-foreground">
            {tText.sortOrder(node.sortOrder ?? 0)}
          </span>
        </div>
      </summary>

      {/* descripción (tu endpoint no la trae; mostramos placeholder) */}
      <div className="ml-5 mt-2 text-sm text-muted-foreground">
        {tText.noDescription}
      </div>

      {/* Render ordenado tal cual items */}
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
                  tText={tText}
                  level={level + 1}
                />
              </li>
            ) : (
              <li key={item.id} className="ml-8">
                <FeatureRow feature={item} projectId={projectId} />
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
}: {
  feature: StructureFeatureItem;
  projectId: string;
}) {
 return (
    <Link
      href={`/app/projects/${projectId}/features/${feature.id}`}
      className="flex items-center justify-between rounded-md border px-2 py-1 text-sm transition-colors hover:border-muted hover:bg-muted/40"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden>⚙️</span>
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

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
      title={label}
      aria-label={`${label}: ${value}`}
    >
      {value}
    </span>
  );
}

function StatusBadge({ status }: { status: Feature["status"] }) {
  const tone =
    status === "DONE"
      ? "border-green-200 bg-green-100 text-green-800"
      : status === "IN_PROGRESS"
      ? "border-yellow-200 bg-yellow-100 text-yellow-800"
      : "border-slate-200 bg-slate-100 text-slate-800";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-2xs ${tone}`}>
      {status}
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
      {priority}
    </span>
  );
}

function Caret({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className="inline-block transition-transform"
      style={{ transform: `rotate(${isOpen ? 90 : 0}deg)` }}
      aria-hidden
    >
      ▶
    </span>
  );
}