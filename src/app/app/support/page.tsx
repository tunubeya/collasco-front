import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Bug } from "lucide-react";

import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";
import { AppSecondaryTabButton } from "@/ui/components/tabs/app-tabs";

const MANUAL_URL =
  "https://collasco.com/public/manual/shared/bbcd7836-bcad-4eb8-bf39-ac1199df43c7";
const TICKET_REPORT_URL =
  "https://collasco.com/public/tickets/links/acb3a50ab213b354a177602b56b469a69c8a24c4c32bc2cbcef92cbfc6bfc9cd?locale=en";
const RELEASES_URL =
  "https://collasco.com/public/releases/links/ec73b83f1f3672619330a266d6014261d23c465b82f0d8ad037573316eb155f7";

type SearchParams = {
  view?: string;
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function SupportPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) {
    redirect(RoutesEnum.LOGIN);
  }
  const t = await getTranslations("support");
  const view = (await searchParams)?.view === "releases" ? "releases" : "manual";
  const contentUrl = view === "releases" ? RELEASES_URL : MANUAL_URL;
  const contentTitle =
    view === "releases"
      ? t("resources.releasesFrameTitle")
      : t("resources.manualFrameTitle");

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3 md:h-[calc(100vh-3rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("ticketCta.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("ticketCta.description")}
          </p>
        </div>
        <a
          href={TICKET_REPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Bug className="h-4 w-4" aria-hidden />
          {t("ticketCta.action")}
        </a>
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">
        <AppSecondaryTabButton
          label={t("resources.manual")}
          href="/app/support"
          isActive={view === "manual"}
          ariaCurrent={view === "manual" ? "page" : undefined}
        />
        <AppSecondaryTabButton
          label={t("resources.releases")}
          href="/app/support?view=releases"
          isActive={view === "releases"}
          ariaCurrent={view === "releases" ? "page" : undefined}
        />
      </div>
      <iframe
        title={contentTitle}
        src={contentUrl}
        className="min-h-0 flex-1 rounded-xl border bg-white"
      />
    </div>
  );
}
