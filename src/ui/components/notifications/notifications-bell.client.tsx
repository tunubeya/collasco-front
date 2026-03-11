"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteNotification,
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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

type NotificationsBellProps = {
  token: string | null;
};

const PAGE_LIMIT = 10;

const typeStyles: Record<NotificationType, string> = {
  INFO: "border-blue-200 bg-blue-50 text-blue-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
};

export default function NotificationsBell({ token }: NotificationsBellProps) {
  const t = useTranslations("ui.notifications");
  const formatter = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [isBulkAction, setIsBulkAction] = useState(false);

  const hasUnread = unreadCount > 0;

  const refreshCount = useCallback(async () => {
    if (!token) return;
    setIsLoadingCount(true);
    try {
      const result = await getUnreadNotificationsCount(token);
      setUnreadCount(result.count);
    } catch {
      toast.error(t("errors.load"));
    } finally {
      setIsLoadingCount(false);
    }
  }, [t, token]);

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
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      void refreshCount();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [refreshCount, token]);

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
          setUnreadCount((prev) => Math.max(0, prev - 1));
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
    [busyIds, router, t, token]
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
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch {
        toast.error(t("errors.action"));
      } finally {
        setBusyIds((prev) => ({ ...prev, [id]: false }));
      }
    },
    [busyIds, t, token]
  );

  const handleMarkAll = useCallback(async () => {
    if (!token || isBulkAction || !hasUnread) return;
    setIsBulkAction(true);
    try {
      await markAllNotificationsRead(token);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error(t("errors.action"));
    } finally {
      setIsBulkAction(false);
    }
  }, [hasUnread, isBulkAction, t, token]);

  const badgeText = useMemo(() => {
    if (!hasUnread) return "";
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [hasUnread, unreadCount]);

  if (!token) return null;

  return (
    <Popover placement="bottom-end" open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-80 overflow-hidden rounded-xl border bg-background p-0 shadow-lg">
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
                  <li key={notification.id} className="px-3 py-3">
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
                            "text-left text-sm font-semibold text-foreground transition",
                            notification.isRead
                              ? "opacity-70"
                              : "hover:text-primary-orange",
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
                        {!notification.isRead ? (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(notification, false)}
                            disabled={isBusy}
                            className={cn(
                              "rounded-full border px-2 py-1 text-[10px] font-medium transition",
                              typeStyles[notification.type]
                            )}
                            aria-label={t("markRead")}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDelete(notification)}
                          disabled={isBusy}
                          className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground transition hover:text-red-600"
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
