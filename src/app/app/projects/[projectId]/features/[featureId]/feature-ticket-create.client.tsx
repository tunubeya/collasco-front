"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createTicket } from "@/lib/api/tickets";
import { MISSING_TICKET_DESCRIPTION } from "@/lib/tickets-constants";
import { actionButtonClass } from "@/ui/styles/action-button";

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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ticket = await createTicket(token, projectId, {
        title: t("title"),
        content: MISSING_TICKET_DESCRIPTION,
        featureId,
      });
      toast.success(t("messages.success"));
      onCreated?.();
      router.push(`/app/tickets/${ticket.id}`);
    } catch (err) {
      console.error("[FeatureTicketCreateButton] create error:", err);
      const message = t("messages.error");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      className={actionButtonClass({ size: "xs" })}
      onClick={() => void handleCreate()}
      disabled={isSubmitting}
    >
      <Plus className="mr-2 h-4 w-4" aria-hidden />
      {isSubmitting ? t("actions.creating") : tActions("addTicket", { default: "+Ticket" })}
    </button>
  );
}
