"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import type {
  ModuleFormState,
} from "@/app/app/projects/[projectId]/modules/new/actions";

type ModuleOption = {
  id: string;
  name: string;
  path?: string | null;
};

type ModuleFormProps = {
  mode: "create" | "edit";
  action: (
    prevState: ModuleFormState,
    formData: FormData
  ) => Promise<ModuleFormState>;
  defaultValues?: {
    name?: string;
    description?: string | null;
    parentModuleId?: string | null;
  };
  parentOptions: ModuleOption[];
  disabledOptionId?: string;
};

const FIELD_ERROR_MESSAGES: Record<string, string> = {
  required: "required",
  invalid_parent: "invalidParent",
};

const MESSAGE_ERROR_MAP: Record<string, string> = {
  validation_error: "validation",
};

const INITIAL_MODULE_FORM_STATE: ModuleFormState = {
  fieldErrors: {},
};

export function ModuleForm({
  mode,
  action,
  defaultValues,
  parentOptions,
  disabledOptionId,
}: ModuleFormProps) {
  const t = useTranslations("app.projects.module.form");
  const tCommon = useTranslations("app.common");

  const [state, dispatch] = useActionState(action, INITIAL_MODULE_FORM_STATE);
  const messageKey =
    state.message && (MESSAGE_ERROR_MAP[state.message] ?? "generic");

  const options = useMemo(
    () =>
      parentOptions.filter((option) => option.id !== disabledOptionId),
    [parentOptions, disabledOptionId]
  );

  const nameErrorKey =
    state.fieldErrors?.name &&
    (FIELD_ERROR_MESSAGES[state.fieldErrors.name] ??
      state.fieldErrors.name);
  const parentErrorKey =
    state.fieldErrors?.parentModuleId &&
    (FIELD_ERROR_MESSAGES[state.fieldErrors.parentModuleId] ??
      state.fieldErrors.parentModuleId);

  return (
    <form
      action={dispatch}
      className="space-y-5 rounded-2xl border bg-background p-6 shadow-sm"
    >
      <div className="space-y-2">
        <label
          htmlFor="module-name"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.name.label")}
        </label>
        <input
          id="module-name"
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
          htmlFor="module-description"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.description.label")}
        </label>
        <textarea
          id="module-description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t("fields.description.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="module-parent"
          className="text-sm font-medium text-foreground"
        >
          {t("fields.parent.label")}
        </label>
        <select
          id="module-parent"
          name="parentModuleId"
          defaultValue={defaultValues?.parentModuleId ?? ""}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("fields.parent.rootOption")}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.path ? option.path : option.name}
            </option>
          ))}
        </select>
        {parentErrorKey && (
          <p className="text-xs text-red-600">
            {t(`errors.${parentErrorKey}`)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("fields.parent.hint")}</p>
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
