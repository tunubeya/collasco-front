"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
  QaLinkedFeature,
  createLinkedFeature,
  deleteLinkedFeature,
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
  initialLinks: QaLinkedFeature[];
  projectId: string;
  options: Array<{
    id: string;
    name: string;
    moduleId: string | null;
    moduleName: string | null;
  }>;
};

export function LinkedFeaturesPanel({
  token,
  featureId,
  initialLinks,
  projectId,
  options,
}: LinkedFeaturesPanelProps) {
  const t = useTranslations("app.projects.feature.linked");
  const [links, setLinks] = useState<QaLinkedFeature[]>(initialLinks);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectableOptions = useMemo(
    () =>
      options.map((option) => ({
        value: option.id,
        label: option.name,
        description: option.moduleName ?? "",
      })),
    [options]
  );

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
          setLinks(updated);
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

  const handleRemove = (linkedId: string) => {
    startTransition(() => {
      deleteLinkedFeature(token, featureId, linkedId)
        .then((updated) => {
          setLinks(updated);
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
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="space-y-3">
              {links.map((link) => (
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
                      {link.moduleName ?? t("list.unknownModule")}
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      {link.direction === "references"
                        ? t("list.direction.references", { name: link.name })
                        : t("list.direction.referencedBy", { name: link.name })}
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
                    onClick={() => handleRemove(link.id)}
                    disabled={isPending}
                    className="w-full md:w-auto"
                  >
                    {t("list.remove")}
                  </Button>
                </li>
              ))}
            </ul>
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
                    {option.description ? ` — ${option.description}` : ""}
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
    </>
  );
}
