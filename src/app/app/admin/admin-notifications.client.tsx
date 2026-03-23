"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import type { NotificationType } from "@/lib/model-definitions/notification";
import type { Project } from "@/lib/model-definitions/project";
import {
  createAllNotification,
  createProjectNotification,
  createUserNotification,
} from "@/lib/api/notifications";
import { listProjectRoles } from "@/lib/api/project-roles";
import { cn } from "@/lib/utils";

type Scope = "all" | "project" | "user";

type Props = {
  token: string;
  projects: Project[];
};

const notificationTypes: NotificationType[] = ["INFO", "SUCCESS", "WARNING", "ERROR"];

export default function AdminNotifications({ token, projects }: Props) {
  const t = useTranslations("app.admin.notifications");
  const [scope, setScope] = useState<Scope>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [projectId, setProjectId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectOptions = useMemo(
    () =>
      projects
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((project) => ({ id: project.id, name: project.name })),
    [projects]
  );

  const requiresProject = scope === "project";
  const requiresUser = scope === "user";

  const isValid =
    title.trim() &&
    message.trim() &&
    (!requiresProject || projectId) &&
    (!requiresUser || userEmail.trim());

  useEffect(() => {
    if (!requiresProject || !projectId) {
      setRoles([]);
      setSelectedRoles([]);
      return;
    }
    let alive = true;
    setIsLoadingRoles(true);
    listProjectRoles(token, projectId)
      .then((items) => {
        if (!alive) return;
        const mapped = items.map((role) => ({ id: role.id, name: role.name }));
        setRoles(mapped);
        setSelectedRoles([]);
      })
      .catch(() => {
        if (!alive) return;
        toast.error(t("errors.roles"));
        setRoles([]);
        setSelectedRoles([]);
      })
      .finally(() => {
        if (!alive) return;
        setIsLoadingRoles(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId, requiresProject, t, token]);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (scope === "all") {
        const result = await createAllNotification(token, {
          title: title.trim(),
          message: message.trim(),
          type,
        });
        toast.success(
          t("successAll", { count: result.created })
        );
      } else if (scope === "project") {
        const result = await createProjectNotification(token, projectId, {
          title: title.trim(),
          message: message.trim(),
          type,
          roleNames: selectedRoles.length ? selectedRoles : undefined,
        });
        toast.success(
          t("successProject", { count: result.created })
        );
      } else {
        await createUserNotification(token, {
          email: userEmail.trim(),
          title: title.trim(),
          message: message.trim(),
          type,
        });
        toast.success(t("successUser"));
      }
      setTitle("");
      setMessage("");
      setSelectedRoles([]);
      if (scope === "user") setUserEmail("");
    } catch (error) {
      toast.error(t("error"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "project", "user"] as Scope[]).map((value) => (
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

      <div className="grid gap-4 md:grid-cols-2">
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
          <span className="font-medium">{t("fields.type")}</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as NotificationType)
            }
            className="w-full rounded-md border px-3 py-2"
          >
            {notificationTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      {requiresProject ? (
        <div className="space-y-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("fields.project")}</span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">{t("placeholders.project")}</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          {projectId ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("fields.roles")}</p>
              {isLoadingRoles ? (
                <p className="text-xs text-muted-foreground">
                  {t("loadingRoles")}
                </p>
              ) : roles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("emptyRoles")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const checked = selectedRoles.includes(role.name);
                    return (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
                          checked ? "border-primary bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = new Set(selectedRoles);
                            if (event.target.checked) {
                              next.add(role.name);
                            } else {
                              next.delete(role.name);
                            }
                            setSelectedRoles(Array.from(next));
                          }}
                        />
                        <span>{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

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

      <div className="flex items-center justify-between gap-3">
        {requiresProject ? (
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        ) : (
          <span />
        )}
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
