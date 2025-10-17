"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import type {
  ProjectFormState,
} from "@/app/app/projects/actions";
import {
  ProjectStatus,
  Visibility,
} from "@/lib/definitions";

type ProjectFormProps = {
  mode: "create" | "edit";
  action: (
    prevState: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>;
  defaultValues?: {
    name?: string;
    description?: string | null;
    repositoryUrl?: string | null;
    status?: ProjectStatus;
    visibility?: Visibility;
  };
};

const FIELD_ERROR_MESSAGES: Record<string, string> = {
  required: "required",
};

const MESSAGE_ERROR_MAP: Record<string, string> = {
  validation_error: "validation",
};

const INITIAL_PROJECT_FORM_STATE: ProjectFormState = {
  fieldErrors: {},
};

export function ProjectForm({
  mode,
  action,
  defaultValues,
}: ProjectFormProps) {
  const t = useTranslations("app.projects.form");
  const tCommon = useTranslations("app.common");
  const tStatus = useTranslations("app.common.projectStatus");
  const tVisibility = useTranslations("app.common.visibility");

  const [state, dispatch] = useActionState(action, INITIAL_PROJECT_FORM_STATE);

  const statusOptions = useMemo(() => Object.values(ProjectStatus), []);
  const visibilityOptions = useMemo(() => Object.values(Visibility), []);

  const nameErrorKey =
    state.fieldErrors?.name &&
    (FIELD_ERROR_MESSAGES[state.fieldErrors.name] ??
      state.fieldErrors.name);
  const messageKey =
    state.message && (MESSAGE_ERROR_MAP[state.message] ?? "generic");

  return (
    <form
      action={dispatch}
      className="space-y-5 rounded-2xl border bg-background p-6 shadow-sm"
    >
      <div className="space-y-2">
        <label
          htmlFor="project-name"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.name.label")}
        </label>
        <input
          id="project-name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          minLength={2}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("fields.name.placeholder")}
        />
        {nameErrorKey && (
          <p className="text-xs text-red-600">
            {t(`errors.${nameErrorKey}`)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="project-description"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.description.label")}
        </label>
        <textarea
          id="project-description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("fields.description.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="project-repository"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.repository.label")}
        </label>
        <input
          id="project-repository"
          name="repositoryUrl"
          type="url"
          defaultValue={defaultValues?.repositoryUrl ?? ""}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("fields.repository.placeholder")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="project-status"
            className="text-sm font-medium text-foreground"
          >
            {t("fields.status.label")}
          </label>
          <select
            id="project-status"
            name="status"
            defaultValue={defaultValues?.status ?? ProjectStatus.ACTIVE}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="project-visibility"
            className="text-sm font-medium text-foreground"
          >
            {t("fields.visibility.label")}
          </label>
          <select
            id="project-visibility"
            name="visibility"
            defaultValue={defaultValues?.visibility ?? Visibility.PRIVATE}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {visibilityOptions.map((visibility) => (
              <option key={visibility} value={visibility}>
                {tVisibility(visibility)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {messageKey && (
        <p className="text-sm text-red-600">
          {t(`errors.${messageKey}`)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={tCommon(mode === "create" ? "create" : "save")} />
        <span className="text-xs text-muted-foreground">
          {t("hint")}
        </span>
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-lg border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}
