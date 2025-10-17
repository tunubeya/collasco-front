"use client";

import { useTranslations } from "next-intl";

export default function ProjectsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("app.projects.errors");

  return (
    <div className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        {t("retry")}
      </button>
    </div>
  );
}
