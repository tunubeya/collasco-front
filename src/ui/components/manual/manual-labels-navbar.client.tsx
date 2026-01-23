"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  getDocumentationLabelPreferences,
  listProjectDocumentationLabels,
  updateDocumentationLabelPreferences,
  type ProjectDocumentationLabelOption,
} from "@/lib/api/qa";
import { MANUAL_LABELS_EVENT } from "@/ui/components/manual/manual-events";

type ManualLabelsNavbarProps = {
  token: string;
  projectId: string;
};

export function ManualLabelsNavbar({
  token,
  projectId,
}: ManualLabelsNavbarProps) {
  const t = useTranslations("app.projects.manual.labelsNavbar");
  const [labels, setLabels] = useState<ProjectDocumentationLabelOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const notifyManualRefresh = useCallback(
    (selected: string[]) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(MANUAL_LABELS_EVENT, {
          detail: { projectId, selectedLabelIds: selected },
        }),
      );
    },
    [projectId],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const preferences = await getDocumentationLabelPreferences(token, projectId);
      let options = preferences.availableLabels;
      if (!options || options.length === 0) {
        options = await listProjectDocumentationLabels(token, projectId);
      }
      setLabels(options ?? []);
      const selected = preferences?.selectedLabelIds ?? [];
      setSelectedIds(selected);
      notifyManualRefresh(selected);
    } catch (error) {
      toast.error(t("messages.loadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const orderedLabels = useMemo(
    () => [...labels].sort((a, b) => a.displayOrder - b.displayOrder),
    [labels],
  );
  const allLabelIds = useMemo(() => labels.map((label) => label.id), [labels]);
  const isAllSelected = useMemo(
    () =>
      allLabelIds.length > 0 &&
      allLabelIds.every((labelId) => selectedIds.includes(labelId)),
    [allLabelIds, selectedIds],
  );
  const isNoneSelected = selectedIds.length === 0;

  const applySelection = useCallback(
    async (nextIds: string[], savingKey: string) => {
      if (savingId) return;
      const previous = selectedIds;
      const nextSet = new Set(nextIds);
      const isSame =
        previous.length === nextIds.length &&
        previous.every((id) => nextSet.has(id));
      if (isSame) return;

      setSelectedIds(nextIds);
      setSavingId(savingKey);

      try {
        const updated = await updateDocumentationLabelPreferences(
          token,
          projectId,
          nextIds,
        );
        if (updated?.availableLabels) {
          setLabels(updated.availableLabels);
        }
        const resolved = updated?.selectedLabelIds ?? nextIds;
        setSelectedIds(resolved);
        notifyManualRefresh(resolved);
        toast.success(t("messages.saved"));
      } catch (error) {
        setSelectedIds(previous);
        toast.error(t("messages.saveError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setSavingId(null);
      }
    },
    [notifyManualRefresh, projectId, savingId, selectedIds, t, token],
  );

  const handleToggle = useCallback(
    async (labelId: string) => {
      const previous = selectedIds;
      const next = previous.includes(labelId)
        ? previous.filter((id) => id !== labelId)
        : [...previous, labelId];
      void applySelection(next, labelId);
    },
    [applySelection, selectedIds],
  );

  const handleSelectAll = useCallback(() => {
    void applySelection(allLabelIds, "bulk");
  }, [allLabelIds, applySelection]);

  const handleSelectNone = useCallback(() => {
    void applySelection([], "bulk");
  }, [applySelection]);

  return (
    <section className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
            onClick={handleSelectAll}
            disabled={isLoading || Boolean(savingId) || isAllSelected}
          >
            {t("actions.selectAll")}
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
            onClick={handleSelectNone}
            disabled={isLoading || Boolean(savingId) || isNoneSelected}
          >
            {t("actions.selectNone")}
          </button>
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{t("loading")}</span>
          </div>
        ) : orderedLabels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {orderedLabels.map((label) => {
              const isSelected = selectedIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    isSelected
                      ? "border-primary bg-primary/90 text-primary-foreground shadow-sm"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-background",
                    savingId === label.id && "opacity-70",
                  )}
                  onClick={() => void handleToggle(label.id)}
                  disabled={Boolean(savingId)}
                  aria-pressed={isSelected}
                >
                  <span>{label.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
