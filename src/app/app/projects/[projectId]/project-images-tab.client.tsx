"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import type { ProjectDocumentationImage } from "@/lib/api/qa";
import {
  listProjectDocumentationImagesAll,
  listProjectDocumentationLabels,
} from "@/lib/api/qa";
import { cn } from "@/lib/utils";

const entityTone: Record<string, string> = {
  PROJECT: "border-slate-200 bg-slate-100 text-slate-700",
  MODULE: "border-blue-200 bg-blue-50 text-blue-700",
  FEATURE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

type ProjectImagesTabProps = {
  token: string;
  projectId: string;
};

type ImagesGroup = {
  labelId: string;
  labelName: string;
  images: ProjectDocumentationImage[];
};

export function ProjectImagesTab({ token, projectId }: ProjectImagesTabProps) {
  const t = useTranslations("app.projects.images");
  const formatter = useFormatter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ImagesGroup[]>([]);

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [labelOptions, imagesResponse] = await Promise.all([
        listProjectDocumentationLabels(token, projectId),
        listProjectDocumentationImagesAll(token, projectId),
      ]);
      const safeLabels = labelOptions ?? [];
      const labelMap = new Map(safeLabels.map((label) => [label.id, label.name]));
      const normalized: ImagesGroup[] = (imagesResponse.items ?? []).map(
        (group) => ({
          labelId: group.labelId,
          labelName: labelMap.get(group.labelId) ?? t("labels.unknown"),
          images: group.images ?? [],
        })
      );
      const filtered = normalized.filter((group) => group.images.length > 0);
      setGroups(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("messages.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const getEntityHref = useCallback(
    (image: ProjectDocumentationImage) => {
      if (image.entityType === "PROJECT") {
        return `/app/projects/${projectId}`;
      }
      if (image.entityType === "MODULE") {
        return `/app/projects/${projectId}/modules/${image.entityId}`;
      }
      if (image.entityType === "FEATURE") {
        return `/app/projects/${projectId}/features/${image.entityId}`;
      }
      return null;
    },
    [projectId]
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadImages()}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              {t("actions.loading")}
            </span>
          ) : (
            t("actions.reload")
          )}
        </button>
      </div>

      {isLoading && groups.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("messages.loading")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("messages.loadError")}
        </div>
      ) : null}

      {!isLoading && !error && groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {t("messages.empty")}
        </p>
      ) : null}

      {!error && groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.labelId} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{group.labelName}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t("labels.count", { count: group.images.length })}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.images.map((image) => {
                  const href = getEntityHref(image);
                  const createdBy = image.createdBy?.name?.trim();
                  const createdAt = formatter.dateTime(new Date(image.createdAt), {
                    dateStyle: "medium",
                  });
                  return (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-lg border bg-background"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-40 w-full object-contain"
                        loading="lazy"
                      />
                      <div className="space-y-1 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {image.name}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              entityTone[image.entityType] ??
                                "border-slate-200 bg-slate-100 text-slate-700"
                            )}
                          >
                            {t(`entity.${image.entityType.toLowerCase()}`)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {createdBy
                            ? t("meta.createdByAt", {
                                name: createdBy,
                                date: createdAt,
                              })
                            : t("meta.createdAt", { date: createdAt })}
                        </div>
                        {href ? (
                          <Link
                            href={href}
                            className="text-primary hover:underline"
                          >
                            {t("actions.viewEntity")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
