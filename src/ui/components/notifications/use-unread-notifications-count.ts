"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getUnreadNotificationsCount } from "@/lib/api/notifications";

const unreadNotificationsEvent = "qms:unread-notifications-count-changed";

type UnreadNotificationsEventDetail = {
  count?: number;
};

export function notifyUnreadNotificationsCountChanged(count?: number) {
  const dispatch = () => {
    window.dispatchEvent(
      new CustomEvent<UnreadNotificationsEventDetail>(
        unreadNotificationsEvent,
        {
          detail: { count },
        }
      )
    );
  };

  if (typeof window.queueMicrotask === "function") {
    window.queueMicrotask(dispatch);
    return;
  }

  window.setTimeout(dispatch, 0);
}

export function useUnreadNotificationsCount(
  token: string | null,
  onLoadError?: () => void
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const onLoadErrorRef = useRef(onLoadError);

  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
  }, [onLoadError]);

  const refreshCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    setIsLoadingCount(true);
    try {
      const result = await getUnreadNotificationsCount(token);
      setUnreadCount(Math.max(0, result.count));
    } catch {
      onLoadErrorRef.current?.();
    } finally {
      setIsLoadingCount(false);
    }
  }, [token]);

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
    if (!token) return;

    const handleUnreadCountChanged = (event: Event) => {
      const detail = (event as CustomEvent<UnreadNotificationsEventDetail>)
        .detail;
      if (typeof detail?.count === "number") {
        setUnreadCount(Math.max(0, detail.count));
        return;
      }
      void refreshCount();
    };

    window.addEventListener(unreadNotificationsEvent, handleUnreadCountChanged);
    return () =>
      window.removeEventListener(
        unreadNotificationsEvent,
        handleUnreadCountChanged
      );
  }, [refreshCount, token]);

  return {
    unreadCount,
    setUnreadCount,
    isLoadingCount,
    refreshCount,
  };
}
