"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
};

export function TicketsCreateButton({ token, projectId }: Props) {
  const t = useTranslations("app.tickets.create");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid =
    title.trim().length > 2 && content.trim().length > 5;

  const resetForm = () => {
    setTitle("");
    setContent("");
  };

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createTicket(token, projectId, {
        title: title.trim(),
        content: content.trim(),
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
