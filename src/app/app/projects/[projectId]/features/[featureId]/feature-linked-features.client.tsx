"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
  QaLinkedFeature,
  createLinkedFeature,
  deleteLinkedFeature,
  listLinkedFeatures,
  updateLinkedFeature,
} from "@/lib/api/qa";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeading,
  DialogDescription,
} from "@/ui/components/dialog/dialog";
import { actionButtonClass } from "@/ui/styles/action-button";

type LinkedFeaturesPanelProps = {
  token: string;
  featureId: string;
  links: QaLinkedFeature[];
  onLinksChange: (links: QaLinkedFeature[]) => void;
  projectId: string;
  modulePathById: Record<string, string>;
  options: Array<{
    id: string;
    name: string;
    moduleId: string | null;
    moduleName: string | null;
  }>;
};

type LinkedFilter = "all" | "references" | "referenced_by";

export function LinkedFeaturesPanel({
  token,
  featureId,
  links,
  onLinksChange,
  projectId,
  modulePathById,
  options,
}: LinkedFeaturesPanelProps) {
  const t = useTranslations("app.projects.feature.linked");
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QaLinkedFeature | null>(null);
  const [editTargetId, setEditTargetId] = useState("");
  const [editReason, setEditReason] = useState("");
  const [filter, setFilter] = useState<LinkedFilter>("all");
  const initialLoadRef = useRef(true);
  const latestLinksRef = useRef<QaLinkedFeature[]>(links);

  useEffect(() => {
    latestLinksRef.current = links;
  }, [links]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (filter === "all") return;
    startTransition(() => {
      listLinkedFeatures(token, featureId, { direction: filter })
        .then((updated) => {
          const merged = mergeLinkedFeatures(
            latestLinksRef.current,
            updated,
            filter
          );
          onLinksChange(merged);
        })
        .catch((error) => {
          const description =
            error instanceof Error ? error.message : undefined;
          toast.error(t("messages.error"), { description });
        });
    });
  }, [featureId, filter, onLinksChange, startTransition, t, token]);

  const selectableOptions = useMemo(() => {
    return options
      .map((option) => {
        const moduleLabel = option.moduleName ?? t("list.unknownModule");
        const combinedLabel = `${moduleLabel} - ${option.name}`;
        return {
          value: option.id,
          label: combinedLabel,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options, t]);

  const editOptions = useMemo(() => {
    if (!editingLink) return selectableOptions;
    return selectableOptions.filter((option) => option.value !== editingLink.id);
  }, [selectableOptions, editingLink]);

  const displayLinks = useMemo(
    () => applyLinkedFilter(links, filter),
    [links, filter]
  );
  const references = useMemo(
    () => displayLinks.filter((link) => link.direction === "references"),
    [displayLinks]
  );
  const referencedBy = useMemo(
    () => displayLinks.filter((link) => link.direction === "referenced_by"),
    [displayLinks]
  );
  const showReferences =
    filter === "all" ? references.length > 0 : filter === "references";
  const showReferencedBy =
    filter === "all" ? referencedBy.length > 0 : filter === "referenced_by";
  const hasVisibleLinks = showReferences || showReferencedBy;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) {
      toast.error(t("form.errors.targetRequired"));
      return;
    }
    startTransition(() => {
      createLinkedFeature(token, featureId, {
        targetFeatureId: selectedId,
        reason: reason.trim() || undefined,
      })
        .then((updated) => {
          onLinksChange(updated);
          setSelectedId("");
          setReason("");
          setDialogOpen(false);
          toast.success(t("messages.linked"));
        })
        .catch((error) => {
          const description =
            error instanceof Error ? error.message : undefined;
          toast.error(t("messages.error"), { description });
        });
    });
  };

  const openEditDialog = (link: QaLinkedFeature) => {
    setEditingLink(link);
    setEditReason(link.reason ?? "");
    setEditTargetId("");
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingLink(null);
    setEditReason("");
    setEditTargetId("");
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLink) return;

    const payload: { reason?: string | null; targetFeatureId?: string } = {};
    const trimmedReason = editReason.trim();
    const originalReason = editingLink.reason ?? "";

    if (trimmedReason !== originalReason) {
      if (trimmedReason.length > 0) {
        payload.reason = trimmedReason;
      } else if (editingLink.reason) {
        payload.reason = null;
      }
    }

    if (editTargetId && editTargetId !== editingLink.id) {
      payload.targetFeatureId = editTargetId;
    }

    if (!("reason" in payload) && !("targetFeatureId" in payload)) {
      toast.info(t("messages.noChanges"));
      return;
    }

    startTransition(() => {
      updateLinkedFeature(token, featureId, editingLink.id, payload)
        .then((updated) => {
          onLinksChange(updated);
          closeEditDialog();
          toast.success(t("messages.updated"));
        })
        .catch((error) => {
          const description =
            error instanceof Error ? error.message : undefined;
          toast.error(t("messages.error"), { description });
        });
    });
  };

  const handleRemove = (linkedId: string) => {
    startTransition(() => {
      deleteLinkedFeature(token, featureId, linkedId)
        .then((updated) => {
          onLinksChange(updated);
          toast.success(t("messages.removed"));
        })
        .catch((error) => {
          const description =
            error instanceof Error ? error.message : undefined;
          toast.error(t("messages.error"), { description });
        });
    });
  };

  return (
    <>
      <section className="space-y-5">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t("title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>
            <button
              type="button"
              className={actionButtonClass()}
              onClick={() => setDialogOpen(true)}
              disabled={selectableOptions.length === 0 || isPending}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("actions.add")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("list.filters.label")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                disabled={isPending}
              >
                {t("list.filters.all")}
              </Button>
              <Button
                type="button"
                variant={filter === "references" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("references")}
                disabled={isPending}
              >
                {t("list.filters.references")}
              </Button>
              <Button
                type="button"
                variant={filter === "referenced_by" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("referenced_by")}
                disabled={isPending}
              >
                {t("list.filters.referencedBy")}
              </Button>
            </div>
          </div>
          {!hasVisibleLinks ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="space-y-4">
              {showReferences && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("list.groups.references", { count: references.length })}
                  </p>
                  <ul className="space-y-3">
                    {references.map((link) => (
                      <li
                        key={link.id}
                        className="flex flex-col gap-2 rounded-xl border bg-muted/20 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
                      >
                        <Link
                          href={`/app/projects/${projectId}/features/${link.id}`}
                          className="group flex-1"
                          prefetch={false}
                        >
                          <p className="font-semibold text-primary transition group-hover:underline">
                            {link.name}
                          </p>
                          <p className="text-2xs text-muted-foreground">
                            {link.moduleId
                              ? modulePathById[link.moduleId] ??
                                link.moduleName ??
                                t("list.unknownModule")
                              : link.moduleName ?? t("list.unknownModule")}
                          </p>
                          <p className="text-2xs text-muted-foreground">
                            {t("list.direction.references", { name: link.name })}
                          </p>
                          {link.reason ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {link.reason}
                            </p>
                          ) : null}
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(link)}
                          disabled={isPending}
                          className="w-full md:w-auto"
                        >
                          {t("list.edit")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(link.id)}
                          disabled={isPending}
                          className="w-full md:w-auto"
                        >
                          {t("list.remove")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showReferencedBy && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("list.groups.referencedBy", {
                      count: referencedBy.length,
                    })}
                  </p>
                  <ul className="space-y-3">
                    {referencedBy.map((link) => (
                      <li
                        key={link.id}
                        className="flex flex-col gap-2 rounded-xl border bg-muted/20 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
                      >
                        <Link
                          href={`/app/projects/${projectId}/features/${link.id}`}
                          className="group flex-1"
                          prefetch={false}
                        >
                          <p className="font-semibold text-primary transition group-hover:underline">
                            {link.name}
                          </p>
                          <p className="text-2xs text-muted-foreground">
                            {link.moduleId
                              ? modulePathById[link.moduleId] ??
                                link.moduleName ??
                                t("list.unknownModule")
                              : link.moduleName ?? t("list.unknownModule")}
                          </p>
                          <p className="text-2xs text-muted-foreground">
                            {t("list.direction.referencedBy", {
                              name: link.name,
                            })}
                          </p>
                          {link.reason ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {link.reason}
                            </p>
                          ) : null}
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(link)}
                          disabled={isPending}
                          className="w-full md:w-auto"
                        >
                          {t("list.edit")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(link.id)}
                          disabled={isPending}
                          className="w-full md:w-auto"
                        >
                          {t("list.remove")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="m-4 max-w-2xl rounded-2xl bg-background p-6 shadow-xl">
          <DialogHeading>{t("form.title")}</DialogHeading>
          <DialogDescription>{t("form.subtitle")}</DialogDescription>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("form.feature")}
              </label>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isPending || selectableOptions.length === 0}
              >
                <option value="">{t("form.featurePlaceholder")}</option>
                {selectableOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("form.reason")}
              </label>
              <textarea
                rows={3}
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("form.reasonPlaceholder")}
                disabled={isPending}
              />
              <p className="text-2xs text-muted-foreground">
                {t("form.reasonHelp")}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isPending || !selectedId}>
                {t("form.submit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => (open ? setEditDialogOpen(true) : closeEditDialog())}>
        <DialogContent className="m-4 max-w-2xl rounded-2xl bg-background p-6 shadow-xl">
          <DialogHeading>{t("editForm.title")}</DialogHeading>
          <DialogDescription>{t("editForm.subtitle")}</DialogDescription>
          <form className="grid gap-4" onSubmit={handleEditSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("form.feature")}
              </label>
              <select
                value={editTargetId}
                onChange={(event) => setEditTargetId(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isPending || editOptions.length === 0}
              >
                <option value="">
                  {t("editForm.featurePlaceholder", {
                    name: editingLink?.name ?? "",
                  })}
                </option>
                {editOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("form.reason")}
              </label>
              <textarea
                value={editReason}
                onChange={(event) => setEditReason(event.target.value)}
                placeholder={t("form.reasonPlaceholder")}
                maxLength={500}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isPending}
              />
              <p className="text-2xs text-muted-foreground">
                {t("form.reasonHelp")}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={isPending}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t("editForm.submit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function applyLinkedFilter(links: QaLinkedFeature[], filter: LinkedFilter) {
  if (filter === "references") {
    return links.filter((link) => link.direction === "references");
  }
  if (filter === "referenced_by") {
    return links.filter((link) => link.direction === "referenced_by");
  }
  return links;
}

function mergeLinkedFeatures(
  current: QaLinkedFeature[],
  updated: QaLinkedFeature[],
  direction: Exclude<LinkedFilter, "all">
) {
  const normalized = updated.map((link) => ({
    ...link,
    direction: link.direction ?? direction,
  }));
  const remaining = current.filter((link) => link.direction !== direction);
  return [...remaining, ...normalized];
}
