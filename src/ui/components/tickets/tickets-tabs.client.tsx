"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Calendar, Folder, User } from "lucide-react";
import Link from "next/link";

import type { Project } from "@/lib/model-definitions/project";
import type { Ticket } from "@/lib/model-definitions/ticket";
import { cn, generatePagination } from "@/lib/utils";
import { Dropdown } from "@/ui/components/form/dropdown";
import { TicketsCreateButton } from "@/ui/components/tickets/tickets-create.client";

type TicketsTab = "mine" | "assigned" | "project";

type Pagination = {
  total: number;
  page: number;
  limit: number;
};

type Props = {
  token: string;
  tab: TicketsTab;
  items: Ticket[];
  pagination: Pagination;
  projectId?: string | null;
  projects: Project[];
  requiresProjectSelection: boolean;
};

const TAB_ICON = {
  mine: User,
  assigned: User,
  project: Folder,
} as const;

export default function TicketsTabs({
  token,
  tab,
  items,
  pagination,
  projectId,
  projects,
  requiresProjectSelection,
}: Props) {
  const t = useTranslations("app.tickets.list");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / Math.max(1, pagination.limit))
  );

  const tabs: TicketsTab[] = ["mine", "assigned", "project"];
  const projectOptions = useMemo(
    () => [
      { value: "", label: t("project.placeholder") },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ],
    [projects, t]
  );

  const setTab = (next: TicketsTab) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", next);
    sp.set("page", "1");
    sp.set("limit", String(pagination.limit));
    if (next !== "project") {
      sp.delete("projectId");
    }
    router.push(`${pathname}?${sp.toString()}`);
  };

  const setProject = (nextProjectId: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", "project");
    sp.set("page", "1");
    sp.set("limit", String(pagination.limit));
    if (nextProjectId) {
      sp.set("projectId", nextProjectId);
    } else {
      sp.delete("projectId");
    }
    router.push(`${pathname}?${sp.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(target));
    sp.set("limit", String(pagination.limit));
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = TAB_ICON[item];
            const active = item === tab;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
                  active
                    ? "border-primary-orange bg-primary-orange/10 text-primary-orange"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(`tabs.${item}`)}
              </button>
            );
          })}
        </div>

        {tab === "project" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px]">
              <Dropdown
                value={projectId ?? ""}
                onChange={(event) => setProject(event.target.value)}
                options={projectOptions}
                sizeElement="sm"
                fullWidth={false}
              />
            </div>
            {projectId ? (
              <TicketsCreateButton token={token} projectId={projectId} />
            ) : null}
          </div>
        ) : null}
      </div>

      {requiresProjectSelection ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          {t("project.emptySelection")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="rounded-xl border bg-white">
          <ul className="divide-y">
            {items.map((ticket) => {
              const createdAt = format.dateTime(new Date(ticket.createdAt), {
                dateStyle: "medium",
                timeStyle: "short",
              });
              const statusLabel = t(`statuses.${ticket.status}`, {
                default: ticket.status,
              });
              const assignee =
                ticket.assignee?.name ?? t("meta.unassigned");
              const createdBy =
                ticket.createdBy?.name ?? t("meta.unknown");
              return (
                <li key={ticket.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/tickets/${ticket.id}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {ticket.title}
                        </Link>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {ticket.project?.name ? (
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {ticket.project.name}
                          </span>
                        ) : null}
                        {ticket.feature?.name ? (
                          <span className="flex items-center gap-1">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                              {ticket.feature.name}
                            </span>
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {t("meta.createdBy", { name: createdBy })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {t("meta.assignedTo", { name: assignee })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {createdAt}
                      </span>
                      <span>{t("meta.sections", { count: ticket.sectionsCount ?? 0 })}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav
              className="flex items-center justify-center gap-2 border-t px-4 py-3"
              aria-label={t("pagination.aria")}
            >
              <button
                type="button"
                onClick={() => goToPage(pagination.page - 1)}
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                disabled={pagination.page <= 1}
              >
                {t("pagination.previous")}
              </button>
              <ul className="flex items-center gap-1">
                {generatePagination(pagination.page, totalPages).map(
                  (entry, index) =>
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
                            entry === pagination.page
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          ].join(" ")}
                          aria-current={
                            entry === pagination.page ? "page" : undefined
                          }
                        >
                          {entry}
                        </button>
                      </li>
                    )
                )}
              </ul>
              <button
                type="button"
                onClick={() => goToPage(pagination.page + 1)}
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                disabled={pagination.page >= totalPages}
              >
                {t("pagination.next")}
              </button>
            </nav>
          ) : null}
        </div>
      )}
    </section>
  );
}
