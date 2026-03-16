"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createTicket, autocompleteTicketFeatures } from "@/lib/api/tickets";
import type { TicketFeature } from "@/lib/model-definitions/ticket";
import { actionButtonClass } from "@/ui/styles/action-button";
import {
  Dialog,
  DialogContent,
  DialogHeading,
  DialogDescription,
  DialogClose,
} from "@/ui/components/dialog/dialog";
import { Input } from "@/ui/components/form/input";
import { Textarea } from "@/ui/components/form/textarea";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  projectId: string;
};

export function TicketsCreateButton({ token, projectId }: Props) {
  const t = useTranslations("app.tickets.create");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [featureQuery, setFeatureQuery] = useState("");
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [featureOptions, setFeatureOptions] = useState<TicketFeature[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedQuery = useDebounce(featureQuery, 300);

  const isValid =
    title.trim().length > 2 && content.trim().length > 5;

  useEffect(() => {
    if (!open) return;
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setFeatureOptions([]);
      return;
    }
    let active = true;
    setLoadingFeatures(true);
    autocompleteTicketFeatures(token, projectId, debouncedQuery)
      .then((items) => {
        if (!active) return;
        setFeatureOptions(items ?? []);
      })
      .catch((error) => {
        console.error("[TicketsCreateButton] feature search error:", error);
      })
      .finally(() => {
        if (active) setLoadingFeatures(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, open, projectId, token]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setFeatureQuery("");
    setFeatureId(null);
    setFeatureOptions([]);
  };

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createTicket(token, projectId, {
        title: title.trim(),
        content: content.trim(),
        featureId: featureId ?? undefined,
      });
      toast.success(t("messages.success"));
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("[TicketsCreateButton] create error:", error);
      toast.error(t("messages.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content,
    featureId,
    isSubmitting,
    isValid,
    projectId,
    router,
    t,
    title,
    token,
  ]);

  return (
    <>
      <button
        type="button"
        className={actionButtonClass({ size: "xs" })}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        {t("actions.create")}
      </button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetForm();
            setIsSubmitting(false);
          }
        }}
      >
        <DialogContent className="m-4 w-[min(92vw,520px)] rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeading className="text-lg font-semibold">
            {t("title")}
          </DialogHeading>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("description")}
          </DialogDescription>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <Input
              label={t("fields.title")}
              placeholder={t("placeholders.title")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="border border-border bg-white"
            />
            <Textarea
              label={t("fields.content")}
              placeholder={t("placeholders.content")}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              className="border border-border bg-white"
            />
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("fields.feature")}
              </label>
              <input
                type="text"
                value={featureQuery}
                onChange={(event) => {
                  setFeatureQuery(event.target.value);
                  if (!event.target.value) {
                    setFeatureId(null);
                  }
                }}
                placeholder={t("placeholders.feature")}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {loadingFeatures ? (
                <p className="text-xs text-muted-foreground">
                  {t("messages.loadingFeatures")}
                </p>
              ) : null}
              {featureOptions.length > 0 ? (
                <div className="rounded-lg border bg-white p-2 text-sm">
                  <ul className="space-y-1">
                    {featureOptions.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-md px-2 py-1 text-left hover:bg-muted",
                            option.id === featureId
                              ? "bg-muted font-semibold"
                              : ""
                          )}
                          onClick={() => {
                            setFeatureId(option.id);
                            setFeatureQuery(option.name);
                            setFeatureOptions([]);
                          }}
                        >
                          <div className="text-sm font-medium">
                            {option.name}
                          </div>
                          {option.path ? (
                            <div className="text-xs text-muted-foreground">
                              {option.path}
                            </div>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <DialogClose>{t("actions.cancel")}</DialogClose>
              <button
                type="submit"
                className={actionButtonClass()}
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? t("actions.creating") : t("actions.save")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
