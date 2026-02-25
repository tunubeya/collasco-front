"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  type QaDocumentationEntry,
  type DocumentationImage,
  listDocumentationImages,
  listProjectDocumentationImagesAll,
  uploadDocumentationImage,
  deleteDocumentationImage,
  type UpdateQaDocumentationEntryDto,
  listFeatureDocumentation,
  listModuleDocumentation,
  listProjectDocumentation,
  listProjectDocumentationLabels,
  updateFeatureDocumentationEntry,
  updateModuleDocumentationEntry,
  updateProjectDocumentationEntry,
} from "@/lib/api/qa";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/ui/components/projects/RichTextEditor";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";
import { Switch } from "@/ui/components/form/switch";

type EntityDocumentationPanelProps = {
  token: string;
  entityId: string;
  entityType: "feature" | "module" | "project";
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
  const [showImages, setShowImages] = useState(false);
  const [imagesByLabel, setImagesByLabel] = useState<Record<string, DocumentationImage[]>>({});
  const [projectImagesMap, setProjectImagesMap] = useState<Record<string, string> | null>(null);
  const [imageNameByLabel, setImageNameByLabel] = useState<Record<string, string>>({});
  const [imageFileByLabel, setImageFileByLabel] = useState<Record<string, File | null>>({});
  const [imageLoadingLabelId, setImageLoadingLabelId] = useState<string | null>(null);
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
        : entityType === "module"
          ? listModuleDocumentation
          : listProjectDocumentation,
    [entityType],
  );

  const updater = useMemo(
    () =>
      entityType === "feature"
        ? updateFeatureDocumentationEntry
        : entityType === "module"
          ? updateModuleDocumentationEntry
          : updateProjectDocumentationEntry,
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

  const fetchImages = useCallback(
    async (labelId?: string) => {
      try {
        const items = await listDocumentationImages(token, entityType, entityId, labelId);
        setImagesByLabel((prev) => {
          const next = { ...prev };
          items.forEach((group) => {
            next[group.labelId] = group.images ?? [];
          });
          return next;
        });
      } catch (err) {
        toast.error(t("images.loadError"), {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [entityId, entityType, t, token],
  );

  useEffect(() => {
    if (!showImages) return;
    void fetchImages();
  }, [fetchImages, showImages]);

  const fetchProjectImagesMap = useCallback(async () => {
    if (entityType !== "project") return;
    try {
      const payload = await listProjectDocumentationImagesAll(token, projectId);
      const map: Record<string, string> = {};
      payload.items?.forEach((group) => {
        group.images.forEach((image) => {
          map[image.name] = image.url;
          map[image.name.toLowerCase()] = image.url;
        });
      });
      setProjectImagesMap(map);
    } catch (err) {
      console.warn("Failed to load project images map", err);
      setProjectImagesMap({});
    }
  }, [entityType, projectId, token]);

  useEffect(() => {
    if (!showImages) return;
    if (entityType !== "project") return;
    void fetchProjectImagesMap();
  }, [entityType, fetchProjectImagesMap, showImages]);

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

  const handleUploadImage = useCallback(
    async (labelId: string) => {
      const name = (imageNameByLabel[labelId] ?? "").trim();
      const file = imageFileByLabel[labelId];
      if (!name) {
        toast.error(t("images.validation.name"));
        return;
      }
      if (!file) {
        toast.error(t("images.validation.file"));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t("images.validation.fileTooLarge"));
        return;
      }
      setImageLoadingLabelId(labelId);
      try {
        await uploadDocumentationImage(token, entityType, entityId, labelId, name, file);
        toast.success(t("images.messages.uploaded"));
        setImageNameByLabel((prev) => ({ ...prev, [labelId]: "" }));
        setImageFileByLabel((prev) => ({ ...prev, [labelId]: null }));
        setShowImages(true);
        await fetchImages(labelId);
      } catch (err) {
        let description: string | undefined;
        let isDuplicate = false;
        if (err instanceof Response) {
          const contentType = err.headers.get("content-type") ?? "";
          let message = "";
          try {
            if (contentType.includes("application/json")) {
              const data = (await err.json()) as { message?: string; error?: string };
              message = data?.message ?? data?.error ?? "";
            } else {
              message = (await err.text()).trim();
            }
          } catch {
            message = "";
          }
          const normalized = message.toLowerCase();
          isDuplicate =
            err.status === 409 ||
            normalized.includes("already exists") ||
            normalized.includes("duplicate") ||
            normalized.includes("unique");
          description = message || undefined;
        } else if (err instanceof Error) {
          const normalized = err.message.toLowerCase();
          isDuplicate =
            normalized.includes("already exists") ||
            normalized.includes("duplicate") ||
            normalized.includes("unique");
          description = err.message;
        }

        if (isDuplicate) {
          toast.error(t("images.messages.duplicateName"));
        } else {
          toast.error(t("images.messages.uploadError"), { description });
        }
      } finally {
        setImageLoadingLabelId(null);
      }
    },
    [entityId, entityType, fetchImages, imageFileByLabel, imageNameByLabel, t, token],
  );

  const handleDeleteImage = useCallback(
    async (labelId: string, imageId: string) => {
      try {
        await deleteDocumentationImage(token, entityType, entityId, imageId);
        toast.success(t("images.messages.deleted"));
        await fetchImages(labelId);
      } catch (err) {
        toast.error(t("images.messages.deleteError"), {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [entityId, entityType, fetchImages, t, token],
  );

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Switch
          checked={showImages}
          onChange={(event) => setShowImages(event.target.checked)}
          label={t("images.toggle")}
        />
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
            const isCompactNotApplicable = isNotApplicable && !isEditing;
            const images = imagesByLabel[entry.label.id] ?? [];
            return (
              <article
                key={entry.label.id}
                className={cn(
                  "rounded-xl border px-4 shadow-sm transition-colors",
                  isCompactNotApplicable ? "py-2" : "py-3",
                  isNotApplicable
                    ? "border-gray-200 bg-gray-50 text-gray-400"
                    : "border-border bg-background",
                )}
              >
                {isCompactNotApplicable ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{entry.label.name}</p>
                    {entry.canEdit && (
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
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{entry.label.name}</p>
                          {entry.label.isMandatory && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {t("badges.mandatory")}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
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
                          {entry.canEdit && (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {t("images.title")}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {t("images.tagHint")}
                              </p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    {t("images.fields.name")}
                                  </label>
                                  <input
                                    type="text"
                                    value={imageNameByLabel[entry.label.id] ?? ""}
                                    onChange={(event) =>
                                      setImageNameByLabel((prev) => ({
                                        ...prev,
                                        [entry.label.id]: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder={t("images.placeholders.name")}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    {t("images.fields.file")}
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) =>
                                      setImageFileByLabel((prev) => ({
                                        ...prev,
                                        [entry.label.id]: event.target.files?.[0] ?? null,
                                      }))
                                    }
                                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  className={actionButtonClass({ size: "xs" })}
                                  onClick={() => void handleUploadImage(entry.label.id)}
                                  disabled={imageLoadingLabelId === entry.label.id}
                                >
                                  {imageLoadingLabelId === entry.label.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                  ) : (
                                    t("images.actions.upload")
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : entry.field?.isNotApplicable ? (
                        <p className="text-xs italic text-muted-foreground">
                          {t("states.notApplicable")}
                        </p>
                      ) : (
                        <RichTextPreview
                          value={entry.field?.content ?? ""}
                          emptyLabel={t("states.empty")}
                          className="text-muted-foreground"
                          imageMap={
                            showImages
                              ? entityType === "project"
                                ? projectImagesMap ?? undefined
                                : Object.fromEntries(
                                    (images ?? []).map((image) => [
                                      image.name,
                                      image.url,
                                    ]),
                                  )
                              : undefined
                          }
                        />
                      )}
                    </div>

                    {showImages && images.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {t("images.sectionTitle")}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {images.map((image) => (
                            <div
                              key={image.id}
                              className="overflow-hidden rounded-lg border bg-background"
                            >
                              <img
                                src={image.url}
                                alt={image.name}
                                className="h-32 w-full object-contain"
                                loading="lazy"
                              />
                              <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                                <span className="truncate font-medium">{image.name}</span>
                                {entry.canEdit && (
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => void handleDeleteImage(entry.label.id, image.id)}
                                  >
                                    {t("images.actions.delete")}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                  </>
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
