"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import type { Project } from "@/lib/model-definitions/project";
import type {
  StructureFeatureItem,
  StructureModuleNode,
} from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";

export type ManualNode = {
  id: string;
  type: "project" | "module" | "feature";
  name: string;
  description?: string | null;
  numbering?: string;
  children: ManualNode[];
};

type ManualOutlineProps = {
  root: ManualNode;
  focusId?: string;
  fallbackDescription: string;
  expandLabel: string;
  collapseLabel: string;
  title?: string;
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
  expandLabel,
  collapseLabel,
  title,
  className,
}: ManualOutlineProps) {
  const focusPath = useMemo(() => {
    if (!focusId) return [];
    return findPath(root, focusId);
  }, [root, focusId]);

  const allNodeIds = useMemo(() => collectNodeIds(root), [root]);

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

  const handleExpandAll = () =>
    setExpanded(Object.fromEntries(allNodeIds.map((id) => [id, true])));
  const handleCollapseAll = () => setExpanded({ [root.id]: false });
  const hasChildren = root.children.length > 0;

  return (
    <div className={cn("rounded-xl border bg-background p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {title ? <h2 className="font-semibold">{title}</h2> : <div />}
        {hasChildren && (
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        )}
      </div>
      <ManualNodeItem
        node={root}
        numbering={root.numbering ?? "1"}
        level={0}
        expandedMap={expanded}
        onToggle={(id) =>
          setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
        }
        fallbackDescription={fallbackDescription}
        focusId={focusId}
        rootId={root.id}
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
  rootId: string;
};

function ManualNodeItem({
  node,
  numbering,
  level,
  expandedMap,
  onToggle,
  fallbackDescription,
  focusId,
  rootId,
}: ManualNodeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded =
    typeof expandedMap[node.id] === "boolean"
      ? expandedMap[node.id]
      : node.id === rootId;
  const titleClass =
    TITLE_CLASSES[Math.min(level, TITLE_CLASSES.length - 1)];
  const descriptionClass =
    DESCRIPTION_CLASSES[Math.min(level, DESCRIPTION_CLASSES.length - 1)];
  const richTextValue =
    node.description && node.description.trim().length > 0
      ? node.description
      : null;
  const isFocused = focusId === node.id;
  const currentNumbering =
    node.numbering && node.numbering.trim().length > 0
      ? node.numbering
      : numbering;

  return (
    <div className="space-y-2">
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
            <span className="mr-2 font-mono">{currentNumbering}</span>
            {node.name}
          </span>
        </div>
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "ml-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isExpanded ? "rotate-90" : ""
            )}
            aria-hidden
          />
        ) : null}
      </button>
      <div className="px-3">
        <RichTextPreview
          value={richTextValue}
          emptyLabel={fallbackDescription}
          className={cn(descriptionClass)}
        />
      </div>
      {hasChildren && isExpanded && (
        <div className="space-y-4">
          {node.children.map((child, index) => (
            <ManualNodeItem
              key={child.id}
              node={child}
              numbering={
                child.numbering && child.numbering.trim().length > 0
                  ? child.numbering
                  : `${currentNumbering}.${index + 1}`
              }
              level={level + 1}
              expandedMap={expandedMap}
              onToggle={onToggle}
              fallbackDescription={fallbackDescription}
              focusId={focusId}
              rootId={rootId}
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
  const manualRoot: ManualNode = {
    id: project.id,
    type: "project",
    name: project.name,
    description: project.description,
    children: structureModules.map((moduleNode) =>
      convertModuleNode(moduleNode)
    ),
  };

  assignNumbering(manualRoot, "1");

  return manualRoot;
}

function convertModuleNode(node: StructureModuleNode): ManualNode {
  const manualNode: ManualNode = {
    id: node.id,
    type: "module",
    name: node.name,
    description: buildDocumentationDescription(node.documentationLabels),
    children: [],
  };

  manualNode.children = node.items.map((item) => {
    if (item.type === "module") {
      return convertModuleNode(item);
    }
    return convertFeatureItem(item);
  });

  return manualNode;
}

function convertFeatureItem(item: StructureFeatureItem): ManualNode {
  return {
    id: item.id,
    type: "feature",
    name: item.name,
    description: buildDocumentationDescription(item.documentationLabels),
    children: [],
  };
}

function buildDocumentationDescription(
  labels: StructureModuleNode["documentationLabels"] | StructureFeatureItem["documentationLabels"]
): string | null {
  if (!labels || labels.length === 0) return null;
  const sections = labels
    .filter(
      (label) =>
        !label.isNotApplicable &&
        typeof label.content === "string" &&
        label.content.trim().length > 0
    )
    .map(
      (label) =>
        `<p><strong>${escapeHtml(label.labelName)}</strong></p>${label.content ?? ""}`
    );

  if (sections.length === 0) return null;
  return sections.join("<hr />");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function assignNumbering(node: ManualNode, numbering: string) {
  node.numbering = numbering;
  node.children.forEach((child, index) => {
    assignNumbering(child, `${numbering}.${index + 1}`);
  });
}

export function findManualNode(
  node: ManualNode,
  targetId: string
): ManualNode | null {
  if (node.id === targetId) return node;
  for (const child of node.children) {
    const found = findManualNode(child, targetId);
    if (found) {
      return found;
    }
  }
  return null;
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

function collectNodeIds(node: ManualNode): string[] {
  const childIds = node.children.flatMap((child) => collectNodeIds(child));
  return [node.id, ...childIds];
}
