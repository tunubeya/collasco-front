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
  updateDocumentationImageName,
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
import { Check, Info, Loader2, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/ui/components/projects/RichTextEditor";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";
import { Switch } from "@/ui/components/form/switch";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/popover/popover";

type EntityDocumentationPanelProps = {
  token: string;
  entityId: string;
  entityType: "feature" | "module" | "project";
  projectId: string;
  entityName?: string | null;
};

export function EntityDocumentationPanel({
  token,
  entityId,
  entityType,
  projectId,
  entityName,
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
  const [projectImagesMap, setProjectImagesMap] = useState<
    Record<string, string | { url: string; mimeType?: string | null }> | null
  >(null);
  const [imageNameByLabel, setImageNameByLabel] = useState<Record<string, string>>({});
  const [imageFileByLabel, setImageFileByLabel] = useState<Record<string, File | null>>({});
  const [showAttachmentFormByLabel, setShowAttachmentFormByLabel] = useState<Record<string, boolean>>({});
  const [imageLoadingLabelId, setImageLoadingLabelId] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageDraftNameById, setImageDraftNameById] = useState<Record<string, string>>({});
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
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

  const totalImagesCount = useMemo(
    () =>
      Object.values(imagesByLabel).reduce(
        (total, list) => total + (list?.length ?? 0),
        0
      ),
    [imagesByLabel]
  );

  const buildDefaultAttachmentName = useCallback(() => {
    const baseRaw = (entityName ?? entityType).trim() || entityType;
    const base = baseRaw
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || entityType;
    const index = totalImagesCount + 1;
    return `${base}-${index}`;
  }, [entityName, entityType, totalImagesCount]);

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
          if (labelId) {
            next[labelId] = [];
          }
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
    void fetchImages();
  }, [fetchImages]);

  const fetchProjectImagesMap = useCallback(async () => {
    try {
      const payload = await listProjectDocumentationImagesAll(token, projectId);
      const map: Record<string, string | { url: string; mimeType?: string | null }> = {};
      payload.items?.forEach((group) => {
        group.images.forEach((image) => {
          const entry = { url: image.url, mimeType: image.mimeType };
          map[image.name] = entry;
          map[image.name.toLowerCase()] = entry;
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
          visibleRoleIds: [],
          readOnlyRoleIds: [],
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
      let name = (imageNameByLabel[labelId] ?? "").trim();
      const file = imageFileByLabel[labelId];
      if (!name) {
        name = buildDefaultAttachmentName();
        setImageNameByLabel((prev) => ({ ...prev, [labelId]: name }));
      }
      if (!file) {
        toast.error(t("attachments.validation.file"));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t("attachments.validation.fileTooLarge"));
        return;
      }
      setImageLoadingLabelId(labelId);
      try {
        await uploadDocumentationImage(token, entityType, entityId, labelId, name, file);
        toast.success(t("attachments.messages.uploaded"));
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
          toast.error(t("attachments.messages.duplicateName"));
        } else {
          toast.error(t("attachments.messages.uploadError"), { description });
        }
      } finally {
        setImageLoadingLabelId(null);
      }
    },
    [
      buildDefaultAttachmentName,
      entityId,
      entityType,
      fetchImages,
      imageFileByLabel,
      imageNameByLabel,
      t,
      token,
    ],
  );

  const handleDeleteImage = useCallback(
    async (labelId: string, imageId: string) => {
      try {
        setImagesByLabel((prev) => ({
          ...prev,
          [labelId]: (prev[labelId] ?? []).filter((image) => image.id !== imageId),
        }));
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

  const handleStartEditImage = useCallback((image: DocumentationImage) => {
    setEditingImageId(image.id);
    setImageDraftNameById((prev) => ({
      ...prev,
      [image.id]: image.name,
    }));
  }, []);

  const handleCancelEditImage = useCallback(() => {
    setEditingImageId(null);
    setSavingImageId(null);
  }, []);

  const handleSaveImageName = useCallback(
    async (labelId: string, imageId: string) => {
      const name = (imageDraftNameById[imageId] ?? "").trim();
      if (!name) {
        toast.error(t("images.validation.name"));
        return;
      }
      setSavingImageId(imageId);
      try {
        await updateDocumentationImageName(token, entityType, entityId, imageId, { name });
        toast.success(t("images.messages.renamed"));
        setEditingImageId(null);
        await fetchImages(labelId);
        if (showImages) {
          await fetchProjectImagesMap();
        }
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
          toast.error(t("images.messages.renameError"), { description });
        }
      } finally {
        setSavingImageId(null);
      }
    },
    [
      entityId,
      entityType,
      fetchImages,
      fetchProjectImagesMap,
      imageDraftNameById,
      showImages,
      t,
      token,
    ],
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{entry.label.name}</p>
                      {entry.label.instructions && (
                        <span className="group relative inline-flex items-center">
                          <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-md border bg-background p-2 text-[11px] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 whitespace-pre-wrap">
                            {entry.label.instructions}
                          </span>
                        </span>
                      )}
                    </div>
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
                          {entry.label.instructions && (
                            <span className="group relative inline-flex items-center">
                              <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-md border bg-background p-2 text-[11px] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 whitespace-pre-wrap">
                                {entry.label.instructions}
                              </span>
                            </span>
                          )}
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
                      ) : (
                        <RichTextPreview
                          value={entry.field?.content ?? ""}
                          emptyLabel={t("states.empty")}
                          className="text-muted-foreground"
                          imageMap={
                            showImages
                              ? projectImagesMap ??
                                Object.fromEntries(
                                  (images ?? []).map((image) => [
                                    image.name,
                                    { url: image.url, mimeType: image.mimeType },
                                  ]),
                                )
                              : undefined
                          }
                          fileOpenLabel={t("files.actions.open")}
                        />
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t("attachments.sectionTitle")}
                      </p>
                      {images.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t("attachments.empty")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {images.map((image) => {
                            const isEditingImage = editingImageId === image.id;
                            return (
                              <div
                                key={image.id}
                                className="flex items-center justify-between gap-2 rounded-md border bg-muted/10 px-3 py-2 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  {isEditingImage ? (
                                    <input
                                      type="text"
                                      value={imageDraftNameById[image.id] ?? ""}
                                      onChange={(event) =>
                                        setImageDraftNameById((prev) => ({
                                          ...prev,
                                          [image.id]: event.target.value,
                                        }))
                                      }
                                      className="w-full rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                      placeholder={t("images.placeholders.name")}
                                    />
                                  ) : (
                                    <span className="truncate font-medium">{image.name}</span>
                                  )}
                                </div>
                                {entry.canEdit && (
                                  <div className="flex items-center gap-2">
                                    {isEditingImage ? (
                                      <>
                                        <button
                                          type="button"
                                          className="rounded-md p-1 text-muted-foreground hover:text-primary"
                                          onClick={() => void handleSaveImageName(entry.label.id, image.id)}
                                          disabled={savingImageId === image.id}
                                          aria-label={t("images.actions.saveName")}
                                        >
                                          {savingImageId === image.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                          ) : (
                                            <Check className="h-4 w-4" aria-hidden />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                                          onClick={handleCancelEditImage}
                                          aria-label={t("images.actions.cancelEdit")}
                                        >
                                          <X className="h-4 w-4" aria-hidden />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                                          onClick={() => handleStartEditImage(image)}
                                          aria-label={t("images.actions.editName")}
                                        >
                                          <Pencil className="h-4 w-4" aria-hidden />
                                        </button>
                                        <Popover placement="bottom-end">
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                                              aria-label={t("images.actions.delete")}
                                            >
                                              <Trash2 className="h-4 w-4" aria-hidden />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="z-50 w-56 rounded-md border bg-background p-3 text-xs shadow-md">
                                            <p className="font-semibold">
                                              {t("images.confirm.title")}
                                            </p>
                                            <p className="mt-1 text-muted-foreground">
                                              {t("images.confirm.description")}
                                            </p>
                                            <div className="mt-3 flex justify-end gap-2">
                                              <PopoverClose className="rounded-md border px-2 py-1 text-xs">
                                                {t("images.actions.cancelDelete")}
                                              </PopoverClose>
                                              <PopoverClose
                                                className="rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground"
                                                onClick={() => void handleDeleteImage(entry.label.id, image.id)}
                                              >
                                                {t("images.actions.confirmDelete")}
                                              </PopoverClose>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {entry.canEdit && (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className={actionButtonClass({ size: "xs" })}
                            onClick={() => {
                              setShowAttachmentFormByLabel((prev) => {
                                const nextOpen = !prev[entry.label.id];
                                if (nextOpen) {
                                  const current =
                                    (imageNameByLabel[entry.label.id] ?? "").trim();
                                  if (!current) {
                                  const nextName = buildDefaultAttachmentName();
                                    setImageNameByLabel((names) => ({
                                      ...names,
                                      [entry.label.id]: nextName,
                                    }));
                                  }
                                }
                                return { ...prev, [entry.label.id]: nextOpen };
                              });
                            }}
                          >
                            + {t("attachments.actions.add", { default: "Add attachment" })}
                          </button>
                        </div>
                        {showAttachmentFormByLabel[entry.label.id] ? (
                          <div className="rounded-md border border-dashed border-border/80 bg-muted/10 p-2">
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              {t("attachments.title")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t("attachments.hint")}
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[11px] font-medium text-muted-foreground">
                                  {t("attachments.fields.name")}
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
                                  className="w-full rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder={t("attachments.placeholders.name")}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-medium text-muted-foreground">
                                  {t("attachments.fields.file")}
                                </label>
                                <input
                                  type="file"
                                  accept="*/*"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    setImageFileByLabel((prev) => ({
                                      ...prev,
                                      [entry.label.id]: file,
                                    }));
                                    const currentName =
                                      (imageNameByLabel[entry.label.id] ?? "").trim();
                                    if (file && !currentName) {
                                        const nextName = buildDefaultAttachmentName();
                                        setImageNameByLabel((prev) => ({
                                          ...prev,
                                          [entry.label.id]: nextName,
                                        }));
                                    }
                                  }}
                                  className="w-full rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                className={actionButtonClass({ size: "xs" })}
                                onClick={() => void handleUploadImage(entry.label.id)}
                                disabled={imageLoadingLabelId === entry.label.id}
                              >
                                {imageLoadingLabelId === entry.label.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  t("attachments.actions.upload")
                                )}
                              </button>
                            </div>
                          </div>
                        ) : null}
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
