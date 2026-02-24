// src/app/app/page.tsx
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";

export default async function AppHome() {
  const session = await getSession();
  const t = await getTranslations("app.home");

  if (!session) {
    redirect(RoutesEnum.LOGIN); // 🔒 Si no está logueado, afuera
  }

  const roleLabel = session.role ?? t("roleFallback");

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-4">
        {t("title", { role: roleLabel })}
      </h1>
      <p className="text-muted-foreground">
        {t.rich("subtitle", {
          projects: (chunks) => <span className="font-medium">{chunks}</span>,
          settings: (chunks) => <span className="font-medium">{chunks}</span>,
        })}
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <a
          href={RoutesEnum.APP_PROJECTS}
          className="rounded-xl border p-6 hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">{t("projects.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("projects.description")}
          </p>
        </a>

        <a
          href={RoutesEnum.APP_SETTINGS}
          className="rounded-xl border p-6 hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">{t("settings.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("settings.description")}
          </p>
        </a>
      </div>
    </div>
  );
}
