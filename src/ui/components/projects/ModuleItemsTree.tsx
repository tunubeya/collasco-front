"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StructureFeatureItem, StructureModuleNode } from "@/lib/definitions";

// Árbol expandible y recursivo que respeta el orden del backend
export default function ModuleItemsTree({
  projectId,
  root,
}: {
  projectId: string;
  root: StructureModuleNode; // nodo del módulo actual con sus items recursivos
}) {
  // índice para "expandir/colapsar todo"
  const allModuleIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (node: StructureModuleNode) => {
      ids.push(node.id);
      node.items
        .filter((i): i is StructureModuleNode => i.type === "module")
        .forEach(walk);
    };
    walk(root);
    return ids;
  }, [root]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    // por defecto expandimos el root; ajusta a gusto
    { [root.id]: true }
  );

  const expandAll = () =>
    setExpanded(Object.fromEntries(allModuleIds.map((id) => [id, true])));
  const collapseAll = () => setExpanded({});

  const hasAny = root.items.length > 0;

  return (
    <div>
      {hasAny && (
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            ⤢ Expandir todo
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            ⤡ Colapsar todo
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {root.items.map((item) =>
          item.type === "module" ? (
            <li key={item.id}>
              <ModuleNode
                projectId={projectId}
                node={item}
                expanded={expanded}
                setExpanded={setExpanded}
                level={0}
              />
            </li>
          ) : (
            <li key={item.id} className="ml-8">
              <FeatureRow feature={item} projectId={projectId} />
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function ModuleNode({
  projectId,
  node,
  expanded,
  setExpanded,
  level,
}: {
  projectId: string;
  node: StructureModuleNode;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  level: number;
}) {
  const isOpen = !!expanded[node.id];
  const toggle = (open: boolean) =>
    setExpanded((prev) => ({ ...prev, [node.id]: open }));

  const paddingLeft = Math.min(level, 6) * 12; // 12px por nivel, cap en 6
  const childModules = node.items.filter(
    (i): i is StructureModuleNode => i.type === "module"
  );
  const childFeatures = node.items.filter(
    (i): i is StructureFeatureItem => i.type === "feature"
  );

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
          <CountBadge label="Submódulos" value={childModules.length} />
          <CountBadge label="Features" value={childFeatures.length} />
          <span className="text-xs text-muted-foreground">
            Orden: {node.sortOrder ?? 0}
          </span>
        </div>
      </summary>

      {/* Ítems del módulo, en el orden exacto provisto por el backend */}
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
        <StatusBadge status={feature.status} />
        {feature.priority && <PriorityBadge priority={feature.priority} />}
      </div>
    </Link>
  );
}

/* -------- Badges & helpers -------- */

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

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "DONE"
      ? "border-green-200 bg-green-100 text-green-800"
      : status === "IN_PROGRESS"
      ? "border-amber-200 bg-amber-100 text-amber-800"
      : "border-slate-200 bg-slate-100 text-slate-800";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-2xs ${tone}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
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
