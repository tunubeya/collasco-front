"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ProjectStructureResponse, StructureModuleNode } from "@/lib/definitions";
import type { Project } from "@/lib/model-definitions/project";
import { fetchWithAuth } from "@/lib/utils";
import {
  ManualOutline,
  buildProjectManualTree,
  findManualNode,
} from "@/ui/components/manual/manual-outline.client";
import { MANUAL_LABELS_EVENT } from "@/ui/components/manual/manual-events";
import { ManualShareDialog } from "@/ui/components/manual/manual-share-dialog.client";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

type ManualTabContentProps = {
  token: string;
  project: Project;
  projectId: string;
  fallbackDescription: string;
  expandLabel: string;
  collapseLabel: string;
  title: string;
  focusId?: string;
  subtreeRootId?: string;
  shareAction?: {
    label: string;
    onClick: () => void;
  };
  canShareManual?: boolean;
};

export function ManualTabContent({
  token,
  project,
  projectId,
  fallbackDescription,
  expandLabel,
  collapseLabel,
  title,
  focusId,
  subtreeRootId,
  shareAction,
  canShareManual = false,
}: ManualTabContentProps) {
  const tManual = useTranslations("app.projects.manual");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [modules, setModules] = useState<StructureModuleNode[] | null>(null);
  const [projectDescription, setProjectDescription] = useState<string | null>(
    project.description ?? null,
  );
  const [projectDocumentationLabels, setProjectDocumentationLabels] = useState<
    StructureModuleNode["documentationLabels"] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "all">("content");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStructure = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: "1000",
        sort: "sortOrder",
      });
      const res = await fetchWithAuth(
        `${apiUrl}/projects/${projectId}/structure?${query.toString()}`,
        { method: "GET" },
        token,
      );
      if (!res.ok) {
        const message = await res.text().catch(() => null);
        throw new Error(message || "Failed to fetch project structure");
      }
      const payload = (await res.json()) as ProjectStructureResponse;
      if (!isMountedRef.current) return;
      setModules(payload.modules ?? []);
      setProjectDescription(payload.description ?? project.description ?? null);
      setProjectDocumentationLabels(payload.documentationLabels ?? null);
    } catch (err) {
      console.error("Failed to load manual structure", err);
      if (isMountedRef.current) {
        setError(tManual("error"));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [project.description, projectId, tManual, token]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ projectId: string }>;
      if (custom.detail?.projectId === projectId) {
        void loadStructure();
      }
    };
    window.addEventListener(MANUAL_LABELS_EVENT, handler);
    return () => {
      window.removeEventListener(MANUAL_LABELS_EVENT, handler);
    };
  }, [loadStructure, projectId]);

  const manualProject = useMemo(
    () => ({
      ...project,
      description: projectDescription ?? project.description ?? null,
    }),
    [project, projectDescription],
  );

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
    return buildProjectManualTree(manualProject, modules, {
      mode: viewMode,
      statuses: manualStates,
    }, projectDocumentationLabels ?? undefined);
  }, [manualProject, manualStates, modules, projectDocumentationLabels, viewMode]);

  const outlineRoot = useMemo(() => {
    if (!manualTree) return null;
    if (subtreeRootId) {
      return findManualNode(manualTree, subtreeRootId) ?? manualTree;
    }
    return manualTree;
  }, [manualTree, subtreeRootId]);

  return (
    <div className="space-y-3">
      {canShareManual && (
        <ManualShareDialog
          token={token}
          projectId={projectId}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{tManual("loading")}</span>
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium"
            onClick={() => void loadStructure()}
            disabled={isLoading}
          >
            {tManual("retry")}
          </button>
        </div>
      )}

      {!isLoading && !error && outlineRoot && (
        <ManualOutline
          root={outlineRoot}
          focusId={focusId}
          fallbackDescription={fallbackDescription}
          expandLabel={expandLabel}
          collapseLabel={collapseLabel}
          title={title}
          filterOptions={filterOptions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filterLabel={filterLabel}
          linkedLabel={linkedLabels}
          shareAction={
            canShareManual
              ? {
                  label: tManual("share.label"),
                  onClick: () => setIsShareOpen(true),
                }
              : shareAction
          }
        />
      )}
    </div>
  );
}
