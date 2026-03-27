"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Calendar, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import type { Ticket } from "@/lib/model-definitions/ticket";
import { listTicketsByFeature } from "@/lib/api/tickets";
import { cn, generatePagination } from "@/lib/utils";
import { actionButtonClass } from "@/ui/styles/action-button";
import { FeatureTicketCreateButton } from "./feature-ticket-create.client";

type Props = {
  token: string;
  projectId: string;
  featureId: string;
  featureName: string;
  canCreateTicket?: boolean;
};

const DEFAULT_LIMIT = 10;

export function FeatureTicketsTab({
  token,
  projectId,
  featureId,
  canCreateTicket = false,
}: Props) {
  const t = useTranslations("app.projects.feature.tickets");
  const tList = useTranslations("app.tickets.list");
  const format = useFormatter();
  const [items, setItems] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(0, total) / Math.max(1, limit))
  );

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listTicketsByFeature(token, featureId, {
        page,
        limit,
      });
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
    } catch (error) {
      console.error("[FeatureTicketsTab] load error:", error);
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }, [featureId, limit, page, t, token]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets, reloadKey]);

  const pages = useMemo(
    () => generatePagination(page, totalPages),
    [page, totalPages]
  );

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    setPage(target);
  };

  return (
    <section className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canCreateTicket ? (
          <FeatureTicketCreateButton
            token={token}
            projectId={projectId}
            featureId={featureId}
            onCreated={() => {
              setPage(1);
              setReloadKey((prev) => prev + 1);
            }}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border bg-white">
          <ul className="divide-y">
            {items.map((ticket) => {
              const createdAt = format.dateTime(new Date(ticket.createdAt), {
                dateStyle: "medium",
                timeStyle: "short",
              });
              const statusLabel = tList(`statuses.${ticket.status}`, {
                default: ticket.status,
              });
              const assignee =
                ticket.assignee?.name ?? tList("meta.unassigned");
              const createdBy =
                ticket.createdBy?.name ?? tList("meta.unknown");
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
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {tList("meta.createdBy", { name: createdBy })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {tList("meta.assignedTo", { name: assignee })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {createdAt}
                      </span>
                      <span>
                        {tList("meta.sections", {
                          count: ticket.sectionsCount ?? 0,
                        })}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav
              className="flex flex-wrap items-center justify-center gap-2 border-t px-4 py-3"
              aria-label={tList("pagination.aria")}
            >
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                className={actionButtonClass({ variant: "neutral", size: "xs" })}
                disabled={page <= 1}
              >
                {tList("pagination.previous")}
              </button>
              {pages.map((item, index) =>
                item === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-xs text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(Number(item))}
                    className={cn(
                      "rounded border px-2 py-1 text-xs",
                      item === page
                        ? "border-primary-orange bg-primary-orange/10 text-primary-orange"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                className={actionButtonClass({ variant: "neutral", size: "xs" })}
                disabled={page >= totalPages}
              >
                {tList("pagination.next")}
              </button>
            </nav>
          ) : null}
        </div>
      )}
    </section>
  );
}
