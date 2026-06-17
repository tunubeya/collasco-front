import { redirect } from "next/navigation";

import { fetchGetUserProfile } from "@/lib/data";
import { UserRole } from "@/lib/definitions";
import { handlePageError } from "@/lib/handle-page-error";
import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";
import AdminNotifications from "../admin-notifications.client";

export default async function AdminNotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect(RoutesEnum.LOGIN);
  }

  let isAdmin = session.role === UserRole.ADMIN;
  if (!isAdmin) {
    try {
      const profile = await fetchGetUserProfile(session.token);
      isAdmin = profile.role === UserRole.ADMIN;
    } catch (error) {
      await handlePageError(error);
    }
  }

  if (!isAdmin) {
    redirect(RoutesEnum.ERROR_UNAUTHORIZED);
  }

  return (
    <div className="p-6 md:p-10">
      <AdminNotifications token={session.token} />
    </div>
  );
}
