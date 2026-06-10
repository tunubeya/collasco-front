import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";

import { listNotifications } from "@/lib/api/notifications";
import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { handlePageError } from "@/lib/handle-page-error";
import NotificationsList from "@/ui/components/notifications/notifications-list.client";

type SearchParams = {
  page?: string;
  limit?: string;
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function NotificationsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);
  const token = session.token;
  const t = await getTranslations("app.notifications.list");

  const page = Math.max(1, Number.parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const limit = Math.max(
    1,
    Number.parseInt((await searchParams)?.limit ?? "20", 10) || 20
  );

  let result;
  try {
    result = await listNotifications(token, { page, limit });
  } catch (error) {
    await handlePageError(error);
  }

  const items = result?.items ?? [];
  const total = Math.max(0, Number(result?.total) || items.length);
  const currentPage = Math.max(1, Number(result?.page) || page);
  const currentLimit = Math.max(1, Number(result?.limit) || limit);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <BellRing className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-950">{t("title")}</h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <NotificationsList
        token={token}
        items={items}
        pagination={{
          total,
          page: currentPage,
          limit: currentLimit,
        }}
      />
    </div>
  );
}
