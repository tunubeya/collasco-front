"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPublicTicket,
  PublicTicketError,
  validatePublicTicketLink,
  type PublicTicketLinkInfo,
} from "@/lib/api/public-tickets";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
};

export function PublicTicketCreateClient({ token }: Props) {
  const t = useTranslations("app.tickets.public");
  const [linkInfo, setLinkInfo] = useState<PublicTicketLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const loadLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await validatePublicTicketLink(token);
      if (!info.active) {
        setError(t("link.revoked"));
      } else {
        setLinkInfo(info);
      }
    } catch (err) {
      if (err instanceof PublicTicketError) {
        if (err.status === 404) {
          setError(t("link.notFound"));
          return;
        }
        if (err.status === 410) {
          setError(t("link.revoked"));
          return;
        }
      }
      setError(t("link.error"));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void loadLink();
  }, [loadLink]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!name.trim() || !email.trim()) {
      toast.error(t("create.missing"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await createPublicTicket(token, {
        title: t("create.defaultTitle"),
        content: "",
        email: email.trim(),
        name: name.trim(),
      });
      toast.success(t("create.success"));
      router.push(`/public/tickets/follow/${result.followUpToken}`);
    } catch (err) {
      console.error("Failed to create public ticket", err);
      toast.error(t("create.error"));
    } finally {
      setSubmitting(false);
    }
  }, [email, name, router, submitting, t, token]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("create.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("create.subtitle")}</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t("link.loading")}</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          {linkInfo ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <span className="font-medium">{t("link.projectLabel")}</span>
              <span className="ml-2 text-muted-foreground">
                {linkInfo.projectName ?? t("link.projectFallback")}
              </span>
            </div>
          ) : null}
          <div className="grid gap-4">
            <label className="space-y-2 text-sm">
              <span className="font-medium">{t("create.fields.name")}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("create.placeholders.name")}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">{t("create.fields.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("create.placeholders.email")}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className={cn(
                "inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium",
                submitting
                  ? "cursor-not-allowed opacity-70"
                  : "hover:bg-muted"
              )}
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? t("create.creating") : t("create.submit")}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
