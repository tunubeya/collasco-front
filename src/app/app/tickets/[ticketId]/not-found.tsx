import Link from "next/link";
import { Bell, TicketX } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function TicketNotFound() {
  const t = await getTranslations("app.tickets.detail.notFound");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-slate-900">
          <TicketX className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          {t("description")}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/app/notifications"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {t("notifications")}
          </Link>
          <Link
            href="/app/tickets"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-blue-100"
          >
            {t("tickets")}
          </Link>
        </div>
      </div>
    </div>
  );
}
