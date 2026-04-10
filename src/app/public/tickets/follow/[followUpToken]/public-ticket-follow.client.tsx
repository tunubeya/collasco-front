"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Loader2,
  ChevronDown,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  FileAudio,
  File,
} from "lucide-react";
import { toast } from "sonner";

import type { TicketImage, TicketSectionType } from "@/lib/model-definitions/ticket";
import {
  addPublicTicketSection,
  fetchPublicTicketFollow,
  PublicTicketError,
  updatePublicTicketSection,
  uploadPublicTicketImage,
  type PublicTicketFollowResponse,
} from "@/lib/api/public-tickets";
import { cn } from "@/lib/utils";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";
import { Switch } from "@/ui/components/form/switch";
import { RichTextEditor } from "@/ui/components/projects/RichTextEditor";

type Props = {
  followUpToken: string;
};

const SECTION_TYPES: TicketSectionType[] = ["RESPONSE", "COMMENT"];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function resolveFileIcon(mimeType?: string) {
  const type = (mimeType ?? "").toLowerCase();
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("audio/")) return FileAudio;
  if (type.startsWith("video/")) return FileVideo;
  if (type.includes("pdf")) return FileText;
  if (type.includes("word")) return FileType2;
  if (type.includes("sheet") || type.includes("excel")) return FileSpreadsheet;
  if (type.includes("presentation") || type.includes("powerpoint")) return FileText;
  if (type.includes("zip") || type.includes("compressed")) return FileArchive;
  if (type.includes("json") || type.includes("xml")) return FileCode;
  if (type.includes("text")) return FileText;
  return File;
}

export function PublicTicketFollowClient({ followUpToken }: Props) {
  const t = useTranslations("app.tickets.public");
  const tDetail = useTranslations("app.tickets.detail");
  const tRichText = useTranslations("app.projects.form.richText");
  const format = useFormatter();
  const [data, setData] = useState<PublicTicketFollowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionType, setSectionType] = useState<TicketSectionType>("RESPONSE");
  const [sectionContent, setSectionContent] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingSeed, setEditingSeed] = useState("");
  const [editingEditorKey, setEditingEditorKey] = useState(0);
  const [editingSaving, setEditingSaving] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [showImageForm, setShowImageForm] = useState(false);
  const [showImages, setShowImages] = useState(true);
  const [activityOrder, setActivityOrder] = useState<"recent" | "oldest">("recent");
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchPublicTicketFollow(followUpToken);
      setData(payload);
    } catch (err) {
      if (err instanceof PublicTicketError) {
        if (err.status === 404) {
          setError(t("follow.notFound"));
          return;
        }
        if (err.status === 410) {
          setError(err.message || t("follow.revoked"));
          return;
        }
      }
      setError(t("follow.error"));
    } finally {
      setLoading(false);
    }
  }, [followUpToken, t]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const ticket = data?.ticket;
  const sections = useMemo(() => {
    const list = data?.sections ?? ticket?.sections ?? [];
    return [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return activityOrder === "recent" ? bTime - aTime : aTime - bTime;
    });
  }, [activityOrder, data?.sections, ticket?.sections]);

  const images = useMemo<TicketImage[]>(() => data?.images ?? [], [data?.images]);

  const imageAttachments = useMemo(
    () => images.filter((image) => image.mimeType?.startsWith("image/")),
    [images]
  );
  const fileAttachments = useMemo(
    () => images.filter((image) => !image.mimeType?.startsWith("image/")),
    [images]
  );
  const orderedAttachments = useMemo(() => {
    const combined = [
      ...imageAttachments.map((image) => ({ kind: "image" as const, item: image })),
      ...fileAttachments.map((file) => ({ kind: "file" as const, item: file })),
    ];
    return combined.sort((a, b) => {
      const aTime = new Date(a.item.createdAt).getTime();
      const bTime = new Date(b.item.createdAt).getTime();
      return aTime - bTime;
    });
  }, [fileAttachments, imageAttachments]);

  const imageMap = useMemo(() => {
    const map: Record<string, { url: string; mimeType?: string | null }> = {};
    images.forEach((image) => {
      map[image.name] = { url: image.url, mimeType: image.mimeType };
    });
    return map;
  }, [images]);

  const richTextLabels = useMemo(
    () => ({
      bold: tRichText("bold"),
      italic: tRichText("italic"),
      underline: tRichText("underline"),
      bulletList: tRichText("bulletList"),
      orderedList: tRichText("orderedList"),
      clear: tRichText("clear"),
    }),
    [tRichText]
  );

  const buildDefaultAttachmentName = useCallback(() => {
    const baseRaw = (ticket?.title || "Ticket").trim();
    const base =
      baseRaw
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "Ticket";
    return `${base}-${images.length + 1}`;
  }, [images.length, ticket?.title]);

  useEffect(() => {
    if (showImageForm && !imageName.trim()) {
      setImageName(buildDefaultAttachmentName());
    }
  }, [buildDefaultAttachmentName, imageName, showImageForm]);

  const handleAddSection = useCallback(async () => {
    if (sectionSaving) return;
    if (!sectionContent.trim()) {
      toast.error(t("follow.missing"));
      return;
    }
    setSectionSaving(true);
    try {
      await addPublicTicketSection(followUpToken, {
        type: sectionType,
        content: sectionContent.trim(),
      });
      setSectionContent("");
      toast.success(t("follow.sectionAdded"));
      await loadTicket();
    } catch (err) {
      console.error("Failed to add public section", err);
      toast.error(t("follow.sectionError"));
    } finally {
      setSectionSaving(false);
    }
  }, [followUpToken, loadTicket, sectionContent, sectionSaving, sectionType, t]);

  const handleUpload = useCallback(async () => {
    if (uploadingAttachment || !imageFile || !imageName.trim()) return;
    if (imageFile.size > MAX_ATTACHMENT_BYTES) {
      toast.error(t("follow.imageTooLarge"));
      return;
    }
    setUploadingAttachment(true);
    try {
      await uploadPublicTicketImage(followUpToken, {
        file: imageFile,
        name: imageName.trim(),
      });
      setImageFile(null);
      setImageName("");
      setShowImageForm(false);
      toast.success(t("follow.imageUploaded"));
      await loadTicket();
    } catch (err) {
      console.error("Failed to upload public image", err);
      toast.error(t("follow.imageError"));
    } finally {
      setUploadingAttachment(false);
    }
  }, [followUpToken, imageFile, imageName, loadTicket, t, uploadingAttachment]);

  const handleEditSection = useCallback((section: { id: string; content: string }) => {
    setEditingSectionId(section.id);
    setEditingSeed(section.content ?? "");
    setEditingContent(section.content ?? "");
    setEditingEditorKey((prev) => prev + 1);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSectionId(null);
    setEditingContent("");
    setEditingSeed("");
  }, []);

  const handleSaveSection = useCallback(async () => {
    if (!editingSectionId || editingSaving) return;
    if (!editingContent.trim()) {
      toast.error(tDetail("messages.descriptionRequired"));
      return;
    }
    setEditingSaving(true);
    try {
      await updatePublicTicketSection(followUpToken, editingSectionId, {
        content: editingContent.trim(),
      });
      toast.success(tDetail("messages.sectionUpdated"));
      setEditingSectionId(null);
      setEditingContent("");
      setEditingSeed("");
      await loadTicket();
    } catch (err) {
      console.error("Failed to update public section", err);
      toast.error(tDetail("messages.sectionUpdateError"));
    } finally {
      setEditingSaving(false);
    }
  }, [
    editingContent,
    editingSaving,
    editingSectionId,
    followUpToken,
    loadTicket,
    tDetail,
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("follow.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("follow.subtitle")}</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t("follow.loading")}</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-background p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                {ticket?.title ?? t("follow.ticketFallback")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("follow.projectLabel", {
                  name: data?.projectName ?? ticket?.project?.name ?? t("follow.projectFallback"),
                })}
              </p>
              {ticket?.createdAt ? (
                <p className="text-xs text-muted-foreground">
                  {t("follow.createdAt", {
                    date: format.dateTime(new Date(ticket.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </p>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{t("follow.activity")}</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={activityOrder}
                    onChange={(event) =>
                      setActivityOrder(event.target.value as "recent" | "oldest")
                    }
                    className="rounded-md border px-3 py-1.5 pr-8 text-sm"
                  >
                    <option value="recent">{tDetail("activitySort.recent")}</option>
                    <option value="oldest">{tDetail("activitySort.oldest")}</option>
                  </select>
                  <Switch
                    checked={showImages}
                    onChange={(event) => setShowImages(event.target.checked)}
                    label={tDetail("images.toggle")}
                  />
                </div>
              </div>
              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("follow.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold">
                            {tDetail(`sectionTypes.${section.type}`, {
                              default: section.type,
                            })}
                          </span>
                          <span>
                            {format.dateTime(new Date(section.createdAt), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                          <span>·</span>
                          <span className="truncate">
                            {section.author?.name || t("follow.externalAuthor")}
                          </span>
                        </div>
                        {!section.lockedAt &&
                        !section.lockedById &&
                        editingSectionId !== section.id ? (
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-[10px] hover:bg-muted"
                            onClick={() => handleEditSection(section)}
                          >
                            {tDetail("actions.edit")}
                          </button>
                        ) : null}
                      </div>
                      {editingSectionId === section.id ? (
                        <div className="mt-2 space-y-2">
                          <RichTextEditor
                            key={`public-section-${editingEditorKey}`}
                            name={`public-section-${section.id}`}
                            label={tDetail("fields.content")}
                            placeholder={tDetail("placeholders.content")}
                            defaultValue={editingSeed}
                            labels={richTextLabels}
                            onValueChange={setEditingContent}
                            hideLabel
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="rounded border px-2 py-1 text-xs hover:bg-muted"
                              onClick={handleCancelEdit}
                              disabled={editingSaving}
                            >
                              {tDetail("actions.cancel")}
                            </button>
                            <button
                              type="button"
                              className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-70"
                              onClick={() => void handleSaveSection()}
                              disabled={editingSaving || !editingContent.trim()}
                            >
                              {editingSaving
                                ? tDetail("actions.saving")
                                : tDetail("actions.save")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <RichTextPreview
                          value={section.content}
                          emptyLabel={t("follow.emptyContent")}
                          className="mt-2"
                          imageMap={showImages ? imageMap : null}
                          fileOpenLabel={tDetail("files.actions.open")}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

          <section className="rounded-2xl border bg-background p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold">{t("follow.addResponse")}</h3>

            <div className="grid gap-4">
              <label className="space-y-2 text-sm">
                <span className="font-medium">{t("follow.fields.type")}</span>
                <select
                  value={sectionType}
                  onChange={(event) => setSectionType(event.target.value as TicketSectionType)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {tDetail(`sectionTypes.${type}`, { default: type })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">{t("follow.fields.content")}</span>
                <textarea
                  value={sectionContent}
                  onChange={(event) => setSectionContent(event.target.value)}
                  rows={4}
                  placeholder={t("follow.placeholders.content")}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <p className="text-[10px] text-muted-foreground">
                {tDetail("images.hint")}
              </p>

            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium",
                  sectionSaving
                    ? "cursor-not-allowed opacity-70"
                    : "hover:bg-muted"
                )}
                onClick={() => void handleAddSection()}
                disabled={sectionSaving}
              >
                {sectionSaving ? t("follow.saving") : t("follow.submit")}
              </button>
            </div>
          </section>

          <section className="rounded-xl border bg-background p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{tDetail("attachments.title")}</h2>
                <span className="text-xs text-muted-foreground">
                  {tDetail("attachments.hint")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachmentsOpen((prev) => !prev)}
                className="rounded-full border p-1 text-muted-foreground hover:text-foreground"
                aria-expanded={attachmentsOpen}
                aria-label={attachmentsOpen ? tDetail("actions.collapse") : tDetail("actions.expand")}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    attachmentsOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </button>
            </div>

            {attachmentsOpen ? (
              <>
                {images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {tDetail("images.empty")}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {orderedAttachments.map(({ kind, item }) => {
                      if (kind === "image") {
                        return (
                          <li key={item.id} className="group rounded-lg border p-2">
                            <div className="aspect-square w-full overflow-hidden rounded-md border bg-muted/20">
                              <img
                                src={item.url}
                                alt={item.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="mt-2 space-y-1">
                              <p className="truncate text-xs font-semibold">
                                {item.name} ({formatBytes(item.size)})
                              </p>
                              <div className="flex flex-wrap items-center gap-1">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted"
                                >
                                  {tDetail("files.actions.open")}
                                </a>
                              </div>
                            </div>
                          </li>
                        );
                      }

                      const Icon = resolveFileIcon(item.mimeType);
                      return (
                        <li key={item.id} className="group rounded-lg border p-2">
                          <div className="aspect-square w-full overflow-hidden rounded-md border bg-muted/10 grid place-items-center">
                            <Icon className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="truncate text-xs font-semibold">
                              {item.name} ({formatBytes(item.size)})
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted"
                              >
                                {tDetail("files.actions.open")}
                              </a>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        type="button"
                        className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted/30"
                        onClick={() => setShowImageForm(true)}
                        disabled={uploadingAttachment}
                      >
                        <span className="text-lg">+</span>
                        {tDetail("attachments.actions.add")}
                      </button>
                    </li>
                  </ul>
                </div>

                {showImageForm ? (
                  <div className="rounded-lg border bg-muted/10 p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {tDetail("images.fields.name")}
                        </label>
                        <input
                          type="text"
                          value={imageName}
                          onChange={(event) => setImageName(event.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder={tDetail("images.placeholders.name")}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {tDetail("images.fields.file")}
                        </label>
                        <input
                          type="file"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setImageFile(file);
                            if (file && !imageName.trim()) {
                              setImageName(buildDefaultAttachmentName());
                            }
                          }}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {tDetail("images.validationTooLarge")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs hover:bg-muted"
                        onClick={() => {
                          setShowImageForm(false);
                          setImageName("");
                          setImageFile(null);
                        }}
                        disabled={uploadingAttachment}
                      >
                        {tDetail("actions.cancel")}
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded border px-2 py-1 text-xs",
                          uploadingAttachment
                            ? "cursor-not-allowed opacity-70"
                            : "hover:bg-muted"
                        )}
                        onClick={() => void handleUpload()}
                        disabled={!imageFile || !imageName.trim() || uploadingAttachment}
                      >
                        {uploadingAttachment
                          ? tDetail("images.actions.uploading")
                          : tDetail("images.actions.upload")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
