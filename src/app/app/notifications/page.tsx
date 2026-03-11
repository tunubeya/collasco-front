import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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

