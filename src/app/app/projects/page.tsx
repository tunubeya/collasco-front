// src/app/app/projects/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { fetchProjectsMine } from "@/lib/data";
import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import ProjectsList from "@/ui/components/projects/projects-list.client";
import { handlePageError } from "@/lib/handle-page-error";

type SearchParams = {
  page?: string;
  limit?: string;
  q?: string;
  sort?: string;
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);
  const token = session.token;
  const t = await getTranslations("app.projects.list");

  const page = Math.max(1, Number.parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const limit = Math.max(
    1,
    Number.parseInt((await searchParams)?.limit ?? "20", 10) || 20
  );
  const q = (await searchParams)?.q?.trim();
  const sort = (await searchParams)?.sort ?? "-updatedAt";

  let result;
  try {
    result = await fetchProjectsMine(token, { page, limit, q, sort });
  }  catch (error) {
  await handlePageError(error);
}

  const items = result?.items ?? [];
  const total = Math.max(0, Number(result?.total) || items.length);
  const currentPage = Math.max(1, Number(result?.page) || page);
  const currentLimit = Math.max(1, Number(result?.limit) || limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/app/projects/new"
          className="rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-background"
        >
          {t("create")}
        </Link>
      </div>

      <ProjectsList
        items={items}
        pagination={{
          total,
          page: currentPage,
          limit: currentLimit,
          q: q ?? "",
          sort,
        }}
      />
    </div>
  );
}
