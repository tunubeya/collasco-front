"use client";

import Link from "next/link";
import { Children, type ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsDown,
  ChevronsUp,
  FileText,
  Folder,
  FolderOpen,
  ListTree,
  Menu,
  Search,
  X,
} from "lucide-react";

import type {
  StructureFeatureItem,
  StructureModuleNode,
} from "@/lib/definitions";
import { documentationSectionId } from "@/lib/structure-helpers";
import { cn } from "@/lib/utils";
import {
  readStoredStructureTab,
  subscribeToStructureTabChange,
} from "@/ui/components/projects/use-structure-session-tab";

type ProjectStructureWorkspaceProps = {
  projectId: string;
  projectName: string;
  roots: StructureModuleNode[];
  selectedModuleId?: string;
  selectedFeatureId?: string;
  children: ReactNode;
};

type ExpandedMap = Record<string, boolean>;

export function ProjectStructureWorkspace({
  projectId,
  projectName,
  roots,
  selectedModuleId,
  selectedFeatureId,
  children,
}: ProjectStructureWorkspaceProps) {
  const t = useTranslations("app.projects.detail.navigation");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") ?? readStoredStructureTab(),
  );
  const activeModuleIds = useMemo(
    () => findActiveModuleIds(roots, selectedModuleId, selectedFeatureId),
    [roots, selectedFeatureId, selectedModuleId],
  );
  const allModuleIds = useMemo(() => collectModuleIds(roots), [roots]);
  const expandedStorageKey = `project-structure-expanded:${projectId}`;
  const [expanded, setExpanded] = useState<ExpandedMap>(() =>
    restoreExpandedMap(expandedStorageKey, activeModuleIds),
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const contentItems = Children.toArray(children);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleRoots = useMemo(
    () =>
      normalizedQuery
        ? roots
            .map((root) => filterModuleTree(root, normalizedQuery))
            .filter((root): root is StructureModuleNode => Boolean(root))
        : roots,
    [normalizedQuery, roots],
  );
  const navigationQuery = activeTab ? `?tab=${encodeURIComponent(activeTab)}` : "";

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? readStoredStructureTab());
  }, [searchParams]);

  useEffect(
    () => subscribeToStructureTabChange((tab) => setActiveTab(tab)),
    [],
  );

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };
      activeModuleIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [activeModuleIds]);

  useEffect(() => {
    window.sessionStorage.setItem(expandedStorageKey, JSON.stringify(expanded));
  }, [expanded, expandedStorageKey]);

  function handleExpandAll() {
    setExpanded(Object.fromEntries(allModuleIds.map((id) => [id, true])));
  }

  function handleCollapseAll() {
    setExpanded(Object.fromEntries(activeModuleIds.map((id) => [id, true])));
  }

  const tree = (
    <nav aria-label={t("title")}>
      {visibleRoots.length ? (
        <ul className="space-y-1">
          {visibleRoots.map((root) => (
            <li key={root.id}>
              <NavigationModule
                node={root}
                projectId={projectId}
                navigationQuery={navigationQuery}
                selectedModuleId={selectedModuleId}
                selectedFeatureId={selectedFeatureId}
                expanded={expanded}
                setExpanded={setExpanded}
                level={0}
                forceExpanded={Boolean(normalizedQuery)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
          {normalizedQuery ? t("noResults") : t("empty")}
        </p>
      )}
    </nav>
  );

  const expandedPanel = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <Link href={`/app/projects/${projectId}${navigationQuery}`} className="min-w-0 px-1">
          <span className="block truncate text-lg font-semibold">{projectName}</span>
          <span className="text-xs text-muted-foreground">{t("title")}</span>
        </Link>
        <button
          type="button"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
          onClick={() => setIsDesktopCollapsed(true)}
          aria-label={t("collapse")}
          title={t("collapse")}
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {allModuleIds.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={handleExpandAll}
          >
            <ChevronsDown className="h-3.5 w-3.5" aria-hidden />
            {t("expandAll")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={handleCollapseAll}
          >
            <ChevronsUp className="h-3.5 w-3.5" aria-hidden />
            {t("collapseAll")}
          </button>
        </div>
      ) : null}
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-9 w-full rounded-md border bg-background py-2 pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("clearSearch")}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {tree}
    </>
  );

  return (
    <div
      className={cn(
        "grid gap-4 lg:items-start",
        !isDesktopCollapsed &&
          "lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]",
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium lg:hidden"
        onClick={() => setIsMobileOpen((current) => !current)}
        aria-expanded={isMobileOpen}
      >
        <span className="flex items-center gap-2">
          <ListTree className="h-4 w-4" aria-hidden />
          {t("title")}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isMobileOpen && "rotate-180")}
          aria-hidden
        />
      </button>

      {isMobileOpen ? (
        <aside className="rounded-xl border bg-background p-3 lg:hidden">
          {expandedPanel}
        </aside>
      ) : null}

      <aside
        className={cn(
          "sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border bg-background lg:block",
          isDesktopCollapsed ? "lg:hidden" : "p-3",
        )}
      >
        {expandedPanel}
      </aside>

      <div className="grid min-w-0 gap-6">
        {isDesktopCollapsed && contentItems.length ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground lg:flex"
                onClick={() => setIsDesktopCollapsed(false)}
                aria-label={t("expand")}
                title={t("expand")}
              >
                <Menu className="h-4 w-4" aria-hidden />
              </button>
              <div className="min-w-0 flex-1 [&>*]:!mb-0">{contentItems[0]}</div>
            </div>
            {contentItems.slice(1)}
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function NavigationModule({
  node,
  projectId,
  navigationQuery,
  selectedModuleId,
  selectedFeatureId,
  expanded,
  setExpanded,
  level,
  forceExpanded,
}: {
  node: StructureModuleNode;
  projectId: string;
  navigationQuery: string;
  selectedModuleId?: string;
  selectedFeatureId?: string;
  expanded: ExpandedMap;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedMap>>;
  level: number;
  forceExpanded: boolean;
}) {
  const tModules = useTranslations("app.projects.detail.modules");
  const isOpen = forceExpanded || Boolean(expanded[node.id]);
  const isSelected = node.id === selectedModuleId;
  const hasChildren = node.items.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex min-w-0 items-center gap-1 rounded-md py-1.5 pr-2 text-sm",
          isSelected ? "bg-blue-50 text-blue-800" : "hover:bg-muted/40",
        )}
        style={{ paddingLeft: Math.min(level, 6) * 12 + 4 }}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
          onClick={() => setExpanded((current) => ({ ...current, [node.id]: !isOpen }))}
          disabled={!hasChildren || forceExpanded}
          aria-label={isOpen ? tModules("collapseAll") : tModules("expandAll")}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
            aria-hidden
          />
        </button>
        {isOpen ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        )}
        <Link
          href={`/app/projects/${projectId}/modules/${node.id}${navigationQuery}`}
          className="min-w-0 flex-1 truncate font-medium"
        >
          {node.name}
        </Link>
        <VersionPill item={node} />
      </div>

      {isOpen && hasChildren ? (
        <ul className="space-y-1">
          {node.items.map((item) => (
            <li key={item.id}>
              {item.type === "module" ? (
                <NavigationModule
                  node={item}
                  projectId={projectId}
                  navigationQuery={navigationQuery}
                  selectedModuleId={selectedModuleId}
                  selectedFeatureId={selectedFeatureId}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  level={level + 1}
                  forceExpanded={forceExpanded}
                />
              ) : (
                <NavigationFeature
                  feature={item}
                  projectId={projectId}
                  navigationQuery={navigationQuery}
                  isSelected={item.id === selectedFeatureId}
                  level={level + 1}
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NavigationFeature({
  feature,
  projectId,
  navigationQuery,
  isSelected,
  level,
}: {
  feature: StructureFeatureItem;
  projectId: string;
  navigationQuery: string;
  isSelected: boolean;
  level: number;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md py-1.5 pr-2 text-sm",
          isSelected ? "bg-blue-50 text-blue-800" : "hover:bg-muted/40",
        )}
        style={{ paddingLeft: Math.min(level, 6) * 12 + 28 }}
      >
        <FileText className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        <Link
          href={`/app/projects/${projectId}/features/${feature.id}${navigationQuery}`}
          className={cn("min-w-0 flex-1 truncate", isSelected && "font-medium")}
        >
          {feature.name}
        </Link>
        <FeaturePills feature={feature} />
      </div>

      {isSelected && feature.documentationLabels?.length ? (
        <ul className="ml-9 border-l border-slate-200 py-1">
          {(feature.documentationLabels ?? [])
            .slice()
            .sort((left, right) => left.displayOrder - right.displayOrder)
            .map((label) => (
              <li key={label.labelId}>
                <a
                  href={`#${documentationSectionId(label.labelId)}`}
                  className="block truncate py-1 pl-3 pr-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("feature-documentation-anchor", {
                        detail: { labelId: label.labelId },
                      }),
                    );
                  }}
                >
                  {label.labelName}
                </a>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

function FeaturePills({ feature }: { feature: StructureFeatureItem }) {
  const statusTone =
    feature.status === "DONE"
      ? "border-green-200 bg-green-50 text-green-800"
      : feature.status === "IN_PROGRESS"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
  const priorityTone =
    feature.priority === "HIGH"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : feature.priority === "LOW"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className="flex shrink-0 items-center gap-1">
      <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px]", statusTone)}>
        {feature.status.toLowerCase().replace(/_/g, " ")}
      </span>
      {feature.priority ? (
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px]", priorityTone)}>
          {feature.priority.toLowerCase()}
        </span>
      ) : null}
      <VersionPill item={feature} />
    </span>
  );
}

function VersionPill({
  item,
}: {
  item: StructureModuleNode | StructureFeatureItem;
}) {
  const version =
    item.documentationVersion?.versionNumber ?? item.documentationVersionNumber;
  return version ? (
    <span className="rounded-full border bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
      v{version}
    </span>
  ) : null;
}

function filterModuleTree(
  node: StructureModuleNode,
  query: string,
): StructureModuleNode | null {
  const filteredItems: Array<StructureModuleNode | StructureFeatureItem> = [];
  node.items.forEach((item) => {
    if (item.type === "feature") {
      if (item.name.toLocaleLowerCase().includes(query)) {
        filteredItems.push(item);
      }
      return;
    }
    const filteredModule = filterModuleTree(item, query);
    if (filteredModule) {
      filteredItems.push(filteredModule);
    }
  });

  if (!node.name.toLocaleLowerCase().includes(query) && !filteredItems.length) {
    return null;
  }

  return { ...node, items: filteredItems };
}

function findActiveModuleIds(
  nodes: StructureModuleNode[],
  selectedModuleId?: string,
  selectedFeatureId?: string,
): string[] {
  for (const node of nodes) {
    if (node.id === selectedModuleId) return [node.id];
    if (
      selectedFeatureId &&
      node.items.some((item) => item.type === "feature" && item.id === selectedFeatureId)
    ) {
      return [node.id];
    }
    const childModules = node.items.filter(
      (item): item is StructureModuleNode => item.type === "module",
    );
    const childPath = findActiveModuleIds(
      childModules,
      selectedModuleId,
      selectedFeatureId,
    );
    if (childPath.length) return [node.id, ...childPath];
  }
  return [];
}

function collectModuleIds(nodes: StructureModuleNode[]): string[] {
  const ids: string[] = [];
  const walk = (node: StructureModuleNode) => {
    ids.push(node.id);
    node.items.forEach((item) => {
      if (item.type === "module") {
        walk(item);
      }
    });
  };
  nodes.forEach(walk);
  return ids;
}

function restoreExpandedMap(
  storageKey: string,
  activeModuleIds: string[],
): ExpandedMap {
  if (typeof window === "undefined") {
    return Object.fromEntries(activeModuleIds.map((id) => [id, true]));
  }

  try {
    const saved = window.sessionStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Object.fromEntries(activeModuleIds.map((id) => [id, true]));
    }
    return {
      ...(parsed as ExpandedMap),
      ...Object.fromEntries(activeModuleIds.map((id) => [id, true])),
    };
  } catch {
    return Object.fromEntries(activeModuleIds.map((id) => [id, true]));
  }
}
