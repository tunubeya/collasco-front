"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Calendar,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  FileAudio,
  File,
  ChevronDown,
  User,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import type { ProjectMember } from "@/lib/model-definitions/project";
import type {
  TicketDetail,
  TicketImage,
  TicketSection,
  TicketSectionType,
  TicketStatus,
  TicketFeature,
} from "@/lib/model-definitions/ticket";
import {
  addTicketSection,
  autocompleteTicketFeatures,
  deleteTicketImage,
  deleteTicket,
  listTicketImages,
  uploadTicketImage,
  updateTicketSection,
  updateTicket,
} from "@/lib/api/tickets";
import { MISSING_TICKET_DESCRIPTION } from "@/lib/tickets-constants";
import { actionButtonClass } from "@/ui/styles/action-button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Switch } from "@/ui/components/form/switch";
import {
  Dialog,
  DialogContent,
  DialogHeading,
  DialogDescription,
  DialogClose,
} from "@/ui/components/dialog/dialog";

type Props = {
  token: string;
  projectId: string;
  ticket: TicketDetail;
  members: ProjectMember[];
  canManageTicket: boolean;
  canRespondTicket: boolean;
  canAccessImages: boolean;
  currentUserId?: string | null;
};

type ImageTokenSize = {
  name: string;
  width?: number;
  height?: number;
};

function parseImageToken(raw: string): ImageTokenSize | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const [namePart, sizePart] = splitOnce(trimmed, ":");
  const name = namePart.trim();
  if (!name) return null;
  if (!sizePart) return { name };

  const size = sizePart.trim().toLowerCase();
  if (!size) return { name };

  if (size === "small" || size === "medium" || size === "big") {
    const width =
      size === "small" ? 240 : size === "medium" ? 480 : 720;
    return { name, width };
  }

  const match = size.match(/^(\d+|auto)x(\d+|auto)$/i);
  if (!match) {
    return { name };
  }
  const [, rawW, rawH] = match;
  const width = rawW.toLowerCase() === "auto" ? undefined : Number(rawW);
  const height = rawH.toLowerCase() === "auto" ? undefined : Number(rawH);
  return { name, width, height };
}

function splitOnce(value: string, delimiter: string): [string, string | null] {
  const idx = value.indexOf(delimiter);
  if (idx === -1) return [value, null];
  return [value.slice(0, idx), value.slice(idx + delimiter.length)];
}

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

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "PENDING", "RESOLVED"];
const SECTION_TYPES: TicketSectionType[] = ["RESPONSE", "COMMENT"];
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const isMissingDescription = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return !trimmed || trimmed === MISSING_TICKET_DESCRIPTION;
};

export function TicketDetailView({
  token,
  projectId,
  ticket,
  members,
  canManageTicket,
  canRespondTicket,
  canAccessImages,
  currentUserId,
}: Props) {
  const t = useTranslations("app.tickets.detail");
  const tList = useTranslations("app.tickets.list");
  const format = useFormatter();
  const router = useRouter();

  const [ticketState, setTicketState] = useState<TicketDetail>(ticket);
  const [title, setTitle] = useState(ticket.title);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assigneeId, setAssigneeId] = useState<string | null>(
    ticket.assigneeId ?? null
  );

  const [featureQuery, setFeatureQuery] = useState(
    ticket.feature?.name ?? ""
  );
  const [featureId, setFeatureId] = useState<string | null>(
    ticket.feature?.id ?? null
  );
  const [featureOptions, setFeatureOptions] = useState<TicketFeature[]>([]);
  const debouncedQuery = useDebounce(featureQuery, 300);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const featureBlurRef = useRef<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [sectionType, setSectionType] =
    useState<TicketSectionType>("RESPONSE");
  const [sectionContent, setSectionContent] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [images, setImages] = useState<TicketImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBusyId, setImageBusyId] = useState<string | null>(null);
  const [showImageForm, setShowImageForm] = useState(false);
  const [showImages, setShowImages] = useState(true);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [activityOrder, setActivityOrder] = useState<"recent" | "oldest">("recent");

  const assigneeOptions = useMemo(
    () =>
      members
        .map((member) => ({
          id: member.userId,
          name:
            member.user?.name ??
            member.user?.email ??
            t("assignee.unknown"),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members, t]
  );

  const assigneeLabel = useMemo(() => {
    if (!assigneeId) return tList("meta.unassigned");
    const match = assigneeOptions.find((option) => option.id === assigneeId);
    return match?.name ?? t("assignee.unknown");
  }, [assigneeId, assigneeOptions, t, tList]);

  const canDeleteTicket = useMemo(
    () =>
      canManageTicket ||
      (currentUserId ? currentUserId === ticketState.createdById : false),
    [canManageTicket, currentUserId, ticketState.createdById]
  );

  const sections = useMemo(
    () => ticketState.sections ?? [],
    [ticketState.sections]
  );
  const orderedSections = useMemo(() => {
    const list = [...sections];
    list.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return activityOrder === "recent" ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [activityOrder, sections]);
  const descriptionSection = useMemo(
    () => sections.find((section) => section.type === "DESCRIPTION"),
    [sections]
  );
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const canEditDescription = canManageTicket || canRespondTicket;
  const showDescriptionRequired =
    canEditDescription && isMissingDescription(descriptionSection?.content);
  const visibleSections = useMemo(
    () =>
      orderedSections.filter(
        (section) =>
          !(
            section.type === "DESCRIPTION" &&
            isMissingDescription(section.content)
          )
      ),
    [orderedSections]
  );

  useEffect(() => {
    if (descriptionSection?.content && !isMissingDescription(descriptionSection.content)) {
      setDescriptionDraft(descriptionSection.content);
    } else {
      setDescriptionDraft("");
    }
  }, [descriptionSection]);

  const imagesByName = useMemo(() => {
    const map = new Map<string, TicketImage>();
    images
      .filter((image) => image.mimeType?.startsWith("image/"))
      .forEach((image) => map.set(image.name, image));
    return map;
  }, [images]);

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

  const resolveFileIcon = useCallback((mimeType?: string) => {
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
  }, []);

  useEffect(() => {
    setTicketState(ticket);
    setTitle(ticket.title);
    setStatus(ticket.status);
    setAssigneeId(ticket.assigneeId ?? null);
    setFeatureId(ticket.feature?.id ?? null);
    setFeatureQuery(ticket.feature?.name ?? "");
  }, [ticket]);

  useEffect(() => {
    if (!canAccessImages) return;
    let active = true;
    setImagesLoading(true);
    listTicketImages(token, ticket.id)
      .then((items) => {
        if (!active) return;
        setImages(items ?? []);
      })
      .catch((error) => {
        console.error("[TicketDetailView] images load error:", error);
        toast.error(t("images.loadError"));
      })
      .finally(() => {
        if (active) setImagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canAccessImages, t, ticket.id, token]);

  useEffect(() => {
    if (!canManageTicket || !featureOpen) return;
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setFeatureOptions([]);
      return;
    }
    let active = true;
    setFeatureLoading(true);
    autocompleteTicketFeatures(token, projectId, debouncedQuery)
      .then((items) => {
        if (!active) return;
        setFeatureOptions(items ?? []);
      })
      .catch((error) => {
        console.error("[TicketDetailView] feature search error:", error);
      })
      .finally(() => {
        if (active) setFeatureLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canManageTicket, debouncedQuery, featureOpen, projectId, token]);

  const handleSave = useCallback(async () => {
    if (!canManageTicket) return;
    setSaving(true);
    try {
      const payload: {
        title?: string;
        status?: TicketStatus;
        assigneeId?: string | null;
        featureId?: string | null;
      } = {};
      if (title.trim() !== ticketState.title) payload.title = title.trim();
      if (status !== ticketState.status) payload.status = status;
      if ((assigneeId ?? null) !== (ticketState.assigneeId ?? null)) {
        payload.assigneeId = assigneeId ?? null;
      }
      if ((featureId ?? null) !== (ticketState.featureId ?? null)) {
        payload.featureId = featureId ?? null;
      }

      if (Object.keys(payload).length === 0) {
        toast.info(t("messages.noChanges"));
        return;
      }

      const updated = await updateTicket(token, ticketState.id, payload);
      setTicketState((prev) => ({
        ...prev,
        ...updated,
        featureId: updated.featureId ?? featureId ?? null,
        assigneeId: updated.assigneeId ?? assigneeId ?? null,
        title: updated.title ?? title,
        status: updated.status ?? status,
      }));
      toast.success(t("messages.updated"));
    } catch (error) {
      console.error("[TicketDetailView] update error:", error);
      toast.error(t("messages.updateError"));
    } finally {
      setSaving(false);
    }
  }, [
    assigneeId,
    canManageTicket,
    featureId,
    status,
    t,
    ticketState,
    title,
    token,
  ]);

  const handleAddSection = useCallback(async () => {
    if (!canRespondTicket || !sectionContent.trim()) return;
    setSectionSaving(true);
    try {
      const created = await addTicketSection(token, ticketState.id, {
        type: sectionType,
        content: sectionContent.trim(),
      });
      setTicketState((prev) => ({
        ...prev,
        sections: [...(prev.sections ?? []), created],
      }));
      setSectionContent("");
      toast.success(t("messages.sectionAdded"));
    } catch (error) {
      console.error("[TicketDetailView] add section error:", error);
      toast.error(t("messages.sectionError"));
    } finally {
      setSectionSaving(false);
    }
  }, [
    canRespondTicket,
    sectionContent,
    sectionType,
    t,
    ticketState.id,
    token,
  ]);

  const handleSaveDescription = useCallback(async () => {
    if (!canEditDescription || !descriptionDraft.trim() || descriptionSaving) return;
    setDescriptionSaving(true);
    try {
      const content = descriptionDraft.trim();
      if (descriptionSection?.id) {
        const updated = await updateTicketSection(
          token,
          ticketState.id,
          descriptionSection.id,
          { content }
        );
        setTicketState((prev) => ({
          ...prev,
          sections: (prev.sections ?? []).map((section) =>
            section.id === updated.id ? updated : section
          ),
        }));
      } else {
        const created = await addTicketSection(token, ticketState.id, {
          type: "DESCRIPTION",
          content,
        });
        setTicketState((prev) => ({
          ...prev,
          sections: [...(prev.sections ?? []), created],
        }));
      }
      toast.success(t("messages.sectionUpdated"));
    } catch (error) {
      console.error("[TicketDetailView] description save error:", error);
      toast.error(t("messages.sectionUpdateError"));
    } finally {
      setDescriptionSaving(false);
    }
  }, [
    canEditDescription,
    descriptionDraft,
    descriptionSection?.id,
    descriptionSaving,
    ticketState.id,
    token,
    t,
  ]);

  const handleEditSection = useCallback(
    (section: TicketSection) => {
      setEditingSectionId(section.id);
      setEditingContent(section.content);
    },
    []
  );

  const handleSaveSection = useCallback(async () => {
    if (!editingSectionId || !editingContent.trim()) return;
    setEditingSaving(true);
    try {
      const updated = await updateTicketSection(
        token,
        ticketState.id,
        editingSectionId,
        { content: editingContent.trim() }
      );
      setTicketState((prev) => ({
        ...prev,
        sections: (prev.sections ?? []).map((section) =>
          section.id === updated.id ? updated : section
        ),
      }));
      setEditingSectionId(null);
      setEditingContent("");
      toast.success(t("messages.sectionUpdated"));
    } catch (error) {
      console.error("[TicketDetailView] edit section error:", error);
      toast.error(t("messages.sectionUpdateError"));
    } finally {
      setEditingSaving(false);
    }
  }, [editingContent, editingSectionId, t, ticketState.id, token]);

  const handleCancelEdit = useCallback(() => {
    setEditingSectionId(null);
    setEditingContent("");
  }, []);

  const handleUploadImage = useCallback(async () => {
    if (!canAccessImages) return;
    if (!imageFile || !imageName.trim()) {
      toast.error(t("images.validation"));
      return;
    }
    if (imageFile.size > MAX_ATTACHMENT_BYTES) {
      toast.error(t("images.validationTooLarge"));
      return;
    }
    if (uploadingAttachment) return;
    setUploadingAttachment(true);
    try {
      const created = await uploadTicketImage(token, ticketState.id, {
        file: imageFile,
        name: imageName.trim(),
      });
      setImages((prev) => [...prev, created]);
      setImageName("");
      setImageFile(null);
      setShowImageForm(false);
      toast.success(t("images.uploaded"));
    } catch (error) {
      console.error("[TicketDetailView] upload image error:", error);
      toast.error(t("images.uploadError"));
    } finally {
      setUploadingAttachment(false);
    }
  }, [
    canAccessImages,
    imageFile,
    imageName,
    t,
    ticketState.id,
    token,
    uploadingAttachment,
  ]);

  const handleDeleteImage = useCallback(
    async (image: TicketImage) => {
      if (!canAccessImages) return;
      if (imageBusyId) return;
      setImageBusyId(image.id);
      try {
        await deleteTicketImage(token, ticketState.id, image.id);
        setImages((prev) => prev.filter((item) => item.id !== image.id));
        toast.success(t("images.deleted"));
      } catch (error) {
        console.error("[TicketDetailView] delete image error:", error);
        toast.error(t("images.deleteError"));
      } finally {
        setImageBusyId(null);
      }
    },
    [canAccessImages, imageBusyId, t, ticketState.id, token]
  );

  const handleDeleteTicket = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteTicket(token, ticketState.id);
      toast.success(t("messages.deleted"));
      router.push("/app/tickets");
      router.refresh();
    } catch (error) {
      console.error("[TicketDetailView] delete ticket error:", error);
      toast.error(t("messages.deleteError"));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [deleting, router, t, ticketState.id, token]);

  const renderContent = useCallback(
    (content: string) => {
      if (!showImages) {
        return <span>{content}</span>;
      }
      const parts: Array<string | (TicketImage & { width?: number; height?: number })> = [];
      const regex = /\[([^\]]+)\]/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.slice(lastIndex, match.index));
        }
        const token = match[1];
        const parsed = parseImageToken(token);
        const image = parsed ? imagesByName.get(parsed.name) : undefined;
        if (image) {
          parts.push({
            ...image,
            width: parsed?.width,
            height: parsed?.height,
          } as TicketImage & { width?: number; height?: number });
        } else {
          parts.push(match[0]);
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < content.length) {
        parts.push(content.slice(lastIndex));
      }
      return parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={`text-${index}`}>{part}</span>
        ) : (
          <img
            key={`img-${part.id}-${index}`}
            src={part.url}
            alt={part.name}
            style={{
              width: typeof part.width === "number" ? part.width : undefined,
              height: typeof part.height === "number" ? part.height : undefined,
            }}
            className="my-2 max-w-full rounded-lg border object-cover"
          />
        )
      );
    },
    [imagesByName, showImages]
  );

  const createdAt = format.dateTime(new Date(ticketState.createdAt), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const updatedAt = ticketState.updatedAt
    ? format.dateTime(new Date(ticketState.updatedAt), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const createdBy =
    ticketState.createdBy?.name ??
    ticketState.createdBy?.email ??
    t("assignee.unknown");
  return (
    <div className="grid gap-6">
      <header className="rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{ticketState.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {t("meta.createdBy", { name: createdBy })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {t("meta.assignedTo", { name: assigneeLabel })}
              </span>
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {tList(`statuses.${ticketState.status}`, {
                  default: ticketState.status,
                })}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 text-right">
            <div className="flex items-center justify-end gap-1">
              <Calendar className="h-3 w-3" />
              {t("meta.createdAt", { date: createdAt })}
            </div>
            {updatedAt ? (
              <div className="flex items-center justify-end gap-1">
                <Calendar className="h-3 w-3" />
                {t("meta.updatedAt", { date: updatedAt })}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-background p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("sections.details")}</h2>
          <div className="flex items-center gap-2">
            {canManageTicket ? (
              <button
                type="button"
                className={actionButtonClass({ size: "xs" })}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? t("actions.saving") : t("actions.save")}
              </button>
            ) : null}
            {canDeleteTicket ? (
              <button
                type="button"
                className={actionButtonClass({
                  size: "xs",
                  variant: "destructive",
                })}
                onClick={() => setDeleteOpen(true)}
              >
                {t("actions.delete")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.title")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.status")}
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TicketStatus)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {tList(`statuses.${item}`, { default: item })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.assignee")}
            </label>
            <select
              value={assigneeId ?? ""}
              onChange={(event) =>
                setAssigneeId(event.target.value || null)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            >
              <option value="">{t("assignee.unassigned")}</option>
              {assigneeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.feature")}
            </label>
              <input
                type="text"
                value={featureQuery}
                onChange={(event) => {
                  setFeatureQuery(event.target.value);
                  if (!event.target.value) {
                    setFeatureId(null);
                  }
                }}
                onFocus={() => {
                  if (featureBlurRef.current) {
                    window.clearTimeout(featureBlurRef.current);
                    featureBlurRef.current = null;
                  }
                  setFeatureOpen(true);
                }}
                onBlur={() => {
                  featureBlurRef.current = window.setTimeout(() => {
                    setFeatureOpen(false);
                  }, 150);
                }}
                placeholder={t("placeholders.feature")}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                disabled={!canManageTicket}
              />
            {canManageTicket && featureOpen && featureLoading ? (
              <p className="text-xs text-muted-foreground">
                {t("messages.loadingFeatures")}
              </p>
            ) : null}
            {canManageTicket && featureOpen && featureOptions.length > 0 ? (
              <div className="rounded-lg border bg-white p-2 text-sm">
                <ul className="space-y-1">
                  {featureOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-md px-2 py-1 text-left hover:bg-muted",
                          option.id === featureId
                            ? "bg-muted font-semibold"
                            : ""
                        )}
                        onClick={() => {
                          setFeatureId(option.id);
                          setFeatureQuery(option.name);
                          setFeatureOptions([]);
                          setFeatureOpen(false);
                        }}
                      >
                        <div className="text-sm font-medium">
                          {option.name}
                        </div>
                        {option.path ? (
                          <div className="text-xs text-muted-foreground">
                            {option.path}
                          </div>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="m-4 max-w-md rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeading className="text-lg font-semibold">
            {t("delete.title")}
          </DialogHeading>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("delete.description")}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose>{t("actions.cancel")}</DialogClose>
            <button
              type="button"
              className={actionButtonClass({ variant: "destructive" })}
              onClick={() => void handleDeleteTicket()}
              disabled={deleting}
            >
              {deleting ? t("actions.deleting") : t("actions.confirmDelete")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {canAccessImages ? (
        <section className="rounded-xl border bg-background p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{t("attachments.title")}</h2>
              <span className="text-xs text-muted-foreground">
                {t("attachments.hint")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachmentsOpen((prev) => !prev)}
              className="rounded-full border p-1 text-muted-foreground hover:text-foreground"
              aria-expanded={attachmentsOpen}
              aria-label={attachmentsOpen ? t("actions.collapse") : t("actions.expand")}
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
              {imagesLoading ? (
                <p className="text-sm text-muted-foreground">
                  {t("images.loading")}
                </p>
              ) : (
                <>
                  {images.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("images.empty")}
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
                                  {item.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted"
                                    onClick={() =>
                                      navigator.clipboard.writeText(`[${item.name}]`)
                                    }
                                  >
                                    {t("images.actions.copy")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded border border-destructive px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
                                    onClick={() => void handleDeleteImage(item)}
                                    disabled={imageBusyId === item.id}
                                  >
                                    {imageBusyId === item.id
                                      ? t("images.actions.deleting")
                                      : t("images.actions.delete")}
                                  </button>
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
                                {item.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatBytes(item.size)}
                              </p>
                              <div className="flex flex-wrap items-center gap-1">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted"
                                >
                                  {t("files.actions.open")}
                                </a>
                                <button
                                  type="button"
                                  className="rounded border border-destructive px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
                                  onClick={() => void handleDeleteImage(item)}
                                  disabled={imageBusyId === item.id}
                                >
                                  {imageBusyId === item.id
                                    ? t("files.actions.deleting")
                                    : t("files.actions.delete")}
                                </button>
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
                          {t("attachments.actions.add")}
                        </button>
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {showImageForm ? (
                <div className="rounded-lg border bg-muted/10 p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("images.fields.name")}
                      </label>
                      <input
                        type="text"
                        value={imageName}
                        onChange={(event) => setImageName(event.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t("images.placeholders.name")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("images.fields.file")}
                      </label>
                      <input
                        type="file"
                        onChange={(event) =>
                          setImageFile(event.target.files?.[0] ?? null)
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {t("images.validationTooLarge")}
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
                      {t("actions.cancel")}
                    </button>
                    <button
                      type="button"
                      className={actionButtonClass({ size: "xs" })}
                      onClick={() => void handleUploadImage()}
                      disabled={!imageFile || !imageName.trim() || uploadingAttachment}
                    >
                      {uploadingAttachment
                        ? t("images.actions.uploading")
                        : t("images.actions.upload")}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border bg-background p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("sections.activity")}</h2>
          <div className="flex items-center gap-4">
            <select
              value={activityOrder}
              onChange={(event) =>
                setActivityOrder(event.target.value as "recent" | "oldest")
              }
              className="rounded-md border px-3 py-1.5 pr-8 text-sm"
            >
              <option value="recent">{t("activitySort.recent")}</option>
              <option value="oldest">{t("activitySort.oldest")}</option>
            </select>
            <Switch
              checked={showImages}
              onChange={(event) => setShowImages(event.target.checked)}
              label={t("images.toggle")}
            />
            <span className="text-xs text-muted-foreground">
              {t("meta.sectionsCount", { count: visibleSections.length })}
            </span>
          </div>
        </div>

        {showDescriptionRequired ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              {t("messages.descriptionRequired")}
            </p>
            <p className="mt-1 text-xs text-amber-800">
              {t("sectionTypes.DESCRIPTION")}
            </p>
            <textarea
              rows={4}
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.content")}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className={actionButtonClass({ size: "xs" })}
                onClick={() => void handleSaveDescription()}
                disabled={!descriptionDraft.trim() || descriptionSaving}
              >
                {descriptionSaving ? t("actions.saving") : t("actions.save")}
              </button>
            </div>
          </div>
        ) : null}

        {visibleSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {visibleSections.map((section) => {
              const created = format.dateTime(
                new Date(section.createdAt),
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                }
              );
              const author =
                section.author?.name ??
                section.author?.email ??
                t("assignee.unknown");
              const canEditSection =
                canManageTicket ||
                (section.authorId && currentUserId
                  ? section.authorId === currentUserId
                  : false);
              return (
                <li key={section.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold">
                        {t(`sectionTypes.${section.type}`, {
                          default: section.type,
                        })}
                      </span>
                      <span>{created}</span>
                    </div>
                    {canEditSection && editingSectionId !== section.id ? (
                      <button
                        type="button"
                        className={actionButtonClass({ size: "xs" })}
                        onClick={() => handleEditSection(section)}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden />
                        {t("actions.edit")}
                      </button>
                    ) : null}
                  </div>
                  {section.title ? (
                    <p className="mt-2 text-sm font-semibold">
                      {section.title}
                    </p>
                  ) : null}
                  {editingSectionId === section.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={3}
                        value={editingContent}
                        onChange={(event) =>
                          setEditingContent(event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs hover:bg-muted"
                          onClick={handleCancelEdit}
                          disabled={editingSaving}
                        >
                          {t("actions.cancel")}
                        </button>
                        <button
                          type="button"
                          className={actionButtonClass({ size: "xs" })}
                          onClick={() => void handleSaveSection()}
                          disabled={editingSaving || !editingContent.trim()}
                        >
                          {editingSaving
                            ? t("actions.saving")
                            : t("actions.save")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm whitespace-pre-line">
                      {renderContent(section.content)}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("meta.createdBy", { name: author })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {canRespondTicket ? (
          <form
            className="mt-4 space-y-3 rounded-lg border bg-muted/10 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddSection();
            }}
          >
            <h3 className="text-sm font-semibold">{t("sections.add")}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("fields.type")}
                </label>
                <select
                  value={sectionType}
                  onChange={(event) =>
                    setSectionType(event.target.value as TicketSectionType)
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SECTION_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {t(`sectionTypes.${item}`, { default: item })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("fields.content")}
              </label>
              <textarea
                rows={4}
                value={sectionContent}
                onChange={(event) => setSectionContent(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("placeholders.content")}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className={actionButtonClass({ size: "xs" })}
                disabled={sectionSaving || !sectionContent.trim()}
              >
                {sectionSaving
                  ? t("actions.saving")
                  : t("actions.addSection")}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
