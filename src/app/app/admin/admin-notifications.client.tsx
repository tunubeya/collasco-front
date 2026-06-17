"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  createAllNotification,
  createUserNotification,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

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
    <section className="max-w-3xl rounded-lg border bg-white p-6 space-y-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "user"] as Scope[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition",
              scope === value
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {t(`scopes.${value}`)}
          </button>
        ))}
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium">{t("fields.title")}</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder={t("placeholders.title")}
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">{t("fields.message")}</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="w-full rounded-md border px-3 py-2"
          placeholder={t("placeholders.message")}
        />
      </label>

      {requiresUser ? (
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("fields.userEmail")}</span>
          <input
            type="email"
            value={userEmail}
            onChange={(event) => setUserEmail(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder={t("placeholders.userEmail")}
          />
        </label>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:opacity-40"
        >
          {isSubmitting ? t("sending") : t("send")}
        </button>
      </div>
    </section>
  );
}
