"use client";

import { useState } from "react";
import { BellRing, Send, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  createAllNotification,
  createUserNotification,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import { actionButtonClass } from "@/ui/styles/action-button";

type Scope = "all" | "user";

type Props = {
  token: string;
};

async function getErrorMessage(error: unknown) {
  if (error instanceof Response) {
    try {
      const contentType = error.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await error.json()) as unknown;
        if (typeof body === "string") return body;
        if (body && typeof body === "object" && "message" in body) {
          const message = (body as { message?: string | string[] }).message;
          if (Array.isArray(message)) return message.join(" ");
          if (message) return message;
        }
      }
      const text = await error.text();
      if (text) return text;
    } catch {
      return null;
    }
  }
  return null;
}

export default function AdminNotifications({ token }: Props) {
  const t = useTranslations("app.admin.notifications");
  const [scope, setScope] = useState<Scope>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresUser = scope === "user";

  const isValid =
    title.trim() &&
    message.trim() &&
    (!requiresUser || userEmail.trim());

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (scope === "all") {
        const result = await createAllNotification(token, {
          title: title.trim(),
          message: message.trim(),
        });
        toast.success(
          t("successAll", { count: result.created })
        );
      } else {
        await createUserNotification(token, {
          email: userEmail.trim(),
          title: title.trim(),
          message: message.trim(),
        });
        toast.success(t("successUser"));
      }
      setTitle("");
      setMessage("");
      if (scope === "user") setUserEmail("");
    } catch (error) {
      const errorMessage = await getErrorMessage(error);
      toast.error(errorMessage ?? t("error"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-4xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-primary">
            <BellRing className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <form
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div>
          <p className="text-sm font-medium text-slate-900">{t("audience")}</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {(["all", "user"] as Scope[]).map((value) => {
              const Icon = value === "all" ? Users : UserRound;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    scope === value
                      ? "border-primary bg-blue-100 text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-blue-100/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0",
                      scope === value ? "text-primary" : "text-slate-500"
                    )}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      {t(`scopes.${value}`)}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      {t(`scopeHints.${value}`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {requiresUser ? (
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-900">{t("fields.userEmail")}</span>
            <input
              type="email"
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus-visible:border-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              placeholder={t("placeholders.userEmail")}
            />
          </label>
        ) : null}

        <div className="grid gap-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-900">{t("fields.title")}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus-visible:border-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              placeholder={t("placeholders.title")}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-900">{t("fields.message")}</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 focus-visible:border-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              placeholder={t("placeholders.message")}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={actionButtonClass({
              className: "gap-2 disabled:translate-y-0",
            })}
          >
            <Send className="h-4 w-4" aria-hidden />
            {isSubmitting ? t("sending") : t("send")}
          </button>
        </div>
      </form>
    </section>
  );
}
