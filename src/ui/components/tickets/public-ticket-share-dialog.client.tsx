"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link2, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createTicketShareLink,
  listTicketShareLinks,
  refreshTicketShareLink,
  revokeTicketShareLink,
  type TicketShareLink,
} from "@/lib/api/ticket-share-links";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeading,
} from "@/ui/components/dialog/dialog";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PublicTicketShareDialog({
  token,
  projectId,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("app.tickets.publicShare");
  const format = useFormatter();
  const [links, setLinks] = useState<TicketShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listTicketShareLinks(token, projectId);
      setLinks(res.items ?? []);
    } catch (error) {
      toast.error(t("loadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    if (!open) return;
    void loadLinks();
  }, [loadLinks, open]);

  const handleCreate = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await createTicketShareLink(token, projectId);
      toast.success(t("created"));
      await loadLinks();
    } catch (error) {
      toast.error(t("createError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, loadLinks, projectId, t, token]);

  const handleRefresh = useCallback(
    async (linkId: string) => {
      if (refreshingId) return;
      setRefreshingId(linkId);
      try {
        await refreshTicketShareLink(token, projectId, linkId);
        toast.success(t("refreshed"));
        await loadLinks();
      } catch (error) {
        toast.error(t("refreshError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setRefreshingId(null);
      }
    },
    [loadLinks, projectId, refreshingId, t, token]
  );

  const handleRevoke = useCallback(
    async (linkId: string) => {
      if (revokingId) return;
      setRevokingId(linkId);
      try {
        await revokeTicketShareLink(token, projectId, linkId);
        toast.success(t("revoked"));
        await loadLinks();
      } catch (error) {
        toast.error(t("revokeError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setRevokingId(null);
      }
    },
    [loadLinks, projectId, revokingId, t, token]
  );

  const handleCopy = useCallback(
    async (link: TicketShareLink) => {
      const shareToken = link.token ?? link.id;
      const url = new URL(
        `/public/tickets/links/${shareToken}`,
        window.location.origin
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
        toast.success(t("copied"));
      } catch (error) {
        console.error("Failed to copy public ticket link", error);
        toast.error(t("copyError"));
      }
    },
    [t]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-4 max-w-2xl rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-lg font-semibold">
          {t("title")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("description")}
        </DialogDescription>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{t("loading")}</span>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleCreate()}
                disabled={isCreating}
              >
                {isCreating ? t("creating") : t("create")}
              </button>
            </div>

            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("linksEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {links.map((link) => {
                  const isRevoked = Boolean(link.revokedAt) || link.active === false;
                  const createdAt = format.dateTime(new Date(link.createdAt), {
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
                          : "border-border bg-background"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{t("linkLabel")}</p>
                          <p className="text-xs text-muted-foreground">
                            {createdAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void handleCopy(link)}
                            disabled={isRevoked}
                          >
                            <Link2 className="h-3.5 w-3.5" aria-hidden />
                            {t("copy")}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void handleRefresh(link.id)}
                            disabled={isRevoked || refreshingId === link.id}
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                            {t("refresh")}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void handleRevoke(link.id)}
                            disabled={isRevoked || revokingId === link.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            {isRevoked ? t("revokedLabel") : t("revoke")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <DialogClose className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("close")}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
