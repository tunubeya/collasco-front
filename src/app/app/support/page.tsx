import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Bug } from "lucide-react";

import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";

const MANUAL_URL =
  "https://collasco.com/public/manual/shared/bbcd7836-bcad-4eb8-bf39-ac1199df43c7";
const TICKET_REPORT_URL =
  "https://collasco.com/public/tickets/links/acb3a50ab213b354a177602b56b469a69c8a24c4c32bc2cbcef92cbfc6bfc9cd?locale=en";

export default async function SupportPage() {
  const session = await getSession();
  if (!session) {
    redirect(RoutesEnum.LOGIN);
  }
  const t = await getTranslations("support");

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
      <iframe
        title="Support manual"
        src={MANUAL_URL}
        className="min-h-0 flex-1 rounded-xl border bg-white"
      />
    </div>
  );
}
