import { getTranslations } from "next-intl/server";

import SettingsNav from "@/ui/components/settings/SettingsNav.client";

type Props = { children: React.ReactNode };

export default async function SettingsLayout({ children }: Props) {
  const t = await getTranslations("app.settings.nav");
  const items = [
    { href: "/app/settings/profile", label: t("profile") },
    { href: "/app/settings/general", label: t("general") },
  ];

  return (
    <div className="space-y-4">
      <div className="border-b pb-1">
        <SettingsNav items={items} />
      </div>
      {children}
    </div>
  );
}
