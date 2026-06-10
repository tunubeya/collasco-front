"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Placement } from "@floating-ui/react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Bell, Check, Mail, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/lib/api/notifications";
import type {
  Notification,
  NotificationType,
} from "@/lib/model-definitions/notification";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/popover/popover";
import { resolveNotificationHref } from "@/ui/components/notifications/notification-utils";
import {
  notifyUnreadNotificationsCountChanged,
  useUnreadNotificationsCount,
} from "@/ui/components/notifications/use-unread-notifications-count";

type NotificationsBellProps = {
  token: string | null;
  placement?: Placement;
  contentClassName?: string;
};

const PAGE_LIMIT = 10;

const typeStyles: Record<NotificationType, string> = {
  INFO: "border-blue-200 bg-blue-50 text-blue-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
};

export default function NotificationsBell({
  token,
  placement = "bottom-end",
  contentClassName,
}: NotificationsBellProps) {
  const t = useTranslations("ui.notifications");
  const formatter = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [isBulkAction, setIsBulkAction] = useState(false);
  const { unreadCount, setUnreadCount, isLoadingCount } =
    useUnreadNotificationsCount(token, () => toast.error(t("errors.load")));

  const hasUnread = unreadCount > 0;

  const fetchList = useCallback(async () => {
    if (!token) return;
    setIsLoadingList(true);
    try {
      const result = await listNotifications(token, {
        page: 1,
        limit: PAGE_LIMIT,
      });
      setItems(result.items);
    } catch {
      toast.error(t("errors.load"));
    } finally {
      setIsLoadingList(false);
    }
  }, [t, token]);

  useEffect(() => {
    if (open) {
      void fetchList();
    }
  }, [open, fetchList]);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => {
      void fetchList();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchList, open]);

  const handleMarkRead = useCallback(
    async (notification: Notification, navigate = false) => {
      if (!token) return;
      const { id } = notification;
      if (busyIds[id]) return;
      setBusyIds((prev) => ({ ...prev, [id]: true }));
      try {
        if (!notification.isRead) {
          await markNotificationRead(token, id);
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, isRead: true } : item
            )
          );
          setUnreadCount((prev) => {
            const next = Math.max(0, prev - 1);
            notifyUnreadNotificationsCountChanged(next);
            return next;
          });
        }
        if (navigate) {
          const href = resolveNotificationHref(notification);
          if (href) {
            router.push(href);
          }
        }
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [id]: false }));
      }
    },
    [busyIds, router, setUnreadCount, t, token]
  );

  const handleDelete = useCallback(
    async (notification: Notification) => {
      if (!token) return;
      const { id } = notification;
      if (busyIds[id]) return;
      setBusyIds((prev) => ({ ...prev, [id]: true }));
      try {
        await deleteNotification(token, id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (!notification.isRead) {
          setUnreadCount((prev) => {
            const next = Math.max(0, prev - 1);
            notifyUnreadNotificationsCountChanged(next);
            return next;
          });
        }
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [id]: false }));
      }
    },
    [busyIds, setUnreadCount, t, token]
  );

  const handleMarkUnread = useCallback(
    async (notification: Notification) => {
      if (!token || !notification.isRead) return;
      const { id } = notification;
      if (busyIds[id]) return;
      setBusyIds((prev) => ({ ...prev, [id]: true }));
      try {
        await markNotificationUnread(token, id);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isRead: false } : item
          )
        );
        setUnreadCount((prev) => {
          const next = prev + 1;
          notifyUnreadNotificationsCountChanged(next);
          return next;
        });
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [id]: false }));
      }
    },
    [busyIds, setUnreadCount, t, token]
  );

  const handleMarkAll = useCallback(async () => {
    if (!token || isBulkAction || !hasUnread) return;
    setIsBulkAction(true);
    try {
      await markAllNotificationsRead(token);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      notifyUnreadNotificationsCountChanged(0);
    } catch {
      toast.error(t("errors.action"));
    } finally {
      setIsBulkAction(false);
    }
  }, [hasUnread, isBulkAction, setUnreadCount, t, token]);

  const badgeText = useMemo(() => {
    if (!hasUnread) return "";
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [hasUnread, unreadCount]);

  if (!token) return null;

  return (
    <Popover placement={placement} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("title")}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {hasUnread ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
              {badgeText}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "z-50 w-80 overflow-hidden rounded-xl border bg-background p-0 shadow-lg",
          contentClassName,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">{t("title")}</p>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={!hasUnread || isBulkAction}
            className={cn(
              "text-xs font-medium text-primary-orange transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            {t("markAll")}
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {isLoadingList ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((notification) => {
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
                      "px-3 py-3",
                      notification.isRead ? "bg-background" : "bg-orange-50/60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1 h-2.5 w-2.5 rounded-full border",
                          notification.isRead
                            ? "border-muted-foreground/40 bg-muted-foreground/20"
                            : "border-primary-orange bg-primary-orange"
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkRead(notification, Boolean(href))
                          }
                          disabled={isBusy}
                          className={cn(
                            "text-left text-sm font-semibold text-foreground transition hover:text-primary-orange",
                            notification.isRead && "opacity-70",
                            !href && "cursor-default"
                          )}
                        >
                          {notification.title}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {timestamp}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Popover placement="bottom-end">
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isBusy}
                              className={cn(
                                "rounded-full border px-2 py-1 text-[10px] font-medium transition",
                                typeStyles[notification.type]
                              )}
                              aria-label={t("actions")}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="z-50 flex w-44 flex-col gap-1 rounded-lg border bg-background p-2 text-xs shadow-lg">
                            {notification.isRead ? (
                              <button
                                type="button"
                                onClick={() => handleMarkUnread(notification)}
                                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                {t("markUnread")}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkRead(notification, false)
                                }
                                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted"
                              >
                                <Check className="h-3.5 w-3.5" />
                                {t("markRead")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(notification)}
                              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("delete")}
                            </button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push("/app/notifications")}
            className="text-[11px] font-medium text-primary-orange transition hover:opacity-80"
          >
            {t("viewAll")}
          </button>
          {isLoadingCount ? <span>{t("loading")}</span> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
