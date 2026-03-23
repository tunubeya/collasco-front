import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";
import type {
  Notification,
  NotificationListResponse,
  NotificationType,
} from "@/lib/model-definitions/notification";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type CreateNotificationDto = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
};

export type CreateUserNotificationDto = {
  email: string;
  title: string;
  message: string;
  type?: NotificationType;
};

export type CreateProjectNotificationDto = {
  title: string;
  message: string;
  type?: NotificationType;
  roleNames?: string[];
};

export type CreateBroadcastNotificationDto = {
  title: string;
  message: string;
  type?: NotificationType;
};

export type BroadcastNotificationResponse = {
  created: number;
  userIds: string[];
};

export type ListNotificationsParams = {
  page?: number;
  limit?: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

export async function createNotification(
  token: string,
  dto: CreateNotificationDto
): Promise<Notification> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<Notification>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createUserNotification(
  token: string,
  dto: CreateUserNotificationDto
): Promise<Notification> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/user`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<Notification>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createProjectNotification(
  token: string,
  projectId: string,
  dto: CreateProjectNotificationDto
): Promise<BroadcastNotificationResponse> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/project/${projectId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<BroadcastNotificationResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createAllNotification(
  token: string,
  dto: CreateBroadcastNotificationDto
): Promise<BroadcastNotificationResponse> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<BroadcastNotificationResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listNotifications(
  token: string,
  { page = 1, limit = 20 }: ListNotificationsParams = {}
): Promise<NotificationListResponse> {
  try {
    const url = new URL(`${apiUrl}/notifications`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    const res = await fetchWithAuth(url.toString(), { method: "GET" }, token);
    if (!res.ok) throw res;
    return await parseJson<NotificationListResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getUnreadNotificationsCount(
  token: string
): Promise<{ count: number }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/unread-count`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<{ count: number }>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function markNotificationRead(
  token: string,
  id: string
): Promise<Notification> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/${id}/read`,
      { method: "PATCH" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<Notification>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function markAllNotificationsRead(
  token: string
): Promise<{ count: number }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/read-all`,
      { method: "PATCH" },
      token
    );
    if (!res.ok) throw res;
    return await parseJson<{ count: number }>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function deleteNotification(
  token: string,
  id: string
): Promise<Notification | null> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/notifications/${id}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as Notification;
    }
    return null;
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}
