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
  Pencil,
  Link2,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { TicketImage } from "@/lib/model-definitions/ticket";
import {
  addPublicTicketSection,
  fetchPublicTicketFollow,
  PublicTicketError,
  reopenPublicTicket,
  updatePublicTicket,
  updatePublicTicketSection,
  uploadPublicTicketImage,
  type PublicTicketFollowResponse,
} from "@/lib/api/public-tickets";
import { MISSING_TICKET_DESCRIPTION } from "@/lib/tickets-constants";
import { cn } from "@/lib/utils";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";
import { Switch } from "@/ui/components/form/switch";
import { RichTextEditor } from "@/ui/components/projects/RichTextEditor";
import { useLocaleQueryParam } from "@/ui/components/i18n/use-locale-query-param";

type Props = {
  followUpToken: string;
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const isMissingDescription = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return !trimmed || trimmed === MISSING_TICKET_DESCRIPTION;
};
const isLockedSection = (section?: { lockedAt?: string | null; lockedById?: string | null }) =>
  Boolean(section?.lockedAt || section?.lockedById);
const isPublicTicketLockedError = (error: unknown) =>
  error instanceof PublicTicketError &&
  (error.status === 409 ||
    error.status === 423 ||
    /\block(ed)?\b|bloquead/i.test(error.message));

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

function PublicTicketStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-200">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-xl font-semibold">{value}</p>
    </div>
  );
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
  useLocaleQueryParam();
  const format = useFormatter();
  const [data, setData] = useState<PublicTicketFollowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState("");
  const [sectionEditorKey, setSectionEditorKey] = useState(0);
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionSeed, setDescriptionSeed] = useState("");
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [reopening, setReopening] = useState(false);

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
  const isReadOnly = Boolean(
    data?.readOnly ?? (ticket as { readOnly?: boolean } | undefined)?.readOnly
  );
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

  const descriptionSection = useMemo(
    () => sections.find((section) => section.type === "DESCRIPTION"),
    [sections]
  );

  const hasDescription = !isMissingDescription(descriptionSection?.content);
  const descriptionLocked = isLockedSection(descriptionSection);
  const showLockedMissingDescription =
    descriptionLocked && isMissingDescription(descriptionSection?.content);
  const showDescriptionRequired =
    !isReadOnly && !descriptionLocked && isMissingDescription(descriptionSection?.content);
  const showDescriptionEditor =
    !isReadOnly && !descriptionLocked && (showDescriptionRequired || isEditingDescription);
  const canEditDescription = !isReadOnly && !descriptionLocked && hasDescription;
  const canAddResponse = !isReadOnly && (hasDescription || showLockedMissingDescription);
  const visibleSections = useMemo(
    () =>
      sections.filter((section) => section.type !== "DESCRIPTION"),
    [sections]
  );
  const getPublicSectionLabelType = useCallback(
    (type: string) => (type === "COMMENT" ? "RESPONSE" : type),
    []
  );
  const followUpUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(
      `/public/tickets/follow/${followUpToken}`,
      window.location.origin
    ).toString();
  }, [followUpToken]);

  useEffect(() => {
    if (descriptionSection?.content && !isMissingDescription(descriptionSection.content)) {
      setDescriptionDraft(descriptionSection.content);
      setDescriptionSeed(descriptionSection.content);
    } else {
      setDescriptionDraft("");
      setDescriptionSeed("");
    }
    setDescriptionEditorKey((prev) => prev + 1);
    if (!descriptionSection || isMissingDescription(descriptionSection.content)) {
      setIsEditingDescription(false);
    }
  }, [descriptionSection]);

  const handleSaveDescription = useCallback(async () => {
    if (isReadOnly || !descriptionDraft.trim() || descriptionSaving) return;
    setDescriptionSaving(true);
    try {
      const content = descriptionDraft.trim();
      if (descriptionSection?.id) {
        const updated = await updatePublicTicketSection(
          followUpToken,
          descriptionSection.id,
          { content }
        );
        setDescriptionSeed(updated.content);
      } else {
        const created = await addPublicTicketSection(followUpToken, {
          type: "DESCRIPTION",
          content,
        });
        setDescriptionSeed(created.content);
      }
      toast.success(tDetail("messages.sectionUpdated"));
      setIsEditingDescription(false);
      await loadTicket();
    } catch (err) {
      console.error("Failed to save public description", err);
      toast.error(
        isPublicTicketLockedError(err)
          ? t("follow.lockedMutation")
          : tDetail("messages.sectionUpdateError")
      );
    } finally {
      setDescriptionSaving(false);
    }
  }, [
    descriptionDraft,
    descriptionSaving,
    descriptionSection?.id,
    followUpToken,
    isReadOnly,
    loadTicket,
    t,
    tDetail,
  ]);

  const handleCancelDescriptionEdit = useCallback(() => {
    setDescriptionDraft(descriptionSeed);
    setIsEditingDescription(false);
  }, [descriptionSeed]);

  const richTextLabels = useMemo(
    () => ({
      bold: tRichText("bold"),
      italic: tRichText("italic"),
      underline: tRichText("underline"),
      code: tRichText("code"),
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
    if (isReadOnly || sectionSaving) return;
    if (!sectionContent.trim()) {
      toast.error(t("follow.missing"));
      return;
    }
    setSectionSaving(true);
    try {
      await addPublicTicketSection(followUpToken, {
        content: sectionContent.trim(),
      });
      setSectionContent("");
      setSectionEditorKey((prev) => prev + 1);
      toast.success(t("follow.sectionAdded"));
      await loadTicket();
    } catch (err) {
      console.error("Failed to add public section", err);
      toast.error(
        isPublicTicketLockedError(err)
          ? t("follow.lockedMutation")
          : t("follow.sectionError")
      );
    } finally {
      setSectionSaving(false);
    }
  }, [followUpToken, isReadOnly, loadTicket, sectionContent, sectionSaving, t]);

  const handleUpload = useCallback(async () => {
    if (isReadOnly || uploadingAttachment || !imageFile || !imageName.trim()) return;
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
  }, [followUpToken, imageFile, imageName, isReadOnly, loadTicket, t, uploadingAttachment]);

  const handleEditSection = useCallback((section: { id: string; content: string }) => {
    if (isReadOnly) return;
    setEditingSectionId(section.id);
    setEditingSeed(section.content ?? "");
    setEditingContent(section.content ?? "");
    setEditingEditorKey((prev) => prev + 1);
  }, [isReadOnly]);

  const handleCancelEdit = useCallback(() => {
    setEditingSectionId(null);
    setEditingContent("");
    setEditingSeed("");
  }, []);

  const handleSaveSection = useCallback(async () => {
    if (isReadOnly || !editingSectionId || editingSaving) return;
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
      toast.error(
        isPublicTicketLockedError(err)
          ? t("follow.lockedMutation")
          : tDetail("messages.sectionUpdateError")
      );
    } finally {
      setEditingSaving(false);
    }
  }, [
    editingContent,
    editingSaving,
    editingSectionId,
    followUpToken,
    isReadOnly,
    loadTicket,
    t,
    tDetail,
  ]);

  const handleStartEditTitle = useCallback(() => {
    if (isReadOnly) return;
    setTitleValue(ticket?.title ?? "");
    setEditingTitle(true);
  }, [isReadOnly, ticket?.title]);

  const handleSaveTitle = useCallback(async () => {
    if (isReadOnly) return;
    if (!titleValue.trim()) {
      toast.error(tDetail("messages.titleRequired"));
      return;
    }
    setTitleSaving(true);
    try {
      await updatePublicTicket(followUpToken, { title: titleValue.trim() });
      toast.success(tDetail("messages.titleUpdated"));
      setEditingTitle(false);
      await loadTicket();
    } catch (err) {
      console.error("Failed to update title", err);
      toast.error(tDetail("messages.titleUpdateError"));
    } finally {
      setTitleSaving(false);
    }
  }, [followUpToken, isReadOnly, loadTicket, tDetail, titleValue]);

  const handleCancelTitle = useCallback(() => {
    setEditingTitle(false);
    setTitleValue("");
  }, []);

  const handleCopyFollowUpLink = useCallback(async () => {
    if (!followUpUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(followUpUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = followUpUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(t("create.copied"));
    } catch (err) {
      console.error("Failed to copy public follow up link", err);
      toast.error(t("create.copyError"));
    }
  }, [followUpUrl, t]);

  const handleReopenTicket = useCallback(async () => {
    if (reopening) return;
    setReopening(true);
    try {
      await reopenPublicTicket(followUpToken);
      toast.success(t("follow.reopenSuccess"));
      await loadTicket();
    } catch (err) {
      console.error("Failed to reopen public ticket", err);
      toast.error(t("follow.reopenError"));
    } finally {
      setReopening(false);
    }
  }, [followUpToken, loadTicket, reopening, t]);

  const projectName =
    data?.projectName ?? ticket?.project?.name ?? t("follow.projectFallback");
  const createdAtLabel = ticket?.createdAt
    ? format.dateTime(new Date(ticket.createdAt), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-950">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-linear-to-r from-slate-900 to-slate-700 px-6 py-7 text-white">
            <p className="text-sm font-medium text-slate-200">{t("follow.title")}</p>
            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {ticket?.title ?? t("follow.ticketFallback")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-200">
                  {t("follow.subtitle")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <PublicTicketStat
                  icon={MessageSquare}
                  label={t("follow.activity")}
                  value={visibleSections.length}
                />
                <PublicTicketStat
                  icon={Paperclip}
                  label={tDetail("attachments.title")}
                  value={images.length}
                />
                <PublicTicketStat
                  icon={CheckCircle2}
                  label={t("follow.projectLabel", { name: "" }).trim() || "Project"}
                  value={projectName}
                />
              </div>
            </div>
          </div>
        </header>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t("follow.loading")}</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {isReadOnly ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t("follow.readOnlyTitle")}</p>
                  <p className="text-sm text-amber-900/80">
                    {t("follow.readOnlyHint")}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => void handleReopenTicket()}
                  disabled={reopening}
                >
                  {reopening ? t("follow.reopening") : t("follow.reopen")}
                </button>
              </div>
            </section>
          ) : null}

          {showDescriptionRequired ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    <span>{t("create.followUpTitle")}</span>
                  </div>
                  <p className="text-sm text-emerald-900/80">
                    {t("create.followUpHint")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white"
                    onClick={() => void handleCopyFollowUpLink()}
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    {t("create.copy")}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    className="flex-1 rounded-md border px-3 py-1.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveTitle()}
                    disabled={titleSaving}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {titleSaving ? "..." : tDetail("messages.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelTitle()}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium"
                  >
                    {tDetail("messages.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold flex-1">
                    {ticket?.title ?? t("follow.ticketFallback")}
                  </h2>
                  {!isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => handleStartEditTitle()}
                      className="rounded-md bg-primary p-1.5 text-primary-foreground hover:bg-primary/90"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("follow.projectLabel", {
                  name: projectName,
                })}
              </p>
              {createdAtLabel ? (
                <p className="text-xs text-muted-foreground">
                  {t("follow.createdAt", {
                    date: createdAtLabel,
                  })}
                </p>
              ) : null}
            </div>

            {showDescriptionEditor ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {showDescriptionRequired ? (
                      <>
                        <p className="text-sm font-semibold text-amber-900">
                          {tDetail("messages.descriptionRequired")}
                        </p>
                        <p className="mt-1 text-xs text-amber-800">
                          {tDetail("sectionTypes.DESCRIPTION")}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-amber-900">
                        {tDetail("sectionTypes.DESCRIPTION")}
                      </p>
                    )}
                  </div>
                  {!showDescriptionRequired ? (
                    <button
                      type="button"
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={handleCancelDescriptionEdit}
                      disabled={descriptionSaving}
                    >
                      {tDetail("actions.cancel")}
                    </button>
                  ) : null}
                </div>
                <div className="mt-3">
                  <RichTextEditor
                    key={`public-description-${descriptionEditorKey}`}
                    name="public-description"
                    label={tDetail("sectionTypes.DESCRIPTION")}
                    placeholder={tDetail("placeholders.content")}
                    defaultValue={descriptionSeed}
                    labels={richTextLabels}
                    onValueChange={setDescriptionDraft}
                    hideLabel
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium",
                      !descriptionDraft.trim() || descriptionSaving
                        ? "cursor-not-allowed opacity-70"
                        : "hover:bg-slate-50"
                    )}
                    onClick={() => void handleSaveDescription()}
                    disabled={!descriptionDraft.trim() || descriptionSaving}
                  >
                    {descriptionSaving ? tDetail("actions.saving") : tDetail("actions.save")}
                  </button>
                </div>
              </div>
            ) : hasDescription ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {tDetail("sectionTypes.DESCRIPTION")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tDetail("description.helper")}
                    </p>
                  </div>
                  {canEditDescription ? (
                    <button
                      type="button"
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      {tDetail("actions.edit")}
                    </button>
                  ) : null}
                </div>
                <RichTextPreview
                  value={descriptionSection?.content}
                  emptyLabel={tDetail("description.empty")}
                  imageMap={imageMap}
                  fileOpenLabel={tDetail("files.actions.open")}
                />
              </div>
            ) : null}

            {showLockedMissingDescription ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {t("follow.lockedMissingDescription")}
              </div>
            ) : null}

            {canAddResponse ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                <h3 className="text-sm font-semibold">{t("follow.addResponse")}</h3>

                <div className="grid gap-4">
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <span className="font-medium">{t("follow.fields.content")}</span>
                    <RichTextEditor
                      key={`public-response-${sectionEditorKey}`}
                      name="public-response"
                      label={t("follow.fields.content")}
                      placeholder={t("follow.placeholders.content")}
                      defaultValue=""
                      labels={richTextLabels}
                      onValueChange={setSectionContent}
                      hideLabel
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {tDetail("images.hint")}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium",
                      sectionSaving
                        ? "cursor-not-allowed opacity-70"
                        : "hover:bg-slate-50"
                    )}
                    onClick={() => void handleAddSection()}
                    disabled={sectionSaving}
                  >
                    {sectionSaving ? t("follow.saving") : t("follow.submit")}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{t("follow.activity")}</h3>
                {!showDescriptionRequired ? (
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
                ) : null}
              </div>

              {!showDescriptionRequired ? (
                visibleSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("follow.empty")}</p>
                ) : (
                  <div className="space-y-3">
                    {visibleSections.map((section) => (
                      <div
                        key={section.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold">
                              {tDetail(`sectionTypes.${getPublicSectionLabelType(section.type)}`, {
                                default: getPublicSectionLabelType(section.type),
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
                              {section.author?.name ||
                                ticket?.publicReporterName ||
                                t("follow.externalAuthor")}
                            </span>
                          </div>
                          {!isLockedSection(section) &&
                          !isReadOnly &&
                          editingSectionId !== section.id ? (
                            <button
                              type="button"
                              className="rounded border border-slate-200 px-2 py-1 text-[10px] hover:bg-slate-50"
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
                                className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                                onClick={handleCancelEdit}
                                disabled={editingSaving}
                              >
                                {tDetail("actions.cancel")}
                              </button>
                              <button
                                type="button"
                                className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-70"
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
                )
              ) : null}
            </div>

          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
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
                              <div className="aspect-square w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50">
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
                                  className="rounded border border-slate-200 px-2 py-0.5 text-[10px] hover:bg-slate-50"
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
                          <div className="aspect-square w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 grid place-items-center">
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
                                className="rounded border border-slate-200 px-2 py-0.5 text-[10px] hover:bg-slate-50"
                              >
                                {tDetail("files.actions.open")}
                              </a>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {!isReadOnly ? (
                      <li>
                        <button
                          type="button"
                          className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 hover:bg-slate-50"
                          onClick={() => setShowImageForm(true)}
                          disabled={uploadingAttachment}
                        >
                          <span className="text-lg">+</span>
                          {tDetail("attachments.actions.add")}
                        </button>
                      </li>
                    ) : null}
                  </ul>
                </div>

                {showImageForm && !isReadOnly ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
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
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
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
                          "rounded border border-slate-200 bg-white px-2 py-1 text-xs",
                          uploadingAttachment
                            ? "cursor-not-allowed opacity-70"
                            : "hover:bg-slate-50"
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
      </div>
    </main>
  );
}
