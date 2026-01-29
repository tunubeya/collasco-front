"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProjectStatus, Visibility } from "@/lib/definitions";
import type { StructureModuleNode } from "@/lib/definitions";
import type { Project } from "@/lib/model-definitions/project";
import { fetchPublicManual, PublicManualError } from "@/lib/api/public-manual";
import {
  ManualOutline,
  buildProjectManualTree,
} from "@/ui/components/manual/manual-outline.client";

type PublicManualClientProps = {
  linkId: string;
  labelIds?: string[];
};

type PublicProjectInfo = {
  name: string;
  description?: string | null;
};

export function PublicManualClient({
  linkId,
  labelIds,
}: PublicManualClientProps) {
  const tManual = useTranslations("app.projects.manual");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tProjectTabs = useTranslations("app.projects.detail.tabs");
  const [modules, setModules] = useState<StructureModuleNode[] | null>(null);
  const [projectInfo, setProjectInfo] = useState<PublicProjectInfo | null>(null);
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(null);
  const [projectDocumentationLabels, setProjectDocumentationLabels] = useState<
    StructureModuleNode["documentationLabels"] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "all">("content");

  const loadManual = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchPublicManual({
        linkId,
        labelIds,
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
  }, [labelIds, linkId, tManual, tProjectTabs]);

  useEffect(() => {
    void loadManual();
  }, [loadManual]);

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
