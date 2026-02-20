"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ProjectDocumentationLabelOption } from "@/lib/api/qa";
import { listProjectDocumentationLabels } from "@/lib/api/qa";
import {
  createManualShareLink,
  listManualShareLinks,
  revokeManualShareLink,
  type ManualShareLink,
} from "@/lib/api/manual-share";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeading,
} from "@/ui/components/dialog/dialog";

type ManualShareDialogProps = {
  token: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManualShareDialog({
  token,
  projectId,
  open,
  onOpenChange,
}: ManualShareDialogProps) {
  const tManual = useTranslations("app.projects.manual");
  const tShare = useTranslations("app.projects.manual.share");
  const formatter = useFormatter();
  const [labels, setLabels] = useState<ProjectDocumentationLabelOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [links, setLinks] = useState<ManualShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const orderedLabels = useMemo(
    () => [...labels].sort((a, b) => a.displayOrder - b.displayOrder),
    [labels],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [labelOptions, linkResponse] = await Promise.all([
        listProjectDocumentationLabels(token, projectId),
        listManualShareLinks(token, projectId),
      ]);
      setLabels(labelOptions ?? []);
      setLinks(linkResponse.items ?? []);
    } catch (error) {
      toast.error(tShare("loadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, tShare, token]);

  useEffect(() => {
    if (open) {
      void loadData();
      setComment("");
      setCommentError(null);
    }
  }, [loadData, open]);

  const toggleLabel = useCallback((labelId: string) => {
    setSelectedIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  }, []);

  const createLink = useCallback(async () => {
    if (selectedIds.length === 0 || isCreating) return;
    if (comment.length > 500) {
      setCommentError(tShare("commentError"));
      return;
    }
    setIsCreating(true);
    try {
      await createManualShareLink(token, projectId, selectedIds, comment);
      toast.success(tShare("created"));
      setSelectedIds([]);
      setComment("");
      setCommentError(null);
      await loadData();
    } catch (error) {
      toast.error(tShare("createError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsCreating(false);
    }
  }, [comment, isCreating, loadData, projectId, selectedIds, tShare, token]);

  const revokeLink = useCallback(
    async (linkId: string) => {
      if (revokingId) return;
      setRevokingId(linkId);
      try {
        await revokeManualShareLink(token, projectId, linkId);
        toast.success(tShare("revoked"));
        await loadData();
      } catch (error) {
        toast.error(tShare("revokeError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setRevokingId(null);
      }
    },
    [loadData, projectId, revokingId, tShare, token],
  );

  const copyLink = useCallback(
    async (linkId: string) => {
      const url = new URL(
        `/public/manual/shared/${linkId}`,
        window.location.origin,
      ).toString();
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = url;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        toast.success(tShare("copied"));
      } catch (error) {
        console.error("Failed to copy share link", error);
        toast.error(tShare("copyError"));
      }
    },
    [tShare],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-4 max-w-3xl rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-lg font-semibold">
          {tShare("title")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {tShare("description")}
        </DialogDescription>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{tShare("loading")}</span>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">
                  {tShare("labelsTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tShare("labelsHint")}
                </p>
              </div>
              {orderedLabels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tShare("labelsEmpty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {orderedLabels.map((label) => {
                    const isSelected = selectedIds.includes(label.id);
                    return (
                      <label
                        key={label.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLabel(label.id)}
                          />
                          <span>{label.name}</span>
                          {label.isMandatory ? (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                              {tManual("labelsNavbar.mandatory")}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tShare("commentLabel")}
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  rows={3}
                  maxLength={500}
                  placeholder={tShare("commentPlaceholder")}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{tShare("commentHint")}</span>
                  <span>{comment.length}/500</span>
                </div>
                {commentError && <p className="text-xs text-red-600">{commentError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => createLink()}
                  disabled={selectedIds.length === 0 || isCreating}
                >
                  {isCreating ? tShare("creating") : tShare("create")}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">{tShare("linksTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {tShare("linksHint")}
                </p>
              </div>
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tShare("linksEmpty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => {
                    const isRevoked = Boolean(link.isRevoked || link.revokedAt);
                    const labelNames =
                      link.labels?.map((label) => label.name).join(", ") ??
                      link.labelIds.join(", ");
                    const createdAt = formatter.dateTime(new Date(link.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });
                    return (
                      <div
                        key={link.id}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm",
                          isRevoked
                            ? "border-border/60 bg-muted/40 text-muted-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {labelNames || tShare("labelsFallback")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {createdAt}
                            </p>
                            {link.comment ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {link.comment}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => void copyLink(link.id)}
                              disabled={isRevoked}
                            >
                              <Link2 className="h-3.5 w-3.5" aria-hidden />
                              {tShare("copy")}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => void revokeLink(link.id)}
                              disabled={isRevoked || revokingId === link.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              {isRevoked
                                ? tShare("revokedLabel")
                                : tShare("revoke")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <DialogClose className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            {tShare("close")}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
