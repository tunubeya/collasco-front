"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createTicket } from "@/lib/api/tickets";
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

type Props = {
  token: string;
  projectId: string;
  featureId: string;
  onCreated?: () => void;
};

export function FeatureTicketCreateButton({
  token,
  projectId,
  featureId,
  onCreated,
}: Props) {
  const t = useTranslations("app.projects.feature.ticketDialog");
  const tActions = useTranslations("app.projects.feature.actions");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const isValid =
    title.trim().length > 2 && content.trim().length > 5;

  useEffect(() => {
    if (open) {
      setError(null);
      setTimeout(() => {
        titleRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createTicket(token, projectId, {
        title: title.trim(),
        content: content.trim(),
        featureId,
      });
      setOpen(false);
      resetForm();
      toast.success(t("messages.success"));
      onCreated?.();
    } catch (err) {
      console.error("[FeatureTicketCreateButton] create error:", err);
      const message = t("messages.error");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={actionButtonClass({ size: "xs" })}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        {tActions("addTicket", { default: "+Ticket" })}
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
            ref={titleRef}
            label={t("fields.title")}
            placeholder={t("placeholders.title")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="border border-border"
          />
          <Textarea
            label={t("fields.content")}
            placeholder={t("placeholders.content")}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={5}
            className="border border-border"
          />

          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <DialogClose>{t("actions.cancel")}</DialogClose>
            <button
              type="submit"
              className={actionButtonClass()}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting
                ? t("actions.creating")
                : t("actions.create")}
            </button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
