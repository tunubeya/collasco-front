import { getTranslations } from "next-intl/server";

import AdminNav from "./admin-nav.client";

type Props = { children: React.ReactNode };

export default async function AdminLayout({ children }: Props) {
  const t = await getTranslations("app.admin.nav");
  const items = [
    { href: "/app/admin/notifications", label: t("notifications") },
  ];

  return (
    <div className="space-y-4">
      <div className="border-b pb-1">
        <AdminNav items={items} />
      </div>
      {children}
    </div>
  );
}
