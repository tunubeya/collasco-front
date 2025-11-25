"use client";

import { useEffect, useMemo, useState } from "react";

import type { Project } from "@/lib/model-definitions/project";
import type { Module } from "@/lib/model-definitions/module";
import type { Feature } from "@/lib/model-definitions/feature";
import type {
  StructureFeatureItem,
  StructureModuleNode,
} from "@/lib/definitions";
import { cn } from "@/lib/utils";

export type ManualNode = {
  id: string;
  type: "project" | "module" | "feature";
  name: string;
  description?: string | null;
  children: ManualNode[];
};

type ManualOutlineProps = {
  root: ManualNode;
  focusId?: string;
  fallbackDescription: string;
  className?: string;
};

const TITLE_CLASSES = [
  "text-xl font-semibold",
  "text-lg font-semibold",
  "text-base font-semibold",
  "text-base font-medium",
];

const DESCRIPTION_CLASSES = [
  "text-base text-muted-foreground",
  "text-sm text-muted-foreground",
  "text-sm text-muted-foreground",
  "text-xs text-muted-foreground",
];

export function ManualOutline({
  root,
  focusId,
  fallbackDescription,
  className,
}: ManualOutlineProps) {
  const focusPath = useMemo(() => {
    if (!focusId) return [];
    return findPath(root, focusId);
  }, [root, focusId]);

  const defaultExpanded = useMemo(() => {
    const expanded: Record<string, boolean> = { [root.id]: true };
    focusPath.forEach((id) => {
      expanded[id] = true;
    });
    return expanded;
  }, [root.id, focusPath]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <div className={cn("rounded-xl border bg-background p-4", className)}>
      <ManualNodeItem
        node={root}
        numbering="1"
        level={0}
        expandedMap={expanded}
        onToggle={(id) =>
          setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
        }
        fallbackDescription={fallbackDescription}
        focusId={focusId}
      />
    </div>
  );
}

type ManualNodeItemProps = {
  node: ManualNode;
  numbering: string;
  level: number;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  fallbackDescription: string;
  focusId?: string;
};

function ManualNodeItem({
  node,
  numbering,
  level,
  expandedMap,
  onToggle,
  fallbackDescription,
  focusId,
}: ManualNodeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedMap[node.id] ?? true;
  const paddingLeft = level * 16;
  const titleClass =
    TITLE_CLASSES[Math.min(level, TITLE_CLASSES.length - 1)];
  const descriptionClass =
    DESCRIPTION_CLASSES[Math.min(level, DESCRIPTION_CLASSES.length - 1)];
  const description =
    node.description && node.description.trim().length > 0
      ? node.description
      : fallbackDescription;
  const isFocused = focusId === node.id;

  return (
    <div className="space-y-2" style={{ paddingLeft }}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50",
          isFocused && "bg-primary/10 text-primary",
          !hasChildren && "cursor-default hover:bg-transparent"
        )}
        aria-expanded={hasChildren ? isExpanded : undefined}
        onClick={() => {
          if (!hasChildren) return;
          onToggle(node.id);
        }}
      >
        <div className="flex flex-1 flex-col">
          <span className={cn(titleClass, "leading-tight")}>
            <span className="mr-2 font-mono">{numbering}</span>
            {node.name}
          </span>
        </div>
        {hasChildren ? (
          <span className="ml-3 text-xs font-semibold text-muted-foreground">
            {isExpanded ? "−" : "+"}
          </span>
        ) : null}
      </button>
      <p className={cn(descriptionClass, "pl-3")}>{description}</p>
      {hasChildren && isExpanded && (
        <div className="space-y-4">
          {node.children.map((child, index) => (
            <ManualNodeItem
              key={child.id}
              node={child}
              numbering={`${numbering}.${index + 1}`}
              level={level + 1}
              expandedMap={expandedMap}
              onToggle={onToggle}
              fallbackDescription={fallbackDescription}
              focusId={focusId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function buildProjectManualTree(
  project: Project,
  structureModules: StructureModuleNode[]
): ManualNode {
  const { moduleDescriptions, featureDescriptions } = mapProjectContent(
    project.modules
  );

  return {
    id: project.id,
    type: "project",
    name: project.name,
    description: project.description,
    children: structureModules.map((moduleNode) =>
      convertModuleNode(moduleNode, moduleDescriptions, featureDescriptions)
    ),
  };
}

function convertModuleNode(
  node: StructureModuleNode,
  moduleDescriptions: Map<string, string | null>,
  featureDescriptions: Map<string, string | null>
): ManualNode {
  const manualNode: ManualNode = {
    id: node.id,
    type: "module",
    name: node.name,
    description: moduleDescriptions.get(node.id) ?? null,
    children: [],
  };

  manualNode.children = node.items.map((item) => {
    if (item.type === "module") {
      return convertModuleNode(item, moduleDescriptions, featureDescriptions);
    }
    return convertFeatureItem(item, featureDescriptions);
  });

  return manualNode;
}

function convertFeatureItem(
  item: StructureFeatureItem,
  featureDescriptions: Map<string, string | null>
): ManualNode {
  return {
    id: item.id,
    type: "feature",
    name: item.name,
    description: featureDescriptions.get(item.id) ?? null,
    children: [],
  };
}

function mapProjectContent(modules: Module[] | undefined | null): {
  moduleDescriptions: Map<string, string | null>;
  featureDescriptions: Map<string, string | null>;
} {
  const moduleDescriptions = new Map<string, string | null>();
  const featureDescriptions = new Map<string, string | null>();

  const visit = (moduleList?: Module[] | null) => {
    if (!moduleList) return;
    moduleList.forEach((mod) => {
      moduleDescriptions.set(mod.id, mod.description ?? null);
      const moduleFeatures =
        (mod.features as Feature[] | null | undefined) ?? null;
      moduleFeatures?.forEach((feature) => {
        featureDescriptions.set(feature.id, feature.description ?? null);
      });
      const children =
        (mod.childrens as Module[] | null | undefined) ??
        (mod as unknown as { children?: Module[] | null }).children ??
        null;
      if (children && children.length > 0) {
        visit(children);
      }
    });
  };

  visit(modules ?? null);

  return { moduleDescriptions, featureDescriptions };
}

function findPath(node: ManualNode, targetId: string): string[] {
  if (node.id === targetId) return [node.id];
  for (const child of node.children) {
    const childPath = findPath(child, targetId);
    if (childPath.length > 0) {
      return [node.id, ...childPath];
    }
  }
  return [];
}
