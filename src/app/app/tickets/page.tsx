import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { listProjectsMine } from "@/lib/api/projects";
import {
  listTicketsAssigned,
  listTicketsByProject,
  listTicketsMine,
} from "@/lib/api/tickets";
import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { handlePageError } from "@/lib/handle-page-error";
import TicketsTabs from "@/ui/components/tickets/tickets-tabs.client";

type SearchParams = {
  tab?: "mine" | "assigned" | "project";
  projectId?: string;
  page?: string;
  limit?: string;
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function TicketsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);
  const token = session.token;
  const t = await getTranslations("app.tickets.list");

  const tabParam = (await searchParams)?.tab;
  const tab =
    tabParam === "assigned" || tabParam === "project" ? tabParam : "mine";
  const projectId = (await searchParams)?.projectId ?? null;
  const page = Math.max(1, Number.parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const limit = Math.max(
    1,
    Number.parseInt((await searchParams)?.limit ?? "20", 10) || 20
  );

  let projectsResult;
  try {
    projectsResult = await listProjectsMine(token, {
      page: 1,
      limit: 100,
      sort: "name",
    });
  } catch (error) {
    if (error instanceof Response && error.status === 404) {
      projectsResult = { items: [], total: 0, page: 1, limit: 100, totalPages: 1 };
    } else {
      await handlePageError(error);
    }
  }
  const projects = projectsResult?.items ?? [];

  let ticketsResult;
  try {
    if (tab === "assigned") {
      ticketsResult = await listTicketsAssigned(token, { page, limit });
    } else if (tab === "project") {
      if (projectId) {
        ticketsResult = await listTicketsByProject(token, projectId, { page, limit });
      } else {
        ticketsResult = null;
      }
    } else {
      ticketsResult = await listTicketsMine(token, { page, limit });
    }
  } catch (error) {
    if (error instanceof Response && error.status === 404) {
      ticketsResult = { items: [], total: 0, page, limit, totalPages: 1 };
    } else {
      await handlePageError(error);
    }
  }

  const items = ticketsResult?.items ?? [];
  const total = Math.max(0, Number(ticketsResult?.total) || items.length);
  const currentPage = Math.max(1, Number(ticketsResult?.page) || page);
  const currentLimit = Math.max(1, Number(ticketsResult?.limit) || limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <TicketsTabs
        token={token}
        tab={tab}
        items={items}
        pagination={{
          total,
          page: currentPage,
          limit: currentLimit,
        }}
        projects={projects}
        projectId={projectId}
        requiresProjectSelection={tab === "project" && !projectId}
      />
    </div>
  );
}
