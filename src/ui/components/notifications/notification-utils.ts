import type { Notification } from "@/lib/model-definitions/notification";

export function resolveNotificationHref(
  notification: Notification
): string | null {
  const data = notification.data ?? {};
  const projectId =
    typeof data.projectId === "string" ? data.projectId : undefined;
  const moduleId =
    typeof data.moduleId === "string" ? data.moduleId : undefined;
  const ticketId =
    typeof data.ticketId === "string" ? data.ticketId : undefined;
  const featureId =
    typeof data.featureId === "string" ? data.featureId : undefined;
  const releaseId =
    typeof data.releaseId === "string" ? data.releaseId : undefined;
  const documentationId =
    typeof data.documentationId === "string"
      ? data.documentationId
      : undefined;

  if (ticketId) {
    return `/app/tickets/${ticketId}`;
  }

  if (projectId && featureId) {
    return `/app/projects/${projectId}/features/${featureId}`;
  }

  if (projectId && moduleId) {
    return `/app/projects/${projectId}/modules/${moduleId}`;
  }

  if (projectId && releaseId) {
    return `/app/projects/${projectId}?tab=releases`;
  }

  if (projectId && documentationId) {
    return `/app/projects/${projectId}?tab=documentation`;
  }

  if (projectId) {
    return `/app/projects/${projectId}`;
  }

  return null;
}
