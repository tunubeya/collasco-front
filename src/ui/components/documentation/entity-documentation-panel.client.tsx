"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  type QaDocumentationEntry,
  type UpdateQaDocumentationEntryDto,
  listFeatureDocumentation,
  listModuleDocumentation,
  listProjectDocumentationLabels,
  updateFeatureDocumentationEntry,
  updateModuleDocumentationEntry,
} from "@/lib/api/qa";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/ui/components/projects/RichTextEditor";
import { RichTextContent } from "@/ui/components/rich-text-content";

type EntityDocumentationPanelProps = {
  token: string;
  entityId: string;
  entityType: "feature" | "module";
  projectId: string;
};

export function EntityDocumentationPanel({
  token,
  entityId,
  entityType,
  projectId,
}: EntityDocumentationPanelProps) {
  const t = useTranslations("app.projects.documentation");
  const tRichText = useTranslations("app.projects.form.richText");
  const formatter = useFormatter();
  const [entries, setEntries] = useState<QaDocumentationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [labelOptions, setLabelOptions] = useState<
    Awaited<ReturnType<typeof listProjectDocumentationLabels>>
  >([]);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string>("");
  const [savingLabelId, setSavingLabelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toolbarLabels = useMemo(
    () => ({
      bold: tRichText("bold"),
      italic: tRichText("italic"),
      underline: tRichText("underline"),
      bulletList: tRichText("bulletList"),
      orderedList: tRichText("orderedList"),
      clear: tRichText("clear"),
    }),
    [tRichText],
  );

  const fetcher = useMemo(
    () =>
      entityType === "feature"
        ? listFeatureDocumentation
        : listModuleDocumentation,
    [entityType],
  );

  const updater = useMemo(
    () =>
      entityType === "feature"
        ? updateFeatureDocumentationEntry
        : updateModuleDocumentationEntry,
    [entityType],
  );

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetcher(token, entityId);
      setEntries(data);
    } catch (err) {
      toast.error(t("messages.loadError"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [entityId, fetcher, t, token]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const fetchLabelOptions = useCallback(async () => {
    try {
      const data = await listProjectDocumentationLabels(token, projectId);
      setLabelOptions(data);
    } catch (err) {
      toast.error(t("messages.loadError"), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void fetchLabelOptions();
  }, [fetchLabelOptions]);

  const displayEntries = useMemo(() => {
    if (!labelOptions.length) return entries;
    const entryMap = new Map(entries.map((entry) => [entry.label.id, entry]));
    const ordered = labelOptions.map((option) => {
      const existing = entryMap.get(option.id);
      if (existing) {
        if (existing.label.isMandatory !== option.isMandatory) {
          return {
            ...existing,
            label: {
              ...existing.label,
              isMandatory: option.isMandatory,
            },
          };
        }
        return existing;
      }
      return {
        label: {
          id: option.id,
          name: option.name,
          isMandatory: option.isMandatory,
          visibleToRoles: [],
          readOnlyRoles: [],
        },
        field: null,
        canEdit: true,
      } satisfies QaDocumentationEntry;
    });
    const applicable: QaDocumentationEntry[] = [];
    const notApplicable: QaDocumentationEntry[] = [];
    ordered.forEach((entry) => {
      if (entry.field?.isNotApplicable) {
        notApplicable.push(entry);
      } else {
        applicable.push(entry);
      }
    });
    return [...applicable, ...notApplicable];
  }, [entries, labelOptions]);

  const handleEdit = useCallback((entry: QaDocumentationEntry) => {
    setEditingLabelId(entry.label.id);
    setDraftContent(entry.field?.content ?? "");
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    setEditingLabelId(null);
    setDraftContent("");
    setSavingLabelId(null);
    setError(null);
  }, []);

  const handleSave = useCallback(
    async (labelId: string) => {
      if (!draftContent.trim()) {
        setError(t("validation.content"));
        return;
      }
      setError(null);
      setSavingLabelId(labelId);
      try {
        const payload: UpdateQaDocumentationEntryDto = {
          content: draftContent,
        };
        const updated = await updater(token, entityId, labelId, payload);
        setEntries(updated);
        toast.success(t("messages.saved"));
        handleCancel();
      } catch (err) {
        toast.error(t("messages.saveError"), {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setSavingLabelId(null);
      }
    },
    [draftContent, entityId, handleCancel, t, token, updater],
  );

  const handleMarkNotApplicable = useCallback(
    async (labelId: string) => {
      setSavingLabelId(labelId);
      try {
        const updated = await updater(token, entityId, labelId, {
          isNotApplicable: true,
        });
        setEntries(updated);
        setEditingLabelId(null);
        toast.success(t("messages.saved"));
      } catch (err) {
        toast.error(t("messages.saveError"), {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setSavingLabelId(null);
      }
    },
    [entityId, t, token, updater],
  );

  const handleMarkApplicable = useCallback(
    async (labelId: string) => {
      setSavingLabelId(labelId);
      try {
        const updated = await updater(token, entityId, labelId, {
          isNotApplicable: false,
        });
        setEntries(updated);
        toast.success(t("messages.saved"));
      } catch (err) {
        toast.error(t("messages.saveError"), {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setSavingLabelId(null);
      }
    },
    [entityId, t, token, updater],
  );

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4">
      <div>
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <DocumentationSkeleton />
      ) : displayEntries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {displayEntries.map((entry) => {
            const lastUpdated = entry.field?.updatedAt
              ? formatter.dateTime(new Date(entry.field.updatedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : null;
            const isEditing = editingLabelId === entry.label.id;
            const isSaving = savingLabelId === entry.label.id;
            const isNotApplicable = Boolean(entry.field?.isNotApplicable);
            return (
              <article
                key={entry.label.id}
                className={cn(
                  "rounded-xl border px-4 py-3 shadow-sm transition-colors",
                  isNotApplicable
                    ? "border-muted-foreground/20 bg-muted/60 text-muted-foreground"
                    : "border-border bg-background",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{entry.label.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {entry.label.isMandatory && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                          {t("badges.mandatory")}
                        </span>
                      )}
                      {!entry.canEdit && (
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                          {t("badges.readOnly")}
                        </span>
                      )}
                      {isNotApplicable && (
                        <span className="rounded-full bg-muted/80 px-2 py-0.5 font-medium text-muted-foreground">
                          {t("badges.notApplicable")}
                        </span>
                      )}
                    </div>
                  </div>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      {t("labels.updatedAt", { date: lastUpdated })}
                    </p>
                  )}
                </div>

                <div className="mt-3 text-sm">
                  {isEditing ? (
                    <div className="space-y-4">
                      <RichTextEditor
                        name={`documentation-${entry.label.id}`}
                        label={t("fields.editorLabel")}
                        placeholder={t("fields.editorPlaceholder")}
                        defaultValue={entry.field?.content ?? ""}
                        helperText={t("fields.editorHelper")}
                        labels={toolbarLabels}
                        onValueChange={setDraftContent}
                        hideLabel
                      />
                      {error && (
                        <p className="text-sm text-red-600">{error}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={actionButtonClass({ variant: "neutral", size: "xs" })}
                          onClick={handleCancel}
                          disabled={isSaving}
                        >
                          {t("actions.cancel")}
                        </button>
                        <button
                          type="button"
                          className={actionButtonClass({
                            variant: "primary",
                            size: "xs",
                          })}
                          onClick={() => void handleSave(entry.label.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            t("actions.save")
                          )}
                        </button>
                      </div>
                    </div>
                  ) : entry.field?.isNotApplicable ? (
                    <p className="text-xs italic text-muted-foreground">
                      {t("states.notApplicable")}
                    </p>
                  ) : entry.field?.content ? (
                    <RichTextContent
                      content={entry.field.content}
                      className="prose prose-sm max-w-none text-muted-foreground"
                    />
                  ) : (
                    <p className="text-muted-foreground">{t("states.empty")}</p>
                  )}
                </div>

                {entry.canEdit && entry.field?.isNotApplicable && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={actionButtonClass({ size: "xs" })}
                      onClick={() => void handleMarkApplicable(entry.label.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        t("actions.markApplicable")
                      )}
                    </button>
                  </div>
                )}

                {entry.canEdit && !entry.field?.isNotApplicable && !isEditing && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={actionButtonClass({ size: "xs" })}
                      onClick={() => handleEdit(entry)}
                    >
                      {t("actions.edit")}
                    </button>
                    <button
                      type="button"
                      className={actionButtonClass({
                        variant: "neutral",
                        size: "xs",
                      })}
                      onClick={() => void handleMarkNotApplicable(entry.label.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        t("actions.markNotApplicable")
                      )}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DocumentationSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
