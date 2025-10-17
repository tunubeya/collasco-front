"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import type {
  FeatureFormState,
} from "@/app/app/projects/[projectId]/features/new/actions";
import {
  FeaturePriority,
  FeatureStatus,
} from "@/lib/definitions";

type ModuleOption = {
  id: string;
  name: string;
  path?: string | null;
};

type FeatureFormProps = {
  mode: "create" | "edit";
  action: (
    prevState: FeatureFormState,
    formData: FormData
  ) => Promise<FeatureFormState>;
  modules: ModuleOption[];
  defaultValues?: {
    name?: string;
    description?: string | null;
    moduleId?: string;
    priority?: FeaturePriority | null;
    status?: FeatureStatus;
  };
  currentModuleId?: string;
};

const FIELD_ERROR_MESSAGES: Record<string, string> = {
  required: "required",
};

const MESSAGE_ERROR_MAP: Record<string, string> = {
  validation_error: "validation",
};

const INITIAL_FEATURE_FORM_STATE: FeatureFormState = {
  fieldErrors: {},
};

export function FeatureForm({
  mode,
  action,
  modules,
  defaultValues,
  currentModuleId,
}: FeatureFormProps) {
  const t = useTranslations("app.projects.feature.form");
  const tCommon = useTranslations("app.common");
  const tStatus = useTranslations("app.common.featureStatus");
  const tPriority = useTranslations("app.common.featurePriority");

  const moduleOptions = useMemo(() => modules, [modules]);
  const statusOptions = useMemo(() => Object.values(FeatureStatus), []);
  const priorityOptions = useMemo(() => Object.values(FeaturePriority), []);

  const [state, dispatch] = useActionState(action, INITIAL_FEATURE_FORM_STATE);

  const nameErrorKey =
    state.fieldErrors?.name &&
    (FIELD_ERROR_MESSAGES[state.fieldErrors.name] ??
      state.fieldErrors.name);
  const moduleErrorKey =
    state.fieldErrors?.moduleId &&
    (FIELD_ERROR_MESSAGES[state.fieldErrors.moduleId] ??
      state.fieldErrors.moduleId);
  const messageKey =
    state.message && (MESSAGE_ERROR_MAP[state.message] ?? "generic");

  return (
    <form
      action={dispatch}
      className="space-y-5 rounded-2xl border bg-background p-6 shadow-sm"
    >
      <input
        type="hidden"
        name="currentModuleId"
        value={currentModuleId ?? defaultValues?.moduleId ?? ""}
      />

      <div className="space-y-2">
        <label
          htmlFor="feature-name"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.name.label")}
        </label>
        <input
          id="feature-name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          minLength={2}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("fields.name.placeholder")}
        />
        {nameErrorKey && (
          <p className="text-xs text-red-600">{t(`errors.${nameErrorKey}`)}</p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="feature-description"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.description.label")}
        </label>
        <textarea
          id="feature-description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("fields.description.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="feature-module"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.module.label")}
        </label>
        <select
          id="feature-module"
          name="moduleId"
          required
          defaultValue={defaultValues?.moduleId ?? ""}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("fields.module.placeholder")}</option>
          {moduleOptions.map((module) => (
            <option key={module.id} value={module.id}>
              {module.path ? module.path : module.name}
            </option>
          ))}
        </select>
        {moduleErrorKey && (
          <p className="text-xs text-red-600">
            {t(`errors.${moduleErrorKey}`)}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="feature-status"
            className="text-sm font-medium text-foreground"
          >
            {t("fields.status.label")}
          </label>
          <select
            id="feature-status"
            name="status"
            defaultValue={defaultValues?.status ?? FeatureStatus.PENDING}
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
            htmlFor="feature-priority"
            className="text-sm font-medium text-foreground"
          >
            {t("fields.priority.label")}
          </label>
          <select
            id="feature-priority"
            name="priority"
            defaultValue={defaultValues?.priority ?? FeaturePriority.MEDIUM}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {tPriority(priority)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {messageKey && (
        <p className="text-sm text-red-600">{t(`errors.${messageKey}`)}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={tCommon(mode === "create" ? "create" : "save")} />
        <span className="text-xs text-muted-foreground">{t("hint")}</span>
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
