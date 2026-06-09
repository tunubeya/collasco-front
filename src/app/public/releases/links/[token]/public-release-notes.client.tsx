"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import {
  getPublicReleaseNotes,
  type PublicReleaseNotesResponse,
} from "@/lib/api/releases";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";
import { useLocaleQueryParam } from "@/ui/components/i18n/use-locale-query-param";

type PublicReleaseNotesClientProps = {
  token: string;
};

export function PublicReleaseNotesClient({
  token,
}: PublicReleaseNotesClientProps) {
  const t = useTranslations("app.projects.releases.public");
  const formatter = useFormatter();
  useLocaleQueryParam();
  const [data, setData] = useState<PublicReleaseNotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await getPublicReleaseNotes(token);
      setData(payload);
    } catch (err) {
      if (err instanceof Response && err.status === 410) {
        setError(t("expired"));
      } else if (err instanceof Response && err.status === 404) {
        setError(t("notFound"));
      } else {
        setError(t("error"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const latestRelease = data?.releases[0] ?? null;

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("loading")}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : data ? (
          <>
            <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-linear-to-r from-slate-900 to-slate-700 px-6 py-7 text-white">
                <p className="text-sm font-medium text-slate-200">
                  {t("eyebrow")}
                </p>
                <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      {data.project.name}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                      {t("subtitle")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                      <p className="text-xs text-slate-200">{t("stats.releases")}</p>
                      <p className="text-xl font-semibold">{data.releases.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                      <p className="text-xs text-slate-200">{t("stats.latest")}</p>
                      <p className="text-xl font-semibold">
                        {latestRelease
                          ? t("version", { version: latestRelease.versionNumber })
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {data.releases.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
                {t("empty")}
              </p>
            ) : (
              <section className="relative space-y-5">
                <div className="absolute left-5 top-2 hidden h-[calc(100%-1rem)] w-px bg-slate-200 md:block" />
                {data.releases.map((release, index) => {
                  const releasedAt = release.releasedAt
                    ? formatter.dateTime(new Date(release.releasedAt), {
                        dateStyle: "medium",
                      })
                    : t("notAvailable");

                  return (
                    <article
                      key={release.id}
                      className="relative grid gap-4 md:grid-cols-[42px_1fr]"
                    >
                      <div className="hidden md:flex md:justify-center">
                        <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" aria-hidden />
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold text-slate-950">
                                {t("version", { version: release.versionNumber })}
                              </h2>
                              {index === 0 ? (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  {t("latestBadge")}
                                </span>
                              ) : null}
                            </div>
                            {release.name ? (
                              <p className="mt-1 text-sm text-slate-600">
                                {release.name}
                              </p>
                            ) : null}
                          </div>
                          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                            {releasedAt}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <RichTextPreview
                            value={release.changelog.content}
                            emptyLabel={t("noChangelog")}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
