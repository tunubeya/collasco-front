"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createTicket } from "@/lib/api/tickets";
import { MISSING_TICKET_DESCRIPTION } from "@/lib/tickets-constants";
import { actionButtonClass } from "@/ui/styles/action-button";

type Props = {
  token: string;
  projectId?: string | null;
};

export function TicketsCreateButton({ token, projectId }: Props) {
  const t = useTranslations("app.tickets.create");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (!projectId) {
      toast.error(t("messages.projectRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      const ticket = await createTicket(token, projectId, {
        title: t("title"),
        content: MISSING_TICKET_DESCRIPTION,
      });
      toast.success(t("messages.success"));
      router.push(`/app/tickets/${ticket.id}`);
    } catch (error) {
      console.error("[TicketsCreateButton] create error:", error);
      toast.error(t("messages.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    projectId,
    router,
    t,
    token,
  ]);

  return (
    <button
      type="button"
      className={actionButtonClass({ size: "sm", className: "text-sm" })}
      onClick={() => void handleSubmit()}
    >
      <Plus className="mr-2 h-4 w-4" aria-hidden />
      {isSubmitting ? t("actions.creating") : t("actions.create")}
    </button>
  );
}
