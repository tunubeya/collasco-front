"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";

import type {
  StructureFeatureItem,
  StructureModuleNode,
} from "@/lib/definitions";
import { MoveDirection } from "@/lib/definitions";
import type { Feature } from "@/lib/model-definitions/feature";
import { cn } from "@/lib/utils";
import {
  moveFeatureOrderAction,
  moveModuleOrderAction,
} from "@/app/app/projects/[projectId]/structure/actions";

type TreeItem = StructureModuleNode | StructureFeatureItem;

type StructureTreeProps = {
  projectId: string;
  roots: StructureModuleNode[];
  title: string;
  emptyLabel: string;
  expandLabel: string;
  collapseLabel: string;
  description?: string | null;
  headerActions?: React.ReactNode;
  className?: string;
  canManageStructure?: boolean;
};

type ExpandedMap = Record<string, boolean>;

export function StructureTree({
  projectId,
  roots,
  title,
  emptyLabel,
  expandLabel,
  collapseLabel,
  description,
  headerActions,
  className,
  canManageStructure = false,
}: StructureTreeProps) {
  const [expanded, setExpanded] = useState<ExpandedMap>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const tReorder = useTranslations("app.projects.module.reorder");
  const moveUpLabel = tReorder("moveUp");
  const moveDownLabel = tReorder("moveDown");
  const moduleMovedLabel = tReorder("moduleMoved");
  const featureMovedLabel = tReorder("featureMoved");
  const moveErrorLabel = tReorder("error");
  const reorderEnabled = canManageStructure;
  const disableMoves = pendingKey !== null || isTransitionPending;

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
    walk(roots);
    return ids;
  }, [roots]);

  const hasAny = (roots?.length ?? 0) > 0;

  const handleExpandAll = () =>
    setExpanded(Object.fromEntries(allModuleIds.map((id) => [id, true])));
  const handleCollapseAll = () => setExpanded({});

  const handleModuleMove = useCallback(
    (moduleId: string, parentModuleId: string | null, direction: MoveDirection) => {
      if (!reorderEnabled) return;
      const key = `module-${moduleId}`;
      setPendingKey(key);
      startTransition(() => {
        moveModuleOrderAction({
          projectId,
          moduleId,
          parentModuleId,
          direction,
        })
          .then((result) => {
            if (!result.success) {
              toast.error(result.message ?? moveErrorLabel);
              return;
            }
            toast.success(moduleMovedLabel);
          })
          .catch(() => {
            toast.error(moveErrorLabel);
          })
          .finally(() => {
            setPendingKey(null);
          });
      });
    },
    [
      projectId,
      reorderEnabled,
      moveErrorLabel,
      moduleMovedLabel,
      startTransition,
    ]
  );

  const handleFeatureMove = useCallback(
    (featureId: string, moduleId: string, direction: MoveDirection) => {
      if (!reorderEnabled) return;
      const key = `feature-${featureId}`;
      setPendingKey(key);
      startTransition(() => {
        moveFeatureOrderAction({
          projectId,
          featureId,
          moduleId,
          direction,
        })
          .then((result) => {
            if (!result.success) {
              toast.error(result.message ?? moveErrorLabel);
              return;
            }
            toast.success(featureMovedLabel);
          })
          .catch(() => {
            toast.error(moveErrorLabel);
          })
          .finally(() => {
            setPendingKey(null);
          });
      });
    },
    [
      projectId,
      reorderEnabled,
      moveErrorLabel,
      featureMovedLabel,
      startTransition,
    ]
  );

  const rootItems: StructureModuleNode[] = roots;

  return (
    <section
      className={cn("rounded-xl border bg-background p-4", className)}
    >
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {headerActions}
          {hasAny && (
            <>
              <button
                type="button"
                onClick={handleExpandAll}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                ⤢ {expandLabel}
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                ⤡ {collapseLabel}
              </button>
            </>
          )}
        </div>
      </div>

      {description && (
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      )}

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {rootItems.map((node, index) => (
            <li key={node.id}>
              <ModuleNode
                projectId={projectId}
                node={node}
                siblings={rootItems}
                index={index}
                expanded={expanded}
                setExpanded={setExpanded}
                level={0}
                canManageStructure={reorderEnabled}
                disableMoves={disableMoves}
                moveUpLabel={moveUpLabel}
                moveDownLabel={moveDownLabel}
                onMoveModule={handleModuleMove}
                onMoveFeature={handleFeatureMove}
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
  siblings,
  index,
  expanded,
  setExpanded,
  level,
  canManageStructure,
  disableMoves,
  moveUpLabel,
  moveDownLabel,
  onMoveModule,
  onMoveFeature,
}: {
  projectId: string;
  node: StructureModuleNode;
  siblings: TreeItem[];
  index: number;
  expanded: ExpandedMap;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedMap>>;
  level: number;
  canManageStructure: boolean;
  disableMoves: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
  onMoveModule: (moduleId: string, parentModuleId: string | null, direction: MoveDirection) => void;
  onMoveFeature: (featureId: string, moduleId: string, direction: MoveDirection) => void;
}) {
  const isOpen = !!expanded[node.id];
  const toggle = (open: boolean) =>
    setExpanded((prev) => ({ ...prev, [node.id]: open }));
  const paddingLeft = Math.min(level, 6) * 12;
  const canMoveUp = index > 0;
  const canMoveDown = index < siblings.length - 1;
  const showReorderButtons =
    canManageStructure && (canMoveUp || canMoveDown);

  return (
    <details
      className="group rounded-md px-1 py-0.5"
      open={isOpen}
      onToggle={(e) => {
        if (e.target !== e.currentTarget) return;
        toggle((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary
        className="flex cursor-pointer select-none items-center gap-2 rounded-md pr-2 transition-colors hover:bg-muted/30"
        style={{ paddingLeft }}
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
          aria-hidden
        />

        {isOpen ? (
          <FolderOpen className="h-4 w-4 text-slate-700" aria-hidden />
        ) : (
          <Folder className="h-4 w-4 text-slate-700" aria-hidden />
        )}

        <Link
          href={`/app/projects/${projectId}/modules/${node.id}`}
          className="flex-1 text-sm font-medium hover:underline"
        >
          {node.name}
        </Link>

        {showReorderButtons && (
          <div className="ml-auto flex items-center gap-1">
            {canMoveUp && (
              <MoveActionButton
                direction={MoveDirection.UP}
                label={moveUpLabel}
                disabled={disableMoves}
                onActivate={() =>
                  onMoveModule(node.id, node.parentModuleId ?? null, MoveDirection.UP)
                }
              />
            )}
            {canMoveDown && (
              <MoveActionButton
                direction={MoveDirection.DOWN}
                label={moveDownLabel}
                disabled={disableMoves}
                onActivate={() =>
                  onMoveModule(node.id, node.parentModuleId ?? null, MoveDirection.DOWN)
                }
              />
            )}
          </div>
        )}
      </summary>

      {node.items.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.items.map((item, childIndex) =>
            item.type === "module" ? (
              <li key={item.id}>
                <ModuleNode
                  projectId={projectId}
                  node={item}
                  siblings={node.items}
                  index={childIndex}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  level={level + 1}
                  canManageStructure={canManageStructure}
                  disableMoves={disableMoves}
                  moveUpLabel={moveUpLabel}
                  moveDownLabel={moveDownLabel}
                  onMoveModule={onMoveModule}
                  onMoveFeature={onMoveFeature}
                />
              </li>
            ) : (
              <li key={item.id}>
                <FeatureRow
                  feature={item}
                  projectId={projectId}
                  level={level + 1}
                  siblings={node.items}
                  index={childIndex}
                  canManageStructure={canManageStructure}
                  disableMoves={disableMoves}
                  moveUpLabel={moveUpLabel}
                  moveDownLabel={moveDownLabel}
                  onMoveFeature={onMoveFeature}
                />
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
  level,
  siblings,
  index,
  canManageStructure,
  disableMoves,
  moveUpLabel,
  moveDownLabel,
  onMoveFeature,
}: {
  feature: StructureFeatureItem;
  projectId: string;
  level: number;
  siblings: TreeItem[];
  index: number;
  canManageStructure: boolean;
  disableMoves: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
  onMoveFeature: (featureId: string, moduleId: string, direction: MoveDirection) => void;
}) {
  const paddingLeft = Math.min(level, 6) * 16 + 24;
  const canMoveUp = index > 0;
  const canMoveDown = index < siblings.length - 1;
  const showReorderButtons =
    canManageStructure && (canMoveUp || canMoveDown);

  return (
    <div
      className="flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/30"
      style={{ paddingLeft }}
    >
      <Link
        href={`/app/projects/${projectId}/features/${feature.id}`}
        className="flex flex-1 items-center gap-2"
      >
        <FileText className="h-4 w-4 text-slate-700" aria-hidden />
        <span>{feature.name}</span>
      </Link>
      <div className="ml-2 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={feature.status as Feature["status"]} />
          {feature.priority && (
            <PriorityBadge priority={feature.priority as Feature["priority"]} />
          )}
        </div>
        {showReorderButtons && (
          <div className="flex items-center gap-1">
            {canMoveUp && (
              <MoveActionButton
                direction={MoveDirection.UP}
                label={moveUpLabel}
                disabled={disableMoves}
                onActivate={() =>
                  onMoveFeature(feature.id, feature.moduleId, MoveDirection.UP)
                }
              />
            )}
            {canMoveDown && (
              <MoveActionButton
                direction={MoveDirection.DOWN}
                label={moveDownLabel}
                disabled={disableMoves}
                onActivate={() =>
                  onMoveFeature(feature.id, feature.moduleId, MoveDirection.DOWN)
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
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
      {status.toLowerCase()}
    </span>
  );
}

function MoveActionButton({
  direction,
  label,
  disabled,
  onActivate,
}: {
  direction: MoveDirection;
  label: string;
  disabled: boolean;
  onActivate: () => void;
}) {
  const Icon = direction === MoveDirection.UP ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="rounded border border-border bg-background/80 p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate();
      }}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
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
