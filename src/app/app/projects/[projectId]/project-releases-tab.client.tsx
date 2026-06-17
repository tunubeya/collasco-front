"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Pencil,
  Share2,
  Trash2,
  X,
  Wand2,
} from "lucide-react";

import {
  getDocumentationVersion,
  type QaDocumentationVersionContent,
} from "@/lib/api/qa";
import {
  createProjectRelease,
  createReleaseShareLink,
  deleteProjectRelease,
  deleteReleaseShareLink,
  generateProjectReleaseNotes,
  getProjectRelease,
  getProjectReleaseDocumentationStatus,
  getProjectReleaseNotes,
  getProjectReleasePreview,
  listReleaseShareLinks,
  listProjectReleases,
  prepareProjectRelease,
  releaseProjectRelease,
  updateProjectRelease,
  updateProjectReleaseNotes,
  type DocumentationStatus,
  type ReleaseChangeType,
  type ReleaseConflictPayload,
  type ReleaseDetail,
  type ReleaseEntityType,
  type ReleaseListItem,
  type ReleaseNotes,
  type ReleasePreview,
  type ReleaseShareLink,
  type ReleaseStatus,
} from "@/lib/api/releases";
import { cn } from "@/lib/utils";
import { actionButtonClass } from "@/ui/styles/action-button";
import { markdownishToRichTextHtml } from "@/lib/rich-text";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeading,
} from "@/ui/components/dialog/dialog";
import { RichTextEditor } from "@/ui/components/projects/RichTextEditor";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";

type ProjectReleasesTabProps = {
  token: string;
  projectId: string;
  canManageQa: boolean;
};

type ViewMode = "items" | "notes";

export function ProjectReleasesTab({
  token,
  projectId,
  canManageQa,
}: ProjectReleasesTabProps) {
  const t = useTranslations("app.projects.releases");
  const formatter = useFormatter();
  const [releases, setReleases] = useState<ReleaseListItem[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseDetail | null>(null);
  const [documentationStatus, setDocumentationStatus] =
    useState<DocumentationStatus | null>(null);
  const [preview, setPreview] = useState<ReleasePreview | null>(null);
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("items");
  const [editingName, setEditingName] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [shareLinks, setShareLinks] = useState<ReleaseShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isShareBusy, setIsShareBusy] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isReleasePanelOpen, setIsReleasePanelOpen] = useState(true);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [generateNotesDialogOpen, setGenerateNotesDialogOpen] = useState(false);
  const [copyFallbackUrl, setCopyFallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = useCallback(
    (value: string | null | undefined) => {
      if (!value) return t("common.notAvailable");
      return formatter.dateTime(new Date(value), {
        dateStyle: "medium",
        timeStyle: "short",
      });
    },
    [formatter, t],
  );

  const loadList = useCallback(async () => {
    const [releaseList, status, links] = await Promise.all([
      listProjectReleases(token, projectId),
      getProjectReleaseDocumentationStatus(token, projectId),
      listReleaseShareLinks(token, projectId).catch(() => []),
    ]);
    setReleases(releaseList);
    setDocumentationStatus(status);
    setShareLinks(links);
    return releaseList;
  }, [projectId, token]);

  const loadRelease = useCallback(
    async (releaseId: string) => {
      const release = await getProjectRelease(token, projectId, releaseId);
      setSelectedRelease(release);
      setEditingName(release.name ?? "");
      return release;
    },
    [projectId, token],
  );

  const refreshAll = useCallback(
    async (releaseId?: string | null) => {
      setError(null);
      setIsLoading(true);
      try {
        const releaseList = await loadList();
        const nextId = releaseId ?? selectedRelease?.id ?? releaseList[0]?.id ?? null;
        if (nextId) {
          await loadRelease(nextId);
        } else {
          setSelectedRelease(null);
        }
      } catch (err) {
        setError(resolveErrorMessage(err, t("messages.loadError")));
      } finally {
        setIsLoading(false);
      }
    },
    [loadList, loadRelease, selectedRelease?.id, t],
  );

  useEffect(() => {
    void refreshAll(null);
  }, [refreshAll]);

  useEffect(() => {
    setPreview(null);
    setNotes(null);
    setNotesDraft("");
    setViewMode("items");
  }, [selectedRelease?.id]);

  useEffect(() => {
    if (!selectedRelease) return;
    let cancelled = false;
    setIsPreviewLoading(true);
    getProjectReleasePreview(token, projectId, selectedRelease.id)
      .then((nextPreview) => {
        if (!cancelled) setPreview(nextPreview);
      })
      .catch((err) => {
        if (!cancelled) setError(resolveErrorMessage(err, t("messages.previewError")));
      })
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedRelease, t, token]);

  const selectedListItem = useMemo(
    () => releases.find((release) => release.id === selectedRelease?.id) ?? null,
    [releases, selectedRelease?.id],
  );

  const canEditRelease = canManageQa && selectedRelease?.status !== "RELEASED";
  const hasBlockingWarnings =
    documentationStatus?.hasMissingPublishedVersions ||
    documentationStatus?.hasPendingChanges;
  const shouldShowDocumentationStatus =
    selectedRelease?.status !== "RELEASED" && Boolean(hasBlockingWarnings);

  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setError(null);
    setIsBusy(true);
    try {
      await action();
    } catch (err) {
      setError(await resolveReleaseError(err, fallbackMessage));
    } finally {
      setIsBusy(false);
    }
  }

  const handleCreate = () =>
    runAction(async () => {
      const release = await createProjectRelease(token, projectId);
      await refreshAll(release.id);
    }, t("messages.createError"));

  const handleSelectRelease = (releaseId: string) =>
    runAction(async () => {
      await loadRelease(releaseId);
    }, t("messages.loadError"));

  const handleSaveName = () =>
    selectedRelease &&
    runAction(async () => {
      const release = await updateProjectRelease(token, projectId, selectedRelease.id, {
        name: editingName.trim() || undefined,
      });
      setSelectedRelease(release);
      await loadList();
    }, t("messages.saveError"));

  const handlePrepare = () =>
    selectedRelease &&
    runAction(async () => {
      const result = await prepareProjectRelease(token, projectId, selectedRelease.id);
      setSelectedRelease(result.release);
      setDocumentationStatus(result.documentationStatus);
      setEditingName(result.release.name ?? "");
      await loadList();
    }, t("messages.prepareError"));

  const handleMoveToDraft = () =>
    selectedRelease &&
    runAction(async () => {
      const release = await updateProjectRelease(token, projectId, selectedRelease.id, {
        status: "DRAFT",
      });
      const freshStatus = await getProjectReleaseDocumentationStatus(token, projectId);
      setSelectedRelease(release);
      setDocumentationStatus(freshStatus);
      setEditingName(release.name ?? "");
      await loadList();
    }, t("messages.moveToDraftError"));

  const handleDeleteRelease = () =>
    selectedRelease &&
    runAction(async () => {
      await deleteProjectRelease(token, projectId, selectedRelease.id);
      setDeleteDialogOpen(false);
      setSelectedRelease(null);
      setNotes(null);
      setNotesDraft("");
      setViewMode("items");
      const releaseList = await loadList();
      if (releaseList[0]) await loadRelease(releaseList[0].id);
    }, t("messages.deleteError", { default: "We couldn't delete the release." }));

  const handleRelease = () =>
    selectedRelease &&
    runAction(async () => {
      const freshStatus = await getProjectReleaseDocumentationStatus(token, projectId);
      setDocumentationStatus(freshStatus);
      const release = await releaseProjectRelease(token, projectId, selectedRelease.id);
      setSelectedRelease(release);
      setEditingName(release.name ?? "");
      await loadList();
    }, t("messages.releaseError"));

  const handleLoadNotes = () =>
    selectedRelease &&
    runAction(async () => {
      const nextNotes = await getProjectReleaseNotes(token, projectId, selectedRelease.id);
      const content = markdownishToRichTextHtml(nextNotes.content);
      setNotes({ ...nextNotes, content });
      setNotesDraft(content);
      setViewMode("notes");
    }, t("messages.notesError"));

  const handleSaveNotes = () =>
    selectedRelease &&
    runAction(async () => {
      const nextNotes = await updateProjectReleaseNotes(
        token,
        projectId,
        selectedRelease.id,
        { content: notesDraft },
      );
      setNotes({ ...nextNotes, content: notesDraft });
      setSelectedRelease((current) =>
        current ? { ...current, notesContent: notesDraft } : current,
      );
      await loadList();
    }, t("messages.notesSaveError"));

  const handleGenerateNotes = () =>
    selectedRelease &&
    runAction(async () => {
      const generatedNotes = await generateProjectReleaseNotes(
        token,
        projectId,
        selectedRelease.id,
      );
      const content = markdownishToRichTextHtml(generatedNotes.content);
      setNotes({ ...generatedNotes, content });
      setNotesDraft(content);
      setSelectedRelease((current) =>
        current
          ? {
              ...current,
              notesContent: content,
              notesGeneratedAt: generatedNotes.generatedAt,
            }
          : current,
      );
      await loadList();
      setGenerateNotesDialogOpen(false);
    }, t("messages.notesGenerateError"));

  const requestGenerateNotes = () => {
    if (notesDraft.trim()) {
      setGenerateNotesDialogOpen(true);
      return;
    }
    handleGenerateNotes();
  };

  const handleCreateShareLink = () =>
    runShareAction(async () => {
      const link = await createReleaseShareLink(token, projectId);
      setShareLinks((current) => [link, ...current]);
    });

  const handleDeleteShareLink = (linkId: string) =>
    runShareAction(async () => {
      await deleteReleaseShareLink(token, projectId, linkId);
      setShareLinks((current) => current.filter((link) => link.id !== linkId));
    });

  async function runShareAction(action: () => Promise<void>) {
    setError(null);
    setIsShareBusy(true);
    try {
      await action();
    } catch (err) {
      setError(resolveErrorMessage(err, t("messages.shareLinkError")));
    } finally {
      setIsShareBusy(false);
    }
  }

  const copyShareUrl = async (link: ReleaseShareLink) => {
    const url = resolvePublicReleaseUrl(link);
    try {
      await navigator.clipboard.writeText(url);
      setCopyFallbackUrl(null);
    } catch {
      setCopyFallbackUrl(url);
    }
  };

  return (
    <div
      className={cn(
        "grid gap-4 transition-[grid-template-columns] duration-200",
        isReleasePanelOpen
          ? "xl:grid-cols-[minmax(260px,340px)_1fr]"
          : "xl:grid-cols-[64px_1fr]",
      )}
    >
      <section
        className={cn(
          "rounded-lg border border-border bg-background",
          isReleasePanelOpen ? "space-y-4 p-4" : "p-2",
        )}
      >
        {isReleasePanelOpen ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t("list.title")}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canManageQa && (
                  <>
                    <button
                      type="button"
                      className={actionButtonClass({
                        size: "xs",
                        className: "h-8 w-8 justify-center px-0",
                      })}
                      onClick={() => setIsSharePanelOpen((current) => !current)}
                      aria-label={t("share.title")}
                      title={t("share.title")}
                      aria-expanded={isSharePanelOpen}
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={actionButtonClass({
                        size: "xs",
                        className: "h-8 w-8 justify-center px-0",
                      })}
                      onClick={handleCreate}
                      disabled={isBusy}
                      aria-label={t("actions.create")}
                      title={t("actions.create")}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={actionButtonClass({
                    variant: "neutral",
                    size: "xs",
                    className: "h-8 w-8 justify-center px-0",
                  })}
                  onClick={() => void refreshAll(selectedRelease?.id)}
                  disabled={isBusy || isLoading}
                  aria-label={t("actions.refresh")}
                  title={t("actions.refresh")}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => setIsReleasePanelOpen(false)}
                  aria-label={t("actions.collapse")}
                  title={t("actions.collapse")}
                  aria-expanded
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            {canManageQa && (
              <>
                {isSharePanelOpen && (
                  <ReleaseShareLinksPanel
                    links={shareLinks}
                    isBusy={isShareBusy}
                    copyFallbackUrl={copyFallbackUrl}
                    onCreate={handleCreateShareLink}
                    onCopy={copyShareUrl}
                    onDelete={handleDeleteShareLink}
                    onClose={() => setIsSharePanelOpen(false)}
                  />
                )}
              </>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t("messages.loading")}</p>
              ) : releases.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {t("list.empty")}
                </p>
              ) : (
                releases.map((release) => (
                  <button
                    key={release.id}
                    type="button"
                    onClick={() => handleSelectRelease(release.id)}
                    className={cn(
                      "w-full rounded-md border p-3 text-left transition hover:border-primary/60 hover:bg-muted/30",
                      selectedRelease?.id === release.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {t("common.version", { version: release.versionNumber })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {release.name || t("common.unnamed")}
                        </p>
                      </div>
                      <StatusBadge status={release.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{t("list.itemCount", { count: release.documentationItemCount })}</span>
                      <span>{t("list.updated", { date: formatDate(release.updatedAt) })}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center gap-3">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => setIsReleasePanelOpen(true)}
              aria-label={t("actions.expand")}
              title={t("actions.expand")}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex flex-1 items-center justify-center">
              <div className="-rotate-90 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("list.collapsedLabel", {
                  count: releases.length,
                  version: selectedRelease?.versionNumber ?? "-",
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-4 rounded-lg border border-border bg-background p-4">
        {!selectedRelease ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            {t("detail.empty")}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {t("common.version", { version: selectedRelease.versionNumber })}
                  </h2>
                  <StatusBadge status={selectedRelease.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedListItem?.name || selectedRelease.name || t("common.unnamed")}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{t("detail.created", { date: formatDate(selectedRelease.createdAt) })}</span>
                  <span>{t("detail.updated", { date: formatDate(selectedRelease.updatedAt) })}</span>
                  {selectedRelease.preparedAt && (
                    <span>{t("detail.prepared", { date: formatDate(selectedRelease.preparedAt) })}</span>
                  )}
                  {selectedRelease.releasedAt && (
                    <span>{t("detail.released", { date: formatDate(selectedRelease.releasedAt) })}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canManageQa && selectedRelease.status === "DRAFT" && (
                  <>
                    <button
                      type="button"
                      className={actionButtonClass({
                        variant: "destructive",
                        size: "sm",
                        className:
                          "border-red-700 bg-red-600 text-white hover:border-red-700 hover:bg-red-700",
                      })}
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={isBusy}
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                      {t("actions.delete", { default: "Delete" })}
                    </button>
                    <button
                      type="button"
                      className={actionButtonClass({ size: "sm" })}
                      onClick={handlePrepare}
                      disabled={isBusy}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                      {t("actions.prepare")}
                    </button>
                  </>
                )}
                {canManageQa && selectedRelease.status === "PREPARED" && (
                  <>
                    <button
                      type="button"
                      className={actionButtonClass({ variant: "neutral", size: "sm" })}
                      onClick={handleMoveToDraft}
                      disabled={isBusy}
                    >
                      <Pencil className="mr-2 h-4 w-4" aria-hidden />
                      {t("actions.moveToDraft")}
                    </button>
                    <button
                      type="button"
                      className={actionButtonClass({ size: "sm" })}
                      onClick={handleRelease}
                      disabled={isBusy}
                    >
                      <Rocket className="mr-2 h-4 w-4" aria-hidden />
                      {t("actions.release")}
                    </button>
                  </>
                )}
              </div>
            </div>

            {canEditRelease && (
              <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="release-edit-name">
                  {t("detail.nameLabel")}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="release-edit-name"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="min-h-9 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    className={actionButtonClass({ size: "sm" })}
                    onClick={handleSaveName}
                    disabled={isBusy}
                  >
                    <Save className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.save")}
                  </button>
                </div>
              </div>
            )}

            {documentationStatus && shouldShowDocumentationStatus && (
              <DocumentationStatusPanel status={documentationStatus} projectId={projectId} />
            )}

            <div className="flex flex-wrap gap-2">
              <ModeButton
                label={t("detail.tabs.items")}
                isActive={viewMode === "items"}
                onClick={() => setViewMode("items")}
              />
              <ModeButton
                label={t("detail.tabs.notes")}
                isActive={viewMode === "notes"}
                onClick={handleLoadNotes}
              />
            </div>

            {viewMode === "items" && (
              <SnapshotItems
                items={selectedRelease.documentationItems}
                preview={preview}
                projectId={projectId}
                token={token}
                isLoading={isPreviewLoading}
              />
            )}

            {viewMode === "notes" && (
              <ReleaseNotesPanel
                notes={notes}
                notesDraft={notesDraft}
                setNotesDraft={setNotesDraft}
                releaseStatus={selectedRelease.status}
                canEditNotes={canManageQa}
                canGenerateNotes={canManageQa}
                isBusy={isBusy}
                onSave={handleSaveNotes}
                onGenerate={requestGenerateNotes}
                formatDate={formatDate}
              />
            )}

            <Dialog
              open={generateNotesDialogOpen}
              onOpenChange={setGenerateNotesDialogOpen}
            >
              <DialogContent className="m-4 max-w-md rounded-2xl bg-background p-6 shadow-lg">
                <DialogHeading className="text-lg font-semibold">
                  {t("notes.generateTitle")}
                </DialogHeading>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t("notes.generateConfirm")}
                </DialogDescription>
                <div className="mt-5 flex justify-end gap-2">
                  <DialogClose>{t("actions.cancel")}</DialogClose>
                  <button
                    type="button"
                    className={actionButtonClass({ variant: "neutral" })}
                    onClick={handleGenerateNotes}
                    disabled={isBusy}
                  >
                    <Wand2 className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.generateNotes")}
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className="m-4 max-w-md rounded-2xl bg-background p-6 shadow-lg">
                <DialogHeading className="text-lg font-semibold">
                  {t("detail.deleteTitle")}
                </DialogHeading>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t("detail.deleteConfirm", { default: "Delete this draft release?" })}
                </DialogDescription>
                <div className="mt-5 flex justify-end gap-2">
                  <DialogClose>{t("actions.cancel")}</DialogClose>
                  <button
                    type="button"
                    className={actionButtonClass({
                      variant: "destructive",
                      className:
                        "border-red-700 bg-red-600 text-white hover:border-red-700 hover:bg-red-700",
                    })}
                    onClick={handleDeleteRelease}
                    disabled={isBusy}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.delete", { default: "Delete" })}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </section>
    </div>
  );
}

function DocumentationStatusPanel({
  status,
  projectId,
  compact = false,
}: {
  status: DocumentationStatus;
  projectId: string;
  compact?: boolean;
}) {
  const t = useTranslations("app.projects.releases");
  const isReady = !status.hasMissingPublishedVersions && !status.hasPendingChanges;

  return (
    <div
      className={cn(
        "rounded-md border p-3",
        isReady
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-yellow-200 bg-yellow-50 text-yellow-950",
      )}
    >
      <div className="flex items-start gap-2">
        {isReady ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {isReady ? t("readiness.readyTitle") : t("readiness.warningTitle")}
          </p>
          <p className="text-xs">
            {isReady
              ? t("readiness.readyDescription", { count: status.entityCount })
              : t("readiness.warningDescription")}
          </p>
        </div>
      </div>

      {!compact && !isReady && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <ReadinessList
            title={t("readiness.missingTitle")}
            empty={t("readiness.noMissing")}
            items={status.missingPublishedVersions.map((item) => ({
              key: `${item.entityType}-${item.entityId}`,
              href: entityHref(projectId, item.entityType, item.entityId),
              title: item.entityName,
              meta: t(`entityType.${item.entityType}`),
            }))}
          />
          <ReadinessList
            title={t("readiness.pendingTitle")}
            empty={t("readiness.noPending")}
            items={status.pendingChanges.map((item) => ({
              key: `${item.entityType}-${item.entityId}`,
              href: entityHref(projectId, item.entityType, item.entityId),
              title: item.entityName,
              meta: t("readiness.pendingMeta", {
                draft: item.draftVersionNumber,
                base: item.baseVersionNumber ?? t("common.notAvailable"),
              }),
              labels: item.changedLabels.map((label) =>
                t("readiness.labelChange", {
                  label: label.labelName,
                  change: t(`changeType.${label.changeType}`),
                }),
              ),
            }))}
          />
        </div>
      )}
    </div>
  );
}

function ReadinessList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{
    key: string;
    href: string;
    title: string;
    meta: string;
    labels?: string[];
  }>;
}) {
  return (
    <div className="rounded-md border border-current/20 bg-background/70 p-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs opacity-80">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.key} className="text-xs">
              <Link className="font-medium underline-offset-2 hover:underline" href={item.href}>
                {item.title}
              </Link>
              <p className="opacity-80">{item.meta}</p>
              {item.labels && item.labels.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-current/20 px-2 py-0.5"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SnapshotItems({
  items,
  preview,
  projectId,
  token,
  isLoading,
}: {
  items: ReleaseDetail["documentationItems"];
  preview: ReleasePreview | null;
  projectId: string;
  token: string;
  isLoading: boolean;
}) {
  const t = useTranslations("app.projects.releases");

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t("items.empty")}
      </p>
    );
  }

  const changesByEntity = new Map(
    (preview?.changes ?? []).map((change) => [
      entityKey(change.entityType, change.entityId),
      change,
    ]),
  );
  const changedItems = items.filter((item) =>
    changesByEntity.has(entityKey(item.entityType, item.entityId)),
  );
  const unchangedItems = items.filter(
    (item) => !changesByEntity.has(entityKey(item.entityType, item.entityId)),
  );
  const removedChanges = (preview?.changes ?? []).filter(
    (change) =>
      !items.some(
        (item) =>
          item.entityType === change.entityType && item.entityId === change.entityId,
      ),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
        <p className="font-medium">
          {isLoading
            ? t("messages.loading")
            : preview?.previousRelease
              ? t("preview.comparing", {
                  previous: preview.previousRelease.versionNumber,
                  current: preview.release.versionNumber,
                })
              : t("preview.firstRelease")}
        </p>
      </div>

      <SnapshotGroup
        title={t("items.changedGroup", {
          count: changedItems.length + removedChanges.length,
        })}
        empty={isLoading ? t("messages.loading") : t("items.noChanged")}
      >
        {changedItems.map((item) => {
          const change = changesByEntity.get(entityKey(item.entityType, item.entityId));
          if (!change) return null;
          return (
            <ChangedSnapshotItem
              key={item.id}
              item={item}
              change={change}
              projectId={projectId}
              token={token}
            />
          );
        })}
        {removedChanges.map((change) => (
          <ChangedSnapshotItem
            key={entityKey(change.entityType, change.entityId)}
            change={change}
            projectId={projectId}
            token={token}
          />
        ))}
      </SnapshotGroup>

      <SnapshotGroup
        title={t("items.unchangedGroup", { count: unchangedItems.length })}
        empty={t("items.noUnchanged")}
      >
        {unchangedItems.map((item) => (
          <UnchangedSnapshotItem
            key={item.id}
            item={item}
            projectId={projectId}
          />
        ))}
      </SnapshotGroup>
    </div>
  );
}

function ReleaseShareLinksPanel({
  links,
  isBusy,
  copyFallbackUrl,
  onCreate,
  onCopy,
  onDelete,
  onClose,
}: {
  links: ReleaseShareLink[];
  isBusy: boolean;
  copyFallbackUrl: string | null;
  onCreate: () => void;
  onCopy: (link: ReleaseShareLink) => void;
  onDelete: (linkId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("app.projects.releases");

  return (
    <div className="grid w-full max-w-full gap-3 overflow-hidden rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{t("share.title")}</p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={actionButtonClass({
              size: "xs",
              className: "h-8 w-8 shrink-0 justify-center px-0",
            })}
            onClick={onCreate}
            disabled={isBusy}
            aria-label={t("share.create")}
            title={t("share.create")}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label={t("actions.collapse")}
            title={t("actions.collapse")}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          {t("share.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="w-full max-w-full overflow-hidden rounded-md border border-border bg-background p-2">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {resolvePublicReleaseUrl(link)}
                </p>
                <button
                  type="button"
                  className={actionButtonClass({
                    variant: "neutral",
                    size: "xs",
                    className: "h-8 w-8 shrink-0 justify-center px-0",
                  })}
                  onClick={() => onCopy(link)}
                  disabled={isBusy}
                  aria-label={t("share.copy")}
                  title={t("share.copy")}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={actionButtonClass({
                    variant: "destructive",
                    size: "xs",
                    className: "h-8 w-8 shrink-0 justify-center px-0",
                  })}
                  onClick={() => onDelete(link.id)}
                  disabled={isBusy}
                  aria-label={t("share.revoke")}
                  title={t("share.revoke")}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {copyFallbackUrl ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-950">
          <p className="font-medium">{t("share.copyFallback")}</p>
          <p className="mt-1 break-all font-mono">{copyFallbackUrl}</p>
        </div>
      ) : null}
    </div>
  );
}

function resolvePublicReleaseUrl(link: ReleaseShareLink) {
  const token = link.token || link.url.split("/").filter(Boolean).at(-1) || "";
  if (typeof window === "undefined") return `/public/releases/links/${token}`;
  return new URL(`/public/releases/links/${token}`, window.location.origin).toString();
}

function SnapshotGroup({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children);

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {hasChildren ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

function ChangedSnapshotItem({
  item,
  change,
  projectId,
  token,
}: {
  item?: ReleaseDetail["documentationItems"][number];
  change: ReleasePreview["changes"][number];
  projectId: string;
  token: string;
}) {
  const t = useTranslations("app.projects.releases");
  const entityType = item?.entityType ?? change.entityType;
  const entityId = item?.entityId ?? change.entityId;
  const entityName = item?.entityName ?? change.entityName ?? entityId;
  const [changelogState, setChangelogState] = useState<{
    status: "idle" | "loading" | "loaded" | "error";
    previous: QaDocumentationVersionContent | null;
    current: QaDocumentationVersionContent | null;
  }>({ status: "idle", previous: null, current: null });

  const loadChangelogs = useCallback(async () => {
    setChangelogState((current) =>
      current.status === "idle"
        ? { ...current, status: "loading" }
        : current,
    );
    try {
      const documentationEntityType = releaseEntityToDocumentationEntity(entityType);
      const [previous, current] = await Promise.all([
        change.previousVersionNumber
          ? getDocumentationVersion(
              token,
              documentationEntityType,
              entityId,
              change.previousVersionNumber,
            )
          : Promise.resolve(null),
        change.currentVersionNumber
          ? getDocumentationVersion(
              token,
              documentationEntityType,
              entityId,
              change.currentVersionNumber,
            )
          : Promise.resolve(null),
      ]);
      setChangelogState({ status: "loaded", previous, current });
    } catch {
      setChangelogState({ status: "error", previous: null, current: null });
    }
  }, [
    change.currentVersionNumber,
    change.previousVersionNumber,
    entityId,
    entityType,
    token,
  ]);

  return (
    <details
      className="group rounded-md border border-border bg-background"
      onToggle={(event) => {
        if (event.currentTarget.open && changelogState.status === "idle") {
          void loadChangelogs();
        }
      }}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            className="font-semibold text-primary underline-offset-2 hover:underline"
            href={entityHref(projectId, entityType, entityId)}
            onClick={(event) => event.stopPropagation()}
          >
            {entityName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {t(`entityType.${entityType}`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <ChangeBadge changeType={change.changeType} />
          <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">
            {t("preview.versionChange", {
              before: change.previousVersionNumber ?? t("common.notAvailable"),
              after: change.currentVersionNumber ?? t("common.notAvailable"),
            })}
          </span>
        </div>
      </summary>
      <div className="divide-y divide-border border-t border-border">
        <div className="grid gap-3 p-3 lg:grid-cols-2">
          {changelogState.status === "loading" ? (
            <p className="text-sm text-muted-foreground lg:col-span-2">
              {t("preview.loadingChangelogs")}
            </p>
          ) : changelogState.status === "error" ? (
            <p className="text-sm text-red-700 lg:col-span-2">
              {t("preview.changelogLoadError")}
            </p>
          ) : (
            <>
              <DocumentationVersionChangelog
                title={t("preview.previousChangelog")}
                version={change.previousVersionNumber}
                changelog={changelogState.previous?.changelog ?? null}
              />
              <DocumentationVersionChangelog
                title={t("preview.newChangelog")}
                version={change.currentVersionNumber}
                changelog={changelogState.current?.changelog ?? null}
              />
            </>
          )}
        </div>
        {change.changedLabels.map((label) => (
          <div key={label.labelId} className="grid gap-3 p-3 lg:grid-cols-[180px_1fr_1fr]">
            <div>
              <p className="font-medium">{label.labelName}</p>
              <ChangeBadge changeType={label.changeType} />
            </div>
            <DiffContent title={t("preview.before")} value={label.before} />
            <DiffContent title={t("preview.after")} value={label.after} />
          </div>
        ))}
      </div>
    </details>
  );
}

function DocumentationVersionChangelog({
  title,
  version,
  changelog,
}: {
  title: string;
  version: number | null;
  changelog: string | null;
}) {
  const t = useTranslations("app.projects.releases");

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {title}
        </p>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {version
            ? t("items.snapshotVersion", { version })
            : t("common.notAvailable")}
        </span>
      </div>
      <RichTextPreview
        value={changelog}
        emptyLabel={t("preview.noContent")}
        className="text-sm"
      />
    </div>
  );
}

function UnchangedSnapshotItem({
  item,
  projectId,
}: {
  item: ReleaseDetail["documentationItems"][number];
  projectId: string;
}) {
  const t = useTranslations("app.projects.releases");

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div>
        <Link
          className="font-medium text-primary underline-offset-2 hover:underline"
          href={entityHref(projectId, item.entityType, item.entityId)}
        >
          {item.entityName || item.entityId}
        </Link>
        <p className="text-xs text-muted-foreground">
          {t(`entityType.${item.entityType}`)}
        </p>
      </div>
    </div>
  );
}

function entityKey(entityType: ReleaseEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

function releaseEntityToDocumentationEntity(entityType: ReleaseEntityType) {
  if (entityType === "PROJECT") return "project";
  if (entityType === "MODULE") return "module";
  return "feature";
}

function DiffContent({
  title,
  value,
}: {
  title: string;
  value: { content: string | null; isNotApplicable: boolean } | null;
}) {
  const t = useTranslations("app.projects.releases");
  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-3">
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{title}</p>
      {!value ? (
        <p className="text-sm text-muted-foreground">{t("preview.noContent")}</p>
      ) : value.isNotApplicable ? (
        <p className="text-sm text-muted-foreground">{t("preview.notApplicable")}</p>
      ) : (
        <RichTextPreview
          value={value.content}
          emptyLabel={t("preview.noContent")}
          className="text-sm"
        />
      )}
    </div>
  );
}

function ReleaseNotesPanel({
  notes,
  notesDraft,
  setNotesDraft,
  releaseStatus,
  canEditNotes,
  canGenerateNotes,
  isBusy,
  onSave,
  onGenerate,
  formatDate,
}: {
  notes: ReleaseNotes | null;
  notesDraft: string;
  setNotesDraft: (value: string) => void;
  releaseStatus: ReleaseStatus;
  canEditNotes: boolean;
  canGenerateNotes: boolean;
  isBusy: boolean;
  onSave: () => void;
  onGenerate: () => void;
  formatDate: (value: string | null | undefined) => string;
}) {
  const t = useTranslations("app.projects.releases");
  const tRichText = useTranslations("app.projects.form.richText");
  const [isEditing, setIsEditing] = useState(false);
  const toolbarLabels = {
    bold: tRichText("bold"),
    italic: tRichText("italic"),
    underline: tRichText("underline"),
    code: tRichText("code"),
    bulletList: tRichText("bulletList"),
    orderedList: tRichText("orderedList"),
    clear: tRichText("clear"),
  };

  if (!notes) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t("notes.notLoaded")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground">
          <p>{t("notes.updated", { date: formatDate(notes.updatedAt) })}</p>
        </div>
        {(canEditNotes || canGenerateNotes) && (
          <div className="flex flex-wrap gap-2">
            {!isEditing && canEditNotes && (
              <button
                type="button"
                className={actionButtonClass({ variant: "neutral", size: "sm" })}
                onClick={() => setIsEditing(true)}
                disabled={isBusy}
              >
                <Pencil className="mr-2 h-4 w-4" aria-hidden />
                {t("actions.editChangelog")}
              </button>
            )}
            {isEditing && (
              <>
                {canGenerateNotes && (
                  <button
                    type="button"
                    className={actionButtonClass({ variant: "neutral", size: "xs" })}
                    onClick={onGenerate}
                    disabled={isBusy}
                  >
                    <Wand2 className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.generateNotes")}
                  </button>
                )}
                <button
                  type="button"
                  className={actionButtonClass({ variant: "neutral", size: "sm" })}
                  onClick={() => {
                    setNotesDraft(notes.content ?? "");
                    setIsEditing(false);
                  }}
                  disabled={isBusy}
                >
                  <X className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.cancel")}
                </button>
                <button
                  type="button"
                  className={actionButtonClass({ size: "sm" })}
                  onClick={() => {
                    onSave();
                    setIsEditing(false);
                  }}
                  disabled={isBusy}
                >
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.saveNotes")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {isEditing && releaseStatus === "RELEASED" ? (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t("notes.releasedEditWarning")}</p>
        </div>
      ) : null}
      {canEditNotes && isEditing ? (
        <RichTextEditor
          key={notes.releaseId}
          name="release-notes"
          label={t("notes.editorLabel")}
          placeholder={t("notes.placeholder")}
          defaultValue={notes.content ?? ""}
          labels={toolbarLabels}
          onValueChange={setNotesDraft}
          helperText={tRichText("helper")}
        />
      ) : (
        <div className="rounded-md border border-border bg-background p-3">
          <RichTextPreview
            value={notesDraft}
            emptyLabel={t("preview.noContent")}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ReleaseStatus }) {
  const t = useTranslations("app.projects.releases");
  const tone =
    status === "RELEASED"
      ? "border-green-200 bg-green-100 text-green-800"
      : status === "PREPARED"
        ? "border-blue-200 bg-blue-100 text-blue-800"
        : "border-yellow-200 bg-yellow-100 text-yellow-800";

  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", tone)}>
      {t(`status.${status}`)}
    </span>
  );
}

function ChangeBadge({ changeType }: { changeType: ReleaseChangeType }) {
  const t = useTranslations("app.projects.releases");
  const tone =
    changeType === "added"
      ? "border-green-200 bg-green-50 text-green-800"
      : changeType === "removed"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", tone)}>
      {t(`changeType.${changeType}`)}
    </span>
  );
}

function ModeButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition",
        isActive
          ? "bg-blue-100 text-blue-700 shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
      )}
    >
      {label}
    </button>
  );
}

function entityHref(
  projectId: string,
  entityType: ReleaseEntityType,
  entityId: string,
) {
  if (entityType === "MODULE") {
    return `/app/projects/${projectId}/modules/${entityId}`;
  }
  if (entityType === "FEATURE") {
    return `/app/projects/${projectId}/features/${entityId}`;
  }
  return `/app/projects/${projectId}`;
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function resolveReleaseError(error: unknown, fallback: string) {
  if (error instanceof Response && error.status === 409) {
    const payload = (await error.json().catch(() => null)) as ReleaseConflictPayload | null;
    if (payload && typeof payload.message === "object") {
      const status = payload.message.documentationStatus;
      if (status) {
        const missing = status.missingPublishedVersions.length;
        const pending = status.pendingChanges.length;
        return `${payload.message.message ?? fallback} Missing: ${missing}. Pending: ${pending}.`;
      }
    }
  }
  return resolveErrorMessage(error, fallback);
}
