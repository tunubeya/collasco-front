"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw, Trash2 } from "lucide-react";
import type { Project } from "@/lib/model-definitions/project";
import type { Module } from "@/lib/model-definitions/module";
import type { Feature } from "@/lib/model-definitions/feature";
import type { QaProjectLabel } from "@/lib/api/qa";
import {
  fetchDeletedFeatures,
  fetchDeletedModules,
  fetchDeletedProjects,
  fetchRestoreFeature,
  fetchRestoreModule,
  fetchRestoreProject,
} from "@/lib/data";
import { listDeletedProjectLabels, restoreProjectLabel } from "@/lib/api/qa";
import { cn } from "@/lib/utils";

type TrashTab = "projects" | "modules" | "features" | "labels";

type ProjectTrashTabProps = {
  token: string;
  projectId: string;
};

type TrashItem = {
  id: string;
  name?: string | null;
  deletedAt?: string | null;
  deletedByName?: string | null;
  deletedBy?: { name?: string | null } | null;
  moduleId?: string | null;
};

export function ProjectTrashTab({ token, projectId }: ProjectTrashTabProps) {
  const t = useTranslations("app.projects.trash");
  const tTabs = useTranslations("app.projects.detail.tabs");
  const formatter = useFormatter();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TrashTab>("projects");
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [labels, setLabels] = useState<QaProjectLabel[]>([]);
  const [deletedModuleIds, setDeletedModuleIds] = useState<Set<string>>(
    new Set()
  );

  const loadTab = useCallback(
    async (tab: TrashTab) => {
      setIsLoading(true);
      try {
        if (tab === "projects") {
          const data = await fetchDeletedProjects(token, { page: 1, limit: 50 });
          setProjects(data.items ?? []);
        } else if (tab === "modules") {
          const data = await fetchDeletedModules(token, projectId, {
            page: 1,
            limit: 50,
          });
          setModules(data.items ?? []);
        } else if (tab === "features") {
          const data = await fetchDeletedFeatures(token, projectId, {
            page: 1,
            limit: 50,
          });
          setFeatures(data.items ?? []);
          const deletedModules = await fetchDeletedModules(token, projectId, {
            page: 1,
            limit: 100,
          });
          const moduleIds = new Set(
            (deletedModules.items ?? [])
              .map((item) => item.id)
              .filter(Boolean)
          );
          setDeletedModuleIds(moduleIds);
        } else if (tab === "labels") {
          const data = await listDeletedProjectLabels(token, projectId);
          setLabels(data ?? []);
        }
      } catch (error) {
        toast.error(t("messages.loadError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, token],
  );

  useEffect(() => {
    void loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleRestore = useCallback(
    async (tab: TrashTab, id: string) => {
      setRestoringId(id);
      try {
        if (tab === "projects") {
          await fetchRestoreProject(token, id);
        } else if (tab === "modules") {
          await fetchRestoreModule(token, id);
        } else if (tab === "features") {
          await fetchRestoreFeature(token, id);
        } else if (tab === "labels") {
          await restoreProjectLabel(token, projectId, id);
        }
        toast.success(t("messages.restoreSuccess"));
        router.refresh();
        await loadTab(tab);
      } catch (error) {
        let description: string | undefined;
        let message = "";
        if (error instanceof Response) {
          try {
            const payload = (await error.json()) as { message?: string };
            message = payload?.message ?? "";
          } catch {
            message = "";
          }
        } else if (error instanceof Error) {
          message = error.message;
        }

        if (
          message.toLowerCase().includes("restore parent first") ||
          (message.toLowerCase().includes("parent") &&
            message.toLowerCase().includes("deleted")) ||
          (message.toLowerCase().includes("module") &&
            message.toLowerCase().includes("deleted"))
        ) {
          toast.error(t("messages.restoreParentFirst"));
        } else {
          description = message || undefined;
          toast.error(t("messages.restoreError"), { description });
        }
      } finally {
        setRestoringId(null);
      }
    },
    [loadTab, projectId, token],
  );

  const tabs = useMemo(
    () => [
      { key: "projects" as const, label: t("tabs.projects") },
      { key: "modules" as const, label: t("tabs.modules") },
      { key: "features" as const, label: t("tabs.features") },
      { key: "labels" as const, label: t("tabs.labels") },
    ],
    [t],
  );

  const formatDeletedMeta = useCallback(
    (item: TrashItem) => {
      const deletedAt = item.deletedAt
        ? formatter.dateTime(new Date(item.deletedAt), {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null;
      const deletedBy =
        item.deletedBy?.name?.trim() ||
        item.deletedByName?.trim() ||
        "";
      if (deletedBy && deletedAt) {
        return t("meta.deletedByAt", { name: deletedBy, date: deletedAt });
      }
      if (deletedBy) {
        return t("meta.deletedBy", { name: deletedBy });
      }
      if (deletedAt) {
        return t("meta.deletedAt", { date: deletedAt });
      }
      return "";
    },
    [formatter, t],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition",
              activeTab === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:bg-background",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{tTabs("trash", { default: "Trash" })}</h3>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => loadTab(activeTab)}
            disabled={isLoading}
          >
            <RefreshCcw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            {t("actions.reload")}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">{t("messages.loading")}</p>
          )}

          {!isLoading && activeTab === "projects" && (
            <TrashList
              items={projects as TrashItem[]}
              emptyLabel={t("empty.projects")}
              getMeta={formatDeletedMeta}
              restoreLabel={t("actions.restore")}
              restoringLabel={t("actions.restoring")}
              unnamedLabel={t("messages.unnamed")}
              onRestore={(id) => handleRestore("projects", id)}
              restoringId={restoringId}
            />
          )}

          {!isLoading && activeTab === "modules" && (
            <TrashList
              items={modules as TrashItem[]}
              emptyLabel={t("empty.modules")}
              getMeta={formatDeletedMeta}
              restoreLabel={t("actions.restore")}
              restoringLabel={t("actions.restoring")}
              unnamedLabel={t("messages.unnamed")}
              onRestore={(id) => handleRestore("modules", id)}
              restoringId={restoringId}
            />
          )}

          {!isLoading && activeTab === "features" && (
            <TrashList
              items={features as TrashItem[]}
              emptyLabel={t("empty.features")}
              getMeta={formatDeletedMeta}
              restoreLabel={t("actions.restore")}
              restoringLabel={t("actions.restoring")}
              unnamedLabel={t("messages.unnamed")}
              getDisabledReason={(item) =>
                item.moduleId && deletedModuleIds.has(item.moduleId)
                  ? t("badges.requiresModule")
                  : ""
              }
              onRestore={(id) => handleRestore("features", id)}
              restoringId={restoringId}
            />
          )}

          {!isLoading && activeTab === "labels" && (
            <TrashList
              items={labels as TrashItem[]}
              emptyLabel={t("empty.labels")}
              getMeta={formatDeletedMeta}
              restoreLabel={t("actions.restore")}
              restoringLabel={t("actions.restoring")}
              unnamedLabel={t("messages.unnamed")}
              onRestore={(id) => handleRestore("labels", id)}
              restoringId={restoringId}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function TrashList({
  items,
  emptyLabel,
  onRestore,
  restoringId,
  getMeta,
  restoreLabel,
  restoringLabel,
  unnamedLabel,
  getDisabledReason,
}: {
  items: TrashItem[];
  emptyLabel: string;
  onRestore: (id: string) => void;
  restoringId: string | null;
  getMeta: (item: TrashItem) => string;
  restoreLabel: string;
  restoringLabel: string;
  unnamedLabel: string;
  getDisabledReason?: (item: TrashItem) => string;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        (() => {
          const disabledReason = getDisabledReason?.(item) ?? "";
          const isDisabled = Boolean(disabledReason);
          return (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {item.name?.trim() || unnamedLabel}
            </p>
            {disabledReason ? (
              <p className="text-xs font-medium text-amber-600 truncate">
                {disabledReason}
              </p>
            ) : null}
            {getMeta(item) ? (
              <p className="text-xs text-muted-foreground truncate">{getMeta(item)}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => onRestore(item.id)}
            disabled={restoringId === item.id || isDisabled}
          >
            <Trash2 className="h-3 w-3" />
            {restoringId === item.id ? restoringLabel : restoreLabel}
          </button>
        </div>
          );
        })()
      ))}
    </div>
  );
}
