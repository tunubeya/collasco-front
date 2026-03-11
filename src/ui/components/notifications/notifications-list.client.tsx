"use client";

import { useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type {
  Notification,
  NotificationType,
} from "@/lib/model-definitions/notification";
import { cn, generatePagination } from "@/lib/utils";
import { resolveNotificationHref } from "@/ui/components/notifications/notification-utils";

type Pagination = {
  total: number;
  page: number;
  limit: number;
};

type Props = {
  token: string;
  items: Notification[];
  pagination: Pagination;
};

const typeStyles: Record<NotificationType, string> = {
  INFO: "border-blue-200 bg-blue-50 text-blue-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
};

export default function NotificationsList({ token, items, pagination }: Props) {
  const t = useTranslations("app.notifications.list");
  const formatter = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [list, setList] = useState<Notification[]>(items);
  const [total, setTotal] = useState(pagination.total);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [isBulkAction, setIsBulkAction] = useState(false);

  const { page, limit } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  const unreadCount = useMemo(
    () => list.filter((notification) => !notification.isRead).length,
    [list]
  );

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(target));
    sp.set("limit", String(limit));
    router.push(`${pathname}?${sp.toString()}`);
  };

  const handleMarkRead = useCallback(
    async (notification: Notification, navigate: boolean) => {
      if (busyIds[notification.id]) return;
      setBusyIds((prev) => ({ ...prev, [notification.id]: true }));
      try {
        if (!notification.isRead) {
          await markNotificationRead(token, notification.id);
          setList((prev) =>
            prev.map((item) =>
              item.id === notification.id ? { ...item, isRead: true } : item
            )
          );
        }
        if (navigate) {
          const href = resolveNotificationHref(notification);
          if (href) router.push(href);
        }
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [notification.id]: false }));
      }
    },
    [busyIds, router, t, token]
  );

  const handleDelete = useCallback(
    async (notification: Notification) => {
      if (busyIds[notification.id]) return;
      setBusyIds((prev) => ({ ...prev, [notification.id]: true }));
      try {
        await deleteNotification(token, notification.id);
        setList((prev) =>
          prev.filter((item) => item.id !== notification.id)
        );
        setTotal((prev) => Math.max(0, prev - 1));
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [notification.id]: false }));
      }
    },
    [busyIds, t, token]
  );

  const handleMarkAll = useCallback(async () => {
    if (isBulkAction || unreadCount === 0) return;
    setIsBulkAction(true);
    try {
      await markAllNotificationsRead(token);
      setList((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      toast.error(t("errors.action"));
    } finally {
      setIsBulkAction(false);
    }
  }, [isBulkAction, t, token, unreadCount]);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-background p-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {t("summary", { count: unreadCount })}
        </p>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || isBulkAction}
          className="rounded border px-3 py-1 text-sm text-primary-orange transition hover:opacity-80 disabled:opacity-40"
        >
          {t("markAll")}
        </button>
      </div>

      <ul className="divide-y">
        {list.map((notification) => {
          const href = resolveNotificationHref(notification);
          const isBusy = Boolean(busyIds[notification.id]);
          const timestamp = formatter.dateTime(
            new Date(notification.createdAt),
            { dateStyle: "medium", timeStyle: "short" }
          );
          return (
            <li key={notification.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-2 h-2.5 w-2.5 shrink-0 rounded-full border",
                      notification.isRead
                        ? "border-muted-foreground/40 bg-muted-foreground/20"
                        : "border-primary-orange bg-primary-orange"
                    )}
                  />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleMarkRead(notification, Boolean(href))
                      }
                      disabled={isBusy}
                      className={cn(
                        "block text-left text-sm font-semibold text-foreground transition",
                        notification.isRead
                          ? "opacity-70"
                          : "hover:text-primary-orange"
                      )}
                    >
                      {notification.title}
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {timestamp}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      typeStyles[notification.type]
                    )}
                  >
                    {t(`types.${notification.type}`)}
                  </span>
                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification, false)}
                      disabled={isBusy}
                      className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground transition hover:text-foreground"
                      aria-label={t("markRead")}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(notification)}
                    disabled={isBusy}
                    className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground transition hover:text-red-600"
                    aria-label={t("delete")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
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

