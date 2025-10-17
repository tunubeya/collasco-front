import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { fetchGetUserProfile } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { User } from "@/lib/model-definitions/user";
import { RoutesEnum } from "@/lib/utils";
import SettingsProfileClient from "@/ui/components/settings/SettingProfileClient";
import { handlePageError } from "@/lib/handle-page-error";

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const t = await getTranslations("app.settings.profile");

  let profile: User | null = null;
  try {
    profile = await fetchGetUserProfile(session.token);
  }  catch (error) {
  await handlePageError(error);
}

  const defaultName =
    profile?.name?.trim() ??
    (profile?.email ? profile.email.split("@")[0] : "");
  const defaultEmail = profile?.email ?? "";

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        {t("pageTitle")}
      </h1>
      <SettingsProfileClient
        defaultName={defaultName}
        defaultEmail={defaultEmail}
      />
    </div>
  );
}
