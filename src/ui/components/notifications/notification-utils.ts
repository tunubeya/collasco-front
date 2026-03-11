import type { Notification } from "@/lib/model-definitions/notification";

export function resolveNotificationHref(
  notification: Notification
): string | null {
  const data = notification.data ?? {};
  const projectId =
    typeof data.projectId === "string" ? data.projectId : undefined;
  const moduleId =
    typeof data.moduleId === "string" ? data.moduleId : undefined;

  if (projectId && moduleId) {
    return `/app/projects/${projectId}/modules/${moduleId}`;
  }

  if (projectId) {
    return `/app/projects/${projectId}`;
  }

  return null;
}

