export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export type NotificationData = {
  projectId?: string;
  moduleId?: string;
  [key: string]: unknown;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  data?: NotificationData | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

