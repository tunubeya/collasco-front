"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Share2 } from "lucide-react";

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
  linkedFeatures?: Array<{
    id: string;
    name: string;
    moduleId: string | null;
    moduleName: string | null;
    reason?: string | null;
    direction: "references" | "referenced_by";
  }>;
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
  filterOptions?: Array<{ value: "all" | "content"; label: string }>;
  viewMode?: "all" | "content";
  onViewModeChange?: (mode: "all" | "content") => void;
  filterLabel?: string;
  linkedLabel?: {
    references?: string;
    referencedBy?: string;
  } | string;
  shareAction?: {
    label: string;
    onClick: () => void;
  };
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
  filterOptions,
  viewMode,
  onViewModeChange,
  filterLabel,
  linkedLabel,
  shareAction,
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

  const handleNavigateTo = useCallback(
    (targetId: string) => {
      const path = findPath(root, targetId);
      if (!path.length) return;
      setExpanded((prev) => {
        const next = { ...prev };
        path.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      window.requestAnimationFrame(() => {
        const anchor = document.getElementById(getNodeDomId(targetId));
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
          const button = anchor.querySelector("button");
          if (button instanceof HTMLButtonElement) {
            button.focus({ preventScroll: true });
          }
        }
      });
    },
    [root],
  );

  const resolvedLinkedLabels = useMemo(() => {
    if (!linkedLabel) {
      return { references: "References", referencedBy: "Referenced by" };
    }
    if (typeof linkedLabel === "string") {
      return { references: linkedLabel, referencedBy: linkedLabel };
    }
    return {
      references: linkedLabel.references ?? "References",
      referencedBy: linkedLabel.referencedBy ?? "Referenced by",
    };
  }, [linkedLabel]);

  const handleExpandAll = () =>
    setExpanded(Object.fromEntries(allNodeIds.map((id) => [id, true])));
  const handleCollapseAll = () => setExpanded({ [root.id]: false });
  const hasChildren = root.children.length > 0;
  return (
    <div className={cn("rounded-xl border bg-background p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {title ? <h2 className="font-semibold">{title}</h2> : <div />}
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions && filterOptions.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filterLabel ?? ""}</span>
              <select
                className="min-w-[160px] rounded-md border px-3 py-1 text-xs text-foreground"
                value={viewMode}
                onChange={(event) =>
                  onViewModeChange?.(event.target.value as "all" | "content")
                }
                aria-label={filterLabel ?? "Filter"}
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {shareAction && (
            <button
              type="button"
              onClick={shareAction.onClick}
              className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {shareAction.label}
            </button>
          )}
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
        onNavigateTo={handleNavigateTo}
        linkedLabel={resolvedLinkedLabels}
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
  onNavigateTo?: (id: string) => void;
  linkedLabel?: {
    references: string;
    referencedBy: string;
  };
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
  onNavigateTo,
  linkedLabel,
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
  const referencesLabel = linkedLabel?.references ?? "References";
  const referencedByLabel = linkedLabel?.referencedBy ?? "Referenced by";

  return (
    <div className="space-y-2" id={getNodeDomId(node.id)}>
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
      {node.linkedFeatures?.length ? (
        <div className="flex flex-wrap items-center gap-2 px-3 text-xs text-muted-foreground">
          {node.linkedFeatures.map((linked) => {
            const hasReason = Boolean(linked.reason && linked.reason.trim().length);
            const reasonId = hasReason ? `reason-${node.id}-${linked.id}` : undefined;
            const descriptor =
              linked.direction === "referenced_by"
                ? referencedByLabel
                : referencesLabel;
            return (
              <div key={linked.id} className="relative">
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] transition hover:border-primary hover:text-primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onNavigateTo?.(linked.id);
                  }}
                  onMouseEnter={() => {
                    if (reasonId) {
                      document.getElementById(reasonId)?.classList.remove("hidden");
                    }
                  }}
                  onMouseLeave={() => {
                    if (reasonId) {
                      document.getElementById(reasonId)?.classList.add("hidden");
                    }
                  }}
                >
                  <span className="font-semibold">{descriptor}</span>{" "}
                  <span>{linked.name}</span>
                </button>
                {hasReason ? (
                  <div
                    id={reasonId}
                    className="hidden absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-border bg-background p-2 text-[11px] text-muted-foreground shadow-lg"
                  >
                    {linked.reason}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
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
              onNavigateTo={onNavigateTo}
              linkedLabel={linkedLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ManualBuildOptions = {
  mode: "all" | "content";
  statuses: {
    notApplicable: string;
    empty: string;
  };
};

export function buildProjectManualTree(
  project: Project,
  structureModules: StructureModuleNode[],
  options?: ManualBuildOptions,
  projectDocumentationLabels?: StructureModuleNode["documentationLabels"]
): ManualNode {
  const documentationDescription = projectDocumentationLabels
    ? buildDocumentationDescription(projectDocumentationLabels, options)
    : null;
  const manualRoot: ManualNode = {
    id: project.id,
    type: "project",
    name: project.name,
    description: documentationDescription ?? project.description,
    children: structureModules.map((moduleNode) =>
      convertModuleNode(moduleNode, options)
    ),
  };

  assignNumbering(manualRoot, "1");

  return manualRoot;
}

function convertModuleNode(
  node: StructureModuleNode,
  options?: ManualBuildOptions
): ManualNode {
  const manualNode: ManualNode = {
    id: node.id,
    type: "module",
    name: node.name,
    description: buildDocumentationDescription(node.documentationLabels, options),
    children: [],
  };

  manualNode.children = node.items.map((item) => {
    if (item.type === "module") {
      return convertModuleNode(item, options);
    }
    return convertFeatureItem(item, options);
  });

  return manualNode;
}

function convertFeatureItem(
  item: StructureFeatureItem,
  options?: ManualBuildOptions
): ManualNode {
  return {
    id: item.id,
    type: "feature",
    name: item.name,
    description: buildDocumentationDescription(item.documentationLabels, options),
    linkedFeatures: (item.linkedFeatures ?? []).map((linked) => ({
      ...linked,
      direction: linked.direction ?? "references",
    })),
    children: [],
  };
}

function buildDocumentationDescription(
  labels:
    | StructureModuleNode["documentationLabels"]
    | StructureFeatureItem["documentationLabels"],
  options?: ManualBuildOptions
): string | null {
  if (!labels || labels.length === 0) return null;
  const mode = options?.mode ?? "content";
  const emptyText = options?.statuses?.empty ?? "No content";
  const notApplicableText =
    options?.statuses?.notApplicable ?? "Not applicable";
  const sections = labels
    .map((label) => {
      const trimmed = label.content?.trim() ?? "";
      if (mode === "content") {
        if (label.isNotApplicable || trimmed.length === 0) {
          return null;
        }
        return renderSection(label.labelName, label.content ?? "", label.isMandatory);
      }
      let body: string;
      if (label.isNotApplicable) {
        body = `<p><em>${escapeHtml(notApplicableText)}</em></p>`;
      } else if (trimmed.length === 0) {
        body = `<p><em>${escapeHtml(emptyText)}</em></p>`;
      } else {
        body = label.content ?? "";
      }
      return renderSection(label.labelName, body, label.isMandatory);
    })
    .filter(
      (section): section is string => Boolean(section && section.trim().length)
    );

  if (sections.length === 0) return null;
  return sections.join("<hr />");
}

function renderSection(labelName: string, content: string, isMandatory?: boolean) {
  const badge = isMandatory ? " *" : "";
  return `<p><strong>${escapeHtml(labelName)}${badge}</strong></p>${content}`;
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

function getNodeDomId(id: string) {
  return `manual-node-${id}`;
}
