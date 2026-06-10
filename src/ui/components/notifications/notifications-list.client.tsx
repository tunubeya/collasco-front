"use client";

import { useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  BellRing,
  Check,
  Clock,
  Mail,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/lib/api/notifications";
import type {
  Notification,
  NotificationType,
} from "@/lib/model-definitions/notification";
import { cn, generatePagination } from "@/lib/utils";
import { resolveNotificationHref } from "@/ui/components/notifications/notification-utils";
import { notifyUnreadNotificationsCountChanged } from "@/ui/components/notifications/use-unread-notifications-count";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/popover/popover";

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
          notifyUnreadNotificationsCountChanged();
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
        if (!notification.isRead) {
          notifyUnreadNotificationsCountChanged();
        }
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [notification.id]: false }));
      }
    },
    [busyIds, t, token]
  );

  const handleMarkUnread = useCallback(
    async (notification: Notification) => {
      if (busyIds[notification.id] || !notification.isRead) return;
      setBusyIds((prev) => ({ ...prev, [notification.id]: true }));
      try {
        await markNotificationUnread(token, notification.id);
        setList((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, isRead: false } : item
          )
        );
        notifyUnreadNotificationsCountChanged();
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
      notifyUnreadNotificationsCountChanged(0);
    } catch {
      toast.error(t("errors.action"));
    } finally {
      setIsBulkAction(false);
    }
  }, [isBulkAction, t, token, unreadCount]);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <BellRing className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-slate-700">{t("empty.title")}</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
            <BellRing className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-slate-700">
            {t("summary", { count: unreadCount })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unreadCount === 0 || isBulkAction}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary-orange hover:text-primary-orange disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("markAll")}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {list.map((notification) => {
          const href = resolveNotificationHref(notification);
          const isBusy = Boolean(busyIds[notification.id]);
          const timestamp = formatter.dateTime(
            new Date(notification.createdAt),
            { dateStyle: "medium", timeStyle: "short" }
          );
          return (
            <li
              key={notification.id}
              className={cn(
                "group relative flex flex-col gap-3 px-5 py-4 transition sm:flex-row sm:items-start sm:justify-between",
                notification.isRead
                  ? "bg-white hover:bg-slate-50/70"
                  : "bg-orange-50/40 hover:bg-orange-50/70 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-primary-orange"
              )}
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleMarkRead(notification, Boolean(href))}
                  disabled={isBusy}
                  className={cn(
                    "block text-left text-sm font-semibold leading-6 text-slate-950 transition",
                    notification.isRead
                      ? "font-medium text-slate-700 hover:text-primary-orange"
                      : "hover:text-primary-orange"
                  )}
                >
                  {notification.title}
                </button>
                <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
                  {notification.message}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{timestamp}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start sm:opacity-80 sm:transition sm:group-hover:opacity-100">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal",
                    typeStyles[notification.type]
                  )}
                >
                  {t(`types.${notification.type}`)}
                </span>
                <Popover placement="bottom-end">
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={isBusy}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                      aria-label={t("actions")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="z-50 flex w-48 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                    {notification.isRead ? (
                      <button
                        type="button"
                        onClick={() => handleMarkUnread(notification)}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-left text-slate-700 transition hover:bg-slate-100"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {t("markUnread")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification, false)}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-left text-slate-700 transition hover:bg-slate-100"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("markRead")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(notification)}
                      className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-left text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("delete")}
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3"
          aria-label={t("pagination.aria")}
        >
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-50"
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
                      "rounded-md px-3 py-1.5 text-sm border transition-colors",
                      entry === page
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
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
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-50"
            disabled={page >= totalPages}
          >
            {t("pagination.next")}
          </button>
        </nav>
      )}
    </section>
  );
}
