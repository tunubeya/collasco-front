"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ProjectStatus, Visibility } from "@/lib/definitions";
import type { StructureDocumentationLabel, StructureModuleNode } from "@/lib/definitions";
import type { Project } from "@/lib/model-definitions/project";
import { fetchPublicManual, PublicManualError } from "@/lib/api/public-manual";
import {
  ManualOutline,
  buildProjectManualTree,
} from "@/ui/components/manual/manual-outline.client";
import { cn } from "@/lib/utils";

type PublicManualClientProps = {
  linkId: string;
  labelIds?: string[];
};

type PublicProjectInfo = {
  name: string;
  description?: string | null;
};

function parseLabelIds(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function collectLabelsFromModules(
  modules: StructureModuleNode[] | null,
): StructureDocumentationLabel[] {
  if (!modules || modules.length === 0) return [];
  const map = new Map<string, StructureDocumentationLabel>();

  const addLabel = (label: StructureDocumentationLabel) => {
    const existing = map.get(label.labelId);
    if (!existing) {
      map.set(label.labelId, { ...label });
      return;
    }
    map.set(label.labelId, {
      ...existing,
      isMandatory: existing.isMandatory || label.isMandatory,
      displayOrder: Math.min(existing.displayOrder, label.displayOrder),
    });
  };

  const walk = (node: StructureModuleNode) => {
    node.documentationLabels?.forEach(addLabel);
    node.items.forEach((item) => {
      if (item.type === "module") {
        walk(item);
      } else {
        item.documentationLabels?.forEach(addLabel);
      }
    });
  };

  modules.forEach(walk);
  return Array.from(map.values());
}

export function PublicManualClient({
  linkId,
  labelIds: initialLabelIds,
}: PublicManualClientProps) {
  const tManual = useTranslations("app.projects.manual");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tProjectTabs = useTranslations("app.projects.detail.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modules, setModules] = useState<StructureModuleNode[] | null>(null);
  const [projectInfo, setProjectInfo] = useState<PublicProjectInfo | null>(null);
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(null);
  const [projectDocumentationLabels, setProjectDocumentationLabels] = useState<
    StructureModuleNode["documentationLabels"] | null
  >(null);
  const [availableLabels, setAvailableLabels] = useState<
    StructureModuleNode["documentationLabels"]
  >([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "all">("content");

  const labelIdsFromUrl = useMemo(() => {
    const labels = searchParams?.get("labels");
    const parsed = parseLabelIds(labels);
    if (parsed.length > 0) return parsed;
    return initialLabelIds ?? [];
  }, [initialLabelIds, searchParams]);

  const loadManual = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchPublicManual({
        linkId,
        labelIds: labelIdsFromUrl.length > 0 ? labelIdsFromUrl : undefined,
      });
      const resolvedName =
        payload.project?.name ??
        payload.projectName ??
        payload.name ??
        tProjectTabs("manual");
      const resolvedDescription =
        payload.project?.description ?? payload.description ?? null;
      setProjectInfo({ name: resolvedName, description: resolvedDescription });
      setResolvedProjectId(payload.projectId ?? null);
      setModules(payload.modules ?? []);
      setProjectDocumentationLabels(payload.documentationLabels ?? null);
      const fromPayload =
        payload.documentationLabels ??
        collectLabelsFromModules(payload.modules ?? []);
      setAvailableLabels(fromPayload);

      if (labelIdsFromUrl.length > 0) {
        try {
          const allowed = await fetchPublicManual({ linkId });
          const allowedLabels =
            allowed.documentationLabels ??
            collectLabelsFromModules(allowed.modules ?? []);
          if (allowedLabels.length > 0) {
            setAvailableLabels(allowedLabels);
          }
        } catch {
          // Ignore label refresh errors; main payload already loaded.
        }
      }
    } catch (err) {
      console.error("Failed to load public manual", err);
      if (err instanceof PublicManualError) {
        if (err.status === 404) {
          setError(tManual("publicNotFound"));
          return;
        }
        if (err.status === 410) {
          setError(tManual("publicRevoked"));
          return;
        }
        if (err.status === 403) {
          setError(tManual("publicForbidden"));
          return;
        }
      }
      setError(tManual("error"));
    } finally {
      setIsLoading(false);
    }
  }, [labelIdsFromUrl, linkId, tManual, tProjectTabs]);

  useEffect(() => {
    void loadManual();
  }, [loadManual]);

  const orderedLabels = useMemo(() => {
    const list = availableLabels ?? [];
    return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [availableLabels]);
  const allLabelIds = useMemo(
    () => orderedLabels.map((label) => label.labelId),
    [orderedLabels],
  );

  useEffect(() => {
    if (allLabelIds.length === 0) return;
    const filtered = labelIdsFromUrl.filter((id) => allLabelIds.includes(id));
    const nextSelected = filtered.length > 0 ? filtered : allLabelIds;
    setSelectedLabelIds(nextSelected);
  }, [allLabelIds, labelIdsFromUrl]);

  const updateLabelsQuery = useCallback(
    (nextIds: string[]) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (nextIds.length === 0 || nextIds.length === allLabelIds.length) {
        params.delete("labels");
      } else {
        params.set("labels", nextIds.join(","));
      }
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: false });
    },
    [allLabelIds.length, pathname, router, searchParams],
  );

  const handleSelectAllLabels = useCallback(() => {
    if (allLabelIds.length === 0) return;
    setSelectedLabelIds(allLabelIds);
    updateLabelsQuery(allLabelIds);
  }, [allLabelIds, updateLabelsQuery]);

  const handleToggleLabel = useCallback(
    (labelId: string) => {
      const isSelected = selectedLabelIds.includes(labelId);
      const next = isSelected
        ? selectedLabelIds.filter((id) => id !== labelId)
        : [...selectedLabelIds, labelId];
      if (next.length === 0) return;
      setSelectedLabelIds(next);
      updateLabelsQuery(next);
    },
    [selectedLabelIds, updateLabelsQuery],
  );

  const manualProject = useMemo<Project>(() => {
    const now = new Date().toISOString();
    return {
      id: resolvedProjectId ?? "public",
      name: projectInfo?.name ?? tProjectTabs("manual"),
      slug: null,
      description: projectInfo?.description ?? null,
      status: ProjectStatus.ACTIVE,
      repositoryUrl: null,
      visibility: Visibility.PUBLIC,
      deadline: null,
      createdAt: now,
      updatedAt: now,
      ownerId: "public",
      modules: [],
    };
  }, [projectInfo, resolvedProjectId, tProjectTabs]);

  const manualStates = useMemo(
    () => ({
      notApplicable: tManual("states.notApplicable"),
      empty: tManual("states.empty"),
    }),
    [tManual],
  );

  const filterOptions = useMemo(
    () => [
      { value: "content" as const, label: tManual("filters.content") },
      { value: "all" as const, label: tManual("filters.all") },
    ],
    [tManual],
  );

  const filterLabel = tManual("filters.label");

  const linkedLabels = useMemo(
    () => ({
      references: tManual("linkedFeatures.references"),
      referencedBy: tManual("linkedFeatures.referencedBy"),
    }),
    [tManual],
  );

  const manualTree = useMemo(() => {
    if (!modules) return null;
    return buildProjectManualTree(
      manualProject,
      modules,
      {
        mode: viewMode,
        statuses: manualStates,
      },
      projectDocumentationLabels ?? undefined,
    );
  }, [
    manualProject,
    manualStates,
    modules,
    projectDocumentationLabels,
    viewMode,
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{tManual("loading")}</span>
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 text-slate-800 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {tManual("share.title")}
              </p>
              <p className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {error}
              </p>
              <p className="max-w-2xl text-sm text-slate-500 sm:text-base">
                {tManual("share.linksHint")}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && orderedLabels.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {tManual("labelsNavbar.title")}
              </p>
              <p className="text-xs text-slate-500">
                {tManual("labelsNavbar.subtitle")}
              </p>
            </div>
            <button
              type="button"
              className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
              onClick={handleSelectAllLabels}
            >
              {tManual("labelsNavbar.actions.selectAll")}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {orderedLabels.map((label) => {
              const isSelected = selectedLabelIds.includes(label.labelId);
              return (
                <button
                  key={label.labelId}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800",
                  )}
                  onClick={() => handleToggleLabel(label.labelId)}
                  aria-pressed={isSelected}
                >
                  <span>{label.labelName}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!isLoading && !error && manualTree && (
        <ManualOutline
          root={manualTree}
          fallbackDescription={tManual("noDescription")}
          expandLabel={tProjectDetail("modules.expandAll", {
            default: "Expand all",
          })}
          collapseLabel={tProjectDetail("modules.collapseAll", {
            default: "Collapse all",
          })}
          filterOptions={filterOptions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filterLabel={filterLabel}
          linkedLabel={linkedLabels}
        />
      )}
    </main>
  );
}
