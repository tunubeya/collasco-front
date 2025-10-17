"use client";

import Link from "next/link";
import {
  useFormatter,
  useTranslations,
} from "next-intl";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import type { Project } from "@/lib/model-definitions/project";
import {
  ProjectStatus,
  Visibility,
} from "@/lib/definitions";
import { generatePagination } from "@/lib/utils";


type Pagination = {
  total: number;
  page: number;
  limit: number;
  q?: string;
  sort?: string;
};

type Props = {
  items: Project[];
  pagination: Pagination;
};

export default function ProjectsList({ items, pagination }: Props) {
  const t = useTranslations("app.projects.list");
  const tStatus = useTranslations("app.common.projectStatus");
  const tVisibility = useTranslations("app.common.visibility");
  const format = useFormatter();

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const { total, page, limit, q = "", sort = "" } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(target));
    sp.set("limit", String(limit));
    if (q) sp.set("q", q);
    else sp.delete("q");
    if (sort) sp.set("sort", sort);
    else sp.delete("sort");
    router.push(`${pathname}?${sp.toString()}`);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-background p-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
        <Link
          href="/app/projects/new"
          className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          {t("empty.cta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background">
      <ul className="divide-y">
        {items.map((project) => {
          const formattedUpdatedAt = format.dateTime(
            new Date(project.updatedAt),
            { dateStyle: "medium" }
          );

          return (
            <li key={project.id}>
              <details className="group px-4 py-3">
                <summary className="flex cursor-pointer items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {t("updatedAt", { date: formattedUpdatedAt })}
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <ProjectStatusBadge
                      status={project.status}
                      label={tStatus(project.status)}
                    />
                    <VisibilityBadge
                      visibility={project.visibility}
                      label={tVisibility(project.visibility)}
                    />
                  </div>
                </summary>
                {/* Future expansion: lazy-load modules/features tree */}
              </details>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2 border-t px-4 py-3"
          aria-label={t("pagination.aria")}
        >
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            disabled={page <= 1}
          >
            {t("pagination.previous")}
          </button>
          <ul className="flex items-center gap-1">
            {generatePagination(page, totalPages).map((entry, index) =>
              entry === "..." ? (
                <li
                  key={`ellipsis-${index}`}
                  className="px-2 text-sm text-muted-foreground"
                >
                  &hellip;
                </li>
              ) : (
                <li key={entry}>
                  <button
                    type="button"
                    onClick={() => goToPage(entry as number)}
                    className={[
                      "rounded px-3 py-1 text-sm border transition-colors",
                      entry === page
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    ].join(" ")}
                    aria-current={entry === page ? "page" : undefined}
                  >
                    {entry}
                  </button>
                </li>
              )
            )}
          </ul>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            disabled={page >= totalPages}
          >
            {t("pagination.next")}
          </button>
        </nav>
      )}
    </div>
  );
}

function ProjectStatusBadge({
  status,
  label,
}: {
  status: ProjectStatus;
  label: string;
}) {
  const tone =
    status === ProjectStatus.ACTIVE
      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
      : status === ProjectStatus.FINISHED
      ? "border-blue-200 bg-blue-100 text-blue-800"
      : "border-amber-200 bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>
      {label}
    </span>
  );
}

function VisibilityBadge({
  visibility,
  label,
}: {
  visibility: Visibility;
  label: string;
}) {
  const tone =
    visibility === Visibility.PUBLIC
      ? "border-sky-200 bg-sky-100 text-sky-800"
      : "border-slate-200 bg-slate-100 text-slate-800";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>
      {label}
    </span>
  );
}
