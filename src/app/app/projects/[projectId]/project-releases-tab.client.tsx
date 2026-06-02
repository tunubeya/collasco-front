"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ListChecks,
  RefreshCw,
  Rocket,
  Save,
  Wand2,
} from "lucide-react";

import {
  createProjectRelease,
  generateProjectReleaseNotes,
  getProjectRelease,
  getProjectReleaseDocumentationStatus,
  getProjectReleaseNotes,
  getProjectReleasePreview,
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
  type ReleaseStatus,
} from "@/lib/api/releases";
import { cn } from "@/lib/utils";
import { actionButtonClass } from "@/ui/styles/action-button";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";

type ProjectReleasesTabProps = {
  token: string;
  projectId: string;
  canManageQa: boolean;
};

type ViewMode = "items" | "preview" | "notes";

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
  const [newReleaseName, setNewReleaseName] = useState("");
  const [editingName, setEditingName] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
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
    const [releaseList, status] = await Promise.all([
      listProjectReleases(token, projectId),
      getProjectReleaseDocumentationStatus(token, projectId),
    ]);
    setReleases(releaseList);
    setDocumentationStatus(status);
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

  const selectedListItem = useMemo(
    () => releases.find((release) => release.id === selectedRelease?.id) ?? null,
    [releases, selectedRelease?.id],
  );

  const canEditRelease = canManageQa && selectedRelease?.status !== "RELEASED";
  const canAttemptRelease =
    canManageQa && selectedRelease?.status === "PREPARED";
  const hasBlockingWarnings =
    documentationStatus?.hasMissingPublishedVersions ||
    documentationStatus?.hasPendingChanges;

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
      const release = await createProjectRelease(token, projectId, {
        name: newReleaseName.trim() || undefined,
      });
      setNewReleaseName("");
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

  const handleLoadPreview = () =>
    selectedRelease &&
    runAction(async () => {
      const nextPreview = await getProjectReleasePreview(
        token,
        projectId,
        selectedRelease.id,
      );
      setPreview(nextPreview);
      setViewMode("preview");
    }, t("messages.previewError"));

  const handleLoadNotes = () =>
    selectedRelease &&
    runAction(async () => {
      const nextNotes = await getProjectReleaseNotes(token, projectId, selectedRelease.id);
      setNotes(nextNotes);
      setNotesDraft(nextNotes.content ?? "");
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
      setNotes(nextNotes);
      setSelectedRelease((current) =>
        current ? { ...current, notesContent: nextNotes.content } : current,
      );
      await loadList();
    }, t("messages.notesSaveError"));

  const handleGenerateNotes = () =>
    selectedRelease &&
    runAction(async () => {
      if (notesDraft.trim() && !window.confirm(t("notes.generateConfirm"))) {
        return;
      }
      const nextNotes = await generateProjectReleaseNotes(
        token,
        projectId,
        selectedRelease.id,
      );
      setNotes(nextNotes);
      setNotesDraft(nextNotes.content ?? "");
      setSelectedRelease((current) =>
        current
          ? {
              ...current,
              notesContent: nextNotes.content,
              notesGeneratedAt: nextNotes.generatedAt,
            }
          : current,
      );
      await loadList();
    }, t("messages.notesGenerateError"));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(260px,340px)_1fr]">
      <section className="space-y-4 rounded-lg border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("list.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("list.subtitle")}</p>
          </div>
          <button
            type="button"
            className={actionButtonClass({ variant: "neutral", size: "xs" })}
            onClick={() => void refreshAll(selectedRelease?.id)}
            disabled={isBusy || isLoading}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />
            {t("actions.refresh")}
          </button>
        </div>

        {canManageQa && (
          <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="release-name">
              {t("create.nameLabel")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="release-name"
                value={newReleaseName}
                onChange={(event) => setNewReleaseName(event.target.value)}
                placeholder={t("create.namePlaceholder")}
                className="min-h-9 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                disabled={isBusy}
              />
              <button
                type="button"
                className={actionButtonClass({ size: "sm" })}
                onClick={handleCreate}
                disabled={isBusy}
              >
                <Rocket className="mr-2 h-4 w-4" aria-hidden />
                {t("actions.create")}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {documentationStatus && (
          <DocumentationStatusPanel
            status={documentationStatus}
            projectId={projectId}
            compact
          />
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
                <button
                  type="button"
                  className={actionButtonClass({ variant: "neutral", size: "sm" })}
                  onClick={handleLoadPreview}
                  disabled={isBusy}
                >
                  <ListChecks className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.preview")}
                </button>
                <button
                  type="button"
                  className={actionButtonClass({ variant: "neutral", size: "sm" })}
                  onClick={handleLoadNotes}
                  disabled={isBusy}
                >
                  <FileText className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.notes")}
                </button>
                {canManageQa && selectedRelease.status !== "RELEASED" && (
                  <button
                    type="button"
                    className={actionButtonClass({ variant: "neutral", size: "sm" })}
                    onClick={handlePrepare}
                    disabled={isBusy}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.prepare")}
                  </button>
                )}
                {canAttemptRelease && (
                  <button
                    type="button"
                    className={actionButtonClass({
                      variant: hasBlockingWarnings ? "neutral" : "primary",
                      size: "sm",
                    })}
                    onClick={handleRelease}
                    disabled={isBusy}
                  >
                    <Rocket className="mr-2 h-4 w-4" aria-hidden />
                    {t("actions.release")}
                  </button>
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

            {documentationStatus && (
              <DocumentationStatusPanel status={documentationStatus} projectId={projectId} />
            )}

            <div className="flex flex-wrap gap-2">
              <ModeButton
                label={t("detail.tabs.items")}
                isActive={viewMode === "items"}
                onClick={() => setViewMode("items")}
              />
              <ModeButton
                label={t("detail.tabs.preview")}
                isActive={viewMode === "preview"}
                onClick={handleLoadPreview}
              />
              <ModeButton
                label={t("detail.tabs.notes")}
                isActive={viewMode === "notes"}
                onClick={handleLoadNotes}
              />
            </div>

            {viewMode === "items" && (
              <DocumentationItems
                items={selectedRelease.documentationItems}
                projectId={projectId}
              />
            )}

            {viewMode === "preview" && (
              <ReleasePreviewPanel
                preview={preview}
                projectId={projectId}
                isLoading={isBusy && !preview}
              />
            )}

            {viewMode === "notes" && (
              <ReleaseNotesPanel
                notes={notes}
                notesDraft={notesDraft}
                setNotesDraft={setNotesDraft}
                canManageQa={canManageQa}
                isBusy={isBusy}
                onSave={handleSaveNotes}
                onGenerate={handleGenerateNotes}
                formatDate={formatDate}
              />
            )}
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

function DocumentationItems({
  items,
  projectId,
}: {
  items: ReleaseDetail["documentationItems"];
  projectId: string;
}) {
  const t = useTranslations("app.projects.releases");

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t("items.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("items.entity")}</th>
            <th className="px-3 py-2">{t("items.type")}</th>
            <th className="px-3 py-2">{t("items.version")}</th>
            <th className="px-3 py-2">{t("items.publishedAt")}</th>
            <th className="px-3 py-2">{t("items.changelog")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2">
                <Link
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  href={entityHref(projectId, item.entityType, item.entityId)}
                >
                  {item.entityName || item.entityId}
                </Link>
              </td>
              <td className="px-3 py-2">{t(`entityType.${item.entityType}`)}</td>
              <td className="px-3 py-2">
                {t("common.version", {
                  version: item.documentationVersion.versionNumber,
                })}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {item.documentationVersion.publishedAt
                  ? new Date(item.documentationVersion.publishedAt).toLocaleDateString()
                  : t("common.notAvailable")}
              </td>
              <td className="min-w-[220px] px-3 py-2 text-muted-foreground">
                {item.documentationVersion.changelog || t("common.notAvailable")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReleasePreviewPanel({
  preview,
  projectId,
  isLoading,
}: {
  preview: ReleasePreview | null;
  projectId: string;
  isLoading: boolean;
}) {
  const t = useTranslations("app.projects.releases");

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("messages.loading")}</p>;
  }

  if (!preview) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t("preview.notLoaded")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
        <p className="font-medium">
          {preview.previousRelease
            ? t("preview.comparing", {
                previous: preview.previousRelease.versionNumber,
                current: preview.release.versionNumber,
              })
            : t("preview.firstRelease")}
        </p>
      </div>

      {preview.changes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("preview.empty")}
        </p>
      ) : (
        preview.changes.map((change) => (
          <article key={`${change.entityType}-${change.entityId}`} className="rounded-md border border-border">
            <header className="flex flex-col gap-2 border-b border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  href={entityHref(projectId, change.entityType, change.entityId)}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {change.entityName || change.entityId}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {t(`entityType.${change.entityType}`)}
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
            </header>
            <div className="divide-y divide-border">
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
          </article>
        ))
      )}
    </div>
  );
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
  canManageQa,
  isBusy,
  onSave,
  onGenerate,
  formatDate,
}: {
  notes: ReleaseNotes | null;
  notesDraft: string;
  setNotesDraft: (value: string) => void;
  canManageQa: boolean;
  isBusy: boolean;
  onSave: () => void;
  onGenerate: () => void;
  formatDate: (value: string | null | undefined) => string;
}) {
  const t = useTranslations("app.projects.releases");

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
          <p>{t("notes.generated", { date: formatDate(notes.generatedAt) })}</p>
        </div>
        {canManageQa && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={actionButtonClass({ variant: "neutral", size: "sm" })}
              onClick={onGenerate}
              disabled={isBusy}
            >
              <Wand2 className="mr-2 h-4 w-4" aria-hidden />
              {t("actions.generateNotes")}
            </button>
            <button
              type="button"
              className={actionButtonClass({ size: "sm" })}
              onClick={onSave}
              disabled={isBusy}
            >
              <Save className="mr-2 h-4 w-4" aria-hidden />
              {t("actions.saveNotes")}
            </button>
          </div>
        )}
      </div>
      <textarea
        value={notesDraft}
        onChange={(event) => setNotesDraft(event.target.value)}
        readOnly={!canManageQa}
        rows={12}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        placeholder={t("notes.placeholder")}
      />
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
        "rounded-full border px-3 py-1 text-sm transition",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:bg-background",
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
