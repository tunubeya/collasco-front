"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Calendar, User } from "lucide-react";
import { toast } from "sonner";

import type { ProjectMember } from "@/lib/model-definitions/project";
import type {
  TicketDetail,
  TicketSectionType,
  TicketStatus,
  TicketFeature,
} from "@/lib/model-definitions/ticket";
import {
  addTicketSection,
  autocompleteTicketFeatures,
  updateTicket,
} from "@/lib/api/tickets";
import { actionButtonClass } from "@/ui/styles/action-button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

type Props = {
  token: string;
  projectId: string;
  ticket: TicketDetail;
  members: ProjectMember[];
  canManageTicket: boolean;
  canRespondTicket: boolean;
};

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "PENDING", "RESOLVED"];
const SECTION_TYPES: TicketSectionType[] = ["RESPONSE", "COMMENT"];

export function TicketDetailView({
  token,
  projectId,
  ticket,
  members,
  canManageTicket,
  canRespondTicket,
}: Props) {
  const t = useTranslations("app.tickets.detail");
  const tList = useTranslations("app.tickets.list");
  const format = useFormatter();

  const [ticketState, setTicketState] = useState<TicketDetail>(ticket);
  const [title, setTitle] = useState(ticket.title);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assigneeId, setAssigneeId] = useState<string | null>(
    ticket.assigneeId ?? null
  );

  const [featureQuery, setFeatureQuery] = useState(
    ticket.feature?.name ?? ""
  );
  const [featureId, setFeatureId] = useState<string | null>(
    ticket.feature?.id ?? null
  );
  const [featureOptions, setFeatureOptions] = useState<TicketFeature[]>([]);
  const debouncedQuery = useDebounce(featureQuery, 300);
  const [featureLoading, setFeatureLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sectionType, setSectionType] =
    useState<TicketSectionType>("RESPONSE");
  const [sectionContent, setSectionContent] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);

  const assigneeOptions = useMemo(
    () =>
      members
        .map((member) => ({
          id: member.userId,
          name:
            member.user?.name ??
            member.user?.email ??
            t("assignee.unknown"),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members, t]
  );

  const assigneeLabel = useMemo(() => {
    if (!assigneeId) return tList("meta.unassigned");
    const match = assigneeOptions.find((option) => option.id === assigneeId);
    return match?.name ?? t("assignee.unknown");
  }, [assigneeId, assigneeOptions, t, tList]);

  const sections = useMemo(
    () => ticketState.sections ?? [],
    [ticketState.sections]
  );

  useEffect(() => {
    setTicketState(ticket);
    setTitle(ticket.title);
    setStatus(ticket.status);
    setAssigneeId(ticket.assigneeId ?? null);
    setFeatureId(ticket.feature?.id ?? null);
    setFeatureQuery(ticket.feature?.name ?? "");
  }, [ticket]);

  useEffect(() => {
    if (!canManageTicket) return;
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setFeatureOptions([]);
      return;
    }
    let active = true;
    setFeatureLoading(true);
    autocompleteTicketFeatures(token, projectId, debouncedQuery)
      .then((items) => {
        if (!active) return;
        setFeatureOptions(items ?? []);
      })
      .catch((error) => {
        console.error("[TicketDetailView] feature search error:", error);
      })
      .finally(() => {
        if (active) setFeatureLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canManageTicket, debouncedQuery, projectId, token]);

  const handleSave = useCallback(async () => {
    if (!canManageTicket) return;
    setSaving(true);
    try {
      const payload: {
        title?: string;
        status?: TicketStatus;
        assigneeId?: string | null;
        featureId?: string | null;
      } = {};
      if (title.trim() !== ticketState.title) payload.title = title.trim();
      if (status !== ticketState.status) payload.status = status;
      if ((assigneeId ?? null) !== (ticketState.assigneeId ?? null)) {
        payload.assigneeId = assigneeId ?? null;
      }
      if ((featureId ?? null) !== (ticketState.featureId ?? null)) {
        payload.featureId = featureId ?? null;
      }

      if (Object.keys(payload).length === 0) {
        toast.info(t("messages.noChanges"));
        return;
      }

      const updated = await updateTicket(token, ticketState.id, payload);
      setTicketState((prev) => ({
        ...prev,
        ...updated,
        featureId: updated.featureId ?? featureId ?? null,
        assigneeId: updated.assigneeId ?? assigneeId ?? null,
        title: updated.title ?? title,
        status: updated.status ?? status,
      }));
      toast.success(t("messages.updated"));
    } catch (error) {
      console.error("[TicketDetailView] update error:", error);
      toast.error(t("messages.updateError"));
    } finally {
      setSaving(false);
    }
  }, [
    assigneeId,
    canManageTicket,
    featureId,
    status,
    t,
    ticketState,
    title,
    token,
  ]);

  const handleAddSection = useCallback(async () => {
    if (!canRespondTicket || !sectionContent.trim()) return;
    setSectionSaving(true);
    try {
      const created = await addTicketSection(token, ticketState.id, {
        type: sectionType,
        content: sectionContent.trim(),
      });
      setTicketState((prev) => ({
        ...prev,
        sections: [...(prev.sections ?? []), created],
      }));
      setSectionContent("");
      toast.success(t("messages.sectionAdded"));
    } catch (error) {
      console.error("[TicketDetailView] add section error:", error);
      toast.error(t("messages.sectionError"));
    } finally {
      setSectionSaving(false);
    }
  }, [
    canRespondTicket,
    sectionContent,
    sectionType,
    t,
    ticketState.id,
    token,
  ]);

  const createdAt = format.dateTime(new Date(ticketState.createdAt), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const updatedAt = ticketState.updatedAt
    ? format.dateTime(new Date(ticketState.updatedAt), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const createdBy =
    ticketState.createdBy?.name ??
    ticketState.createdBy?.email ??
    t("assignee.unknown");
  return (
    <div className="grid gap-6">
      <header className="rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{ticketState.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {t("meta.createdBy", { name: createdBy })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {t("meta.assignedTo", { name: assigneeLabel })}
              </span>
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {tList(`statuses.${ticketState.status}`, {
                  default: ticketState.status,
                })}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 text-right">
            <div className="flex items-center justify-end gap-1">
              <Calendar className="h-3 w-3" />
              {t("meta.createdAt", { date: createdAt })}
            </div>
            {updatedAt ? (
              <div className="flex items-center justify-end gap-1">
                <Calendar className="h-3 w-3" />
                {t("meta.updatedAt", { date: updatedAt })}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-background p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("sections.details")}</h2>
          {canManageTicket ? (
            <button
              type="button"
              className={actionButtonClass({ size: "xs" })}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? t("actions.saving") : t("actions.save")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.title")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.status")}
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TicketStatus)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {tList(`statuses.${item}`, { default: item })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.assignee")}
            </label>
            <select
              value={assigneeId ?? ""}
              onChange={(event) =>
                setAssigneeId(event.target.value || null)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            >
              <option value="">{t("assignee.unassigned")}</option>
              {assigneeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
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
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              disabled={!canManageTicket}
            />
            {canManageTicket && featureLoading ? (
              <p className="text-xs text-muted-foreground">
                {t("messages.loadingFeatures")}
              </p>
            ) : null}
            {canManageTicket && featureOptions.length > 0 ? (
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
                        {option.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-background p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("sections.activity")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("meta.sectionsCount", { count: sections.length })}
          </span>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {sections.map((section) => {
              const created = format.dateTime(
                new Date(section.createdAt),
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                }
              );
              const author =
                section.author?.name ??
                section.author?.email ??
                t("assignee.unknown");
              return (
                <li key={section.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold">
                      {t(`sectionTypes.${section.type}`, {
                        default: section.type,
                      })}
                    </span>
                    <span>{created}</span>
                  </div>
                  {section.title ? (
                    <p className="mt-2 text-sm font-semibold">
                      {section.title}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm whitespace-pre-line">
                    {section.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("meta.createdBy", { name: author })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {canRespondTicket ? (
          <div className="mt-4 space-y-3 rounded-lg border bg-muted/10 p-4">
            <h3 className="text-sm font-semibold">{t("sections.add")}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("fields.type")}
                </label>
                <select
                  value={sectionType}
                  onChange={(event) =>
                    setSectionType(event.target.value as TicketSectionType)
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SECTION_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {t(`sectionTypes.${item}`, { default: item })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("fields.content")}
              </label>
              <textarea
                rows={4}
                value={sectionContent}
                onChange={(event) => setSectionContent(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("placeholders.content")}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className={actionButtonClass({ size: "xs" })}
                onClick={() => void handleAddSection()}
                disabled={sectionSaving || !sectionContent.trim()}
              >
                {sectionSaving
                  ? t("actions.saving")
                  : t("actions.addSection")}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
