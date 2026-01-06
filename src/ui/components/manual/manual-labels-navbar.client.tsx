"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  getDocumentationLabelPreferences,
  listProjectDocumentationLabels,
  updateDocumentationLabelPreferences,
  type ProjectDocumentationLabelOption,
} from "@/lib/api/qa";

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const preferences = await getDocumentationLabelPreferences(token, projectId);
      let options = preferences.availableLabels;
      if (!options || options.length === 0) {
        options = await listProjectDocumentationLabels(token, projectId);
      }
      setLabels(options ?? []);
      setSelectedIds(preferences?.selectedLabelIds ?? []);
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
  const selectedLabels = useMemo(
    () => orderedLabels.filter((label) => selectedIds.includes(label.id)),
    [orderedLabels, selectedIds],
  );
  const availableLabels = useMemo(
    () => orderedLabels.filter((label) => !selectedIds.includes(label.id)),
    [orderedLabels, selectedIds],
  );

  const handleToggle = useCallback(
    async (labelId: string) => {
      if (savingId) return;
      const previous = selectedIds;
      const next = previous.includes(labelId)
        ? previous.filter((id) => id !== labelId)
        : [...previous, labelId];

      setSelectedIds(next);
      setSavingId(labelId);

      try {
        const updated = await updateDocumentationLabelPreferences(
          token,
          projectId,
          next,
        );
        if (updated?.availableLabels) {
          setLabels(updated.availableLabels);
        }
        setSelectedIds(updated?.selectedLabelIds ?? next);
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
    [projectId, savingId, selectedIds, t, token],
  );

  return (
    <section className="rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">{t("title")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t("loading")}</span>
        </div>
      ) : orderedLabels.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t("sections.selected")}
            </p>
            {selectedLabels.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("selectedEmpty")}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
              {selectedLabels.map((label) => (
                <button
                  key={label.id}
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      "border-primary bg-primary/90 text-primary-foreground shadow-sm",
                      savingId === label.id && "opacity-70",
                    )}
                    onClick={() => void handleToggle(label.id)}
                    disabled={Boolean(savingId)}
                    aria-pressed={true}
                >
                  <span>{label.name}</span>
                  {label.isMandatory && (
                    <span className="ml-2 rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      {t("mandatory")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t("sections.available")}
            </p>
            {availableLabels.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("availableEmpty")}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      "border-border bg-muted/30 text-muted-foreground hover:bg-background",
                      savingId === label.id && "opacity-70",
                    )}
                    onClick={() => void handleToggle(label.id)}
                    disabled={Boolean(savingId)}
                    aria-pressed={false}
                  >
                    <span>{label.name}</span>
                    {label.isMandatory && (
                      <span className="ml-2 rounded-full border border-dashed border-muted-foreground/50 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {t("mandatory")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
