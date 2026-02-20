"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CreateQaProjectLabelDto,
  QaLabelRole,
  QaProjectLabel,
  createProjectLabel,
  deleteProjectLabel,
  listProjectLabels,
  reorderProjectLabelOrder,
  updateProjectLabel,
} from "@/lib/api/qa";
import { actionButtonClass } from "@/ui/styles/action-button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogTrigger,
} from "@/ui/components/dialog/dialog";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type ProjectLabelsTabProps = {
  token: string;
  projectId: string;
  canManageLabels: boolean;
};

type LabelFormValues = {
  name: string;
  isMandatory: boolean;
  isNotApplicableByDefault: boolean;
  visibleToRoles: QaLabelRole[];
  readOnlyRoles: QaLabelRole[];
};

const DEFAULT_FORM_VALUES: LabelFormValues = {
  name: "",
  isMandatory: false,
  isNotApplicableByDefault: false,
  visibleToRoles: [],
  readOnlyRoles: [],
};

const DEFAULT_ROLE_OPTIONS: QaLabelRole[] = [
  "OWNER",
  "MAINTAINER",
  "DEVELOPER",
  "VIEWER",
];

export function ProjectLabelsTab({
  token,
  projectId,
  canManageLabels,
}: ProjectLabelsTabProps) {
  const t = useTranslations("app.projects.labels");
  const tReorder = useTranslations("app.projects.labels.reorder");
  const tRoles = useTranslations("app.projects.labels.roleNames");
  const [labels, setLabels] = useState<QaProjectLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<QaProjectLabel | null>(null);
  const [formValues, setFormValues] = useState<LabelFormValues>({
    ...DEFAULT_FORM_VALUES,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const roleOptions = useMemo(() => {
    const roleSet = new Set<QaLabelRole>(DEFAULT_ROLE_OPTIONS);
    labels.forEach((label) => {
      label.visibleToRoles?.forEach((role) => roleSet.add(role));
      label.readOnlyRoles?.forEach((role) => roleSet.add(role));
    });
    return Array.from(roleSet);
  }, [labels]);

  const getRoleLabel = useCallback(
    (role: QaLabelRole) => {
      try {
        return tRoles(role);
      } catch {
        return role;
      }
    },
    [tRoles],
  );

  const fetchLabels = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listProjectLabels(token, projectId);
      setLabels(data);
    } catch (error) {
      toast.error(t("messages.loadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void fetchLabels();
  }, [fetchLabels]);

  const openCreateDialog = useCallback(() => {
    setEditingLabel(null);
    setFormValues({ ...DEFAULT_FORM_VALUES });
    setFormError(null);
    setFormOpen(true);
  }, []);

  const openEditDialog = useCallback((label: QaProjectLabel) => {
    setEditingLabel(label);
    setFormValues({
      name: label.name ?? "",
      isMandatory: Boolean(label.isMandatory),
      isNotApplicableByDefault: Boolean(label.defaultNotApplicable),
      visibleToRoles: label.visibleToRoles ?? [],
      readOnlyRoles: label.readOnlyRoles ?? [],
    });
    setFormError(null);
    setFormOpen(true);
  }, []);

  const closeDialog = useCallback(
    (open: boolean) => {
      setFormOpen(open);
      if (!open) {
        setEditingLabel(null);
        setFormValues({ ...DEFAULT_FORM_VALUES });
        setFormError(null);
        setIsSaving(false);
      }
    },
    [],
  );

  const toggleRole = useCallback(
    (role: QaLabelRole, list: "visibleToRoles" | "readOnlyRoles") => {
      setFormValues((prev) => {
        const current = new Set(prev[list]);
        if (current.has(role)) {
          current.delete(role);
        } else {
          current.add(role);
        }
        let nextVisible = prev.visibleToRoles;
        let nextReadOnly = prev.readOnlyRoles;
        if (list === "visibleToRoles") {
          nextVisible = Array.from(current);
          nextReadOnly = prev.readOnlyRoles.filter((value) =>
            nextVisible.includes(value),
          );
        } else {
          nextReadOnly = Array.from(current);
          nextVisible = Array.from(new Set([...prev.visibleToRoles, role]));
        }
        return {
          ...prev,
          visibleToRoles: nextVisible,
          readOnlyRoles: nextReadOnly,
        };
      });
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!formValues.name.trim()) {
      setFormError(t("validation.name"));
      return;
    }
    setFormError(null);
    setIsSaving(true);
    const payload: CreateQaProjectLabelDto = {
      name: formValues.name.trim(),
      isMandatory: formValues.isMandatory,
      visibleToRoles: formValues.visibleToRoles,
      readOnlyRoles: formValues.readOnlyRoles,
    };
    try {
      if (editingLabel) {
        payload.defaultNotApplicable = formValues.isNotApplicableByDefault;
        await updateProjectLabel(token, projectId, editingLabel.id, payload);
        toast.success(t("messages.updated"));
      } else {
        payload.defaultNotApplicable = formValues.isNotApplicableByDefault;
        await createProjectLabel(token, projectId, payload);
        toast.success(t("messages.created"));
      }
      closeDialog(false);
      void fetchLabels();
    } catch (error) {
      toast.error(t("messages.saveError"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setIsSaving(false);
    }
  }, [closeDialog, editingLabel, fetchLabels, formValues, projectId, t, token]);

  const handleDelete = useCallback(
    async (label: QaProjectLabel) => {
      const confirmed = window.confirm(
        t("messages.deleteConfirm", { name: label.name }),
      );
      if (!confirmed) return;
      setDeletingId(label.id);
      try {
        await deleteProjectLabel(token, projectId, label.id);
        toast.success(t("messages.deleted"));
        void fetchLabels();
      } catch (error) {
        toast.error(t("messages.deleteError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [fetchLabels, projectId, t, token],
  );

  const handleReorder = useCallback(
    async (label: QaProjectLabel, newIndex: number) => {
      if (!canManageLabels) return;
      if (newIndex < 0 || newIndex >= labels.length) return;
      setReorderingId(label.id);
      try {
        const updated = await reorderProjectLabelOrder(
          token,
          projectId,
          label.id,
          newIndex,
        );
        setLabels(updated);
        toast.success(tReorder("success"));
      } catch (error) {
        toast.error(tReorder("error"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setReorderingId(null);
      }
    },
    [canManageLabels, labels.length, projectId, tReorder, token],
  );

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManageLabels && (
          <button
            type="button"
            className={actionButtonClass()}
            onClick={openCreateDialog}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("actions.add")}
          </button>
        )}
      </header>

      {!canManageLabels && (
        <p className="text-xs text-muted-foreground">{t("messages.ownerOnly")}</p>
      )}

      {isLoading ? (
        <LabelsSkeleton />
      ) : labels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 px-6 py-10 text-center">
          <p className="font-semibold">{t("empty.title")}</p>
          {canManageLabels && (
            <button
              type="button"
              className={cn(actionButtonClass(), "mt-4")}
              onClick={openCreateDialog}
            >
              {t("empty.action")}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("table.name")}</th>
                <th className="px-3 py-2">{t("table.mandatory")}</th>
                <th className="px-3 py-2">{t("table.visibleToRoles")}</th>
                <th className="px-3 py-2">{t("table.readOnlyRoles")}</th>
                {canManageLabels && (
                  <th className="px-3 py-2 text-right">{t("table.actions")}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labels.map((label, index) => (
                <tr key={label.id} className="align-top">
                  <td className="px-3 py-3 font-medium">{label.name}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                        label.isMandatory
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {label.isMandatory
                        ? t("table.mandatoryYes")
                        : t("table.mandatoryNo")}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <RoleList
                      values={label.visibleToRoles ?? []}
                      getLabel={getRoleLabel}
                    />
                  </td>
                  <td className="px-3 py-3">
                    {label.readOnlyRoles?.length ? (
                      <RoleList
                        values={label.readOnlyRoles ?? []}
                        getLabel={getRoleLabel}
                        tone="warning"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("table.noReadOnly")}
                      </p>
                    )}
                  </td>
                  {canManageLabels && (
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="rounded border border-border bg-background p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                            aria-label={tReorder("moveUp")}
                            title={tReorder("moveUp")}
                            disabled={reorderingId === label.id || index === 0}
                            onClick={() => void handleReorder(label, index - 1)}
                          >
                            {reorderingId === label.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <ArrowUp className="h-3 w-3" aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            className="rounded border border-border bg-background p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                            aria-label={tReorder("moveDown")}
                            title={tReorder("moveDown")}
                            disabled={
                              reorderingId === label.id || index === labels.length - 1
                            }
                            onClick={() => void handleReorder(label, index + 1)}
                          >
                            {reorderingId === label.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3 w-3" aria-hidden />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          className={actionButtonClass({
                            variant: "neutral",
                            size: "xs",
                          })}
                          onClick={() => openEditDialog(label)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("actions.edit")}
                        </button>
                        <button
                          type="button"
                          className={actionButtonClass({
                            variant: "destructive",
                            size: "xs",
                          })}
                          onClick={() => void handleDelete(label)}
                          disabled={deletingId === label.id}
                        >
                          {deletingId === label.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                          )}
                          {t("actions.delete")}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LabelFormDialog
        open={formOpen}
        onOpenChange={closeDialog}
        values={formValues}
        setValues={setFormValues}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        isEditing={Boolean(editingLabel)}
        error={formError}
        canManageLabels={canManageLabels}
        roleOptions={roleOptions}
        toggleRole={toggleRole}
        getRoleLabel={getRoleLabel}
      />
    </section>
  );
}

function LabelsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="h-16 w-full animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function RoleList({
  values,
  getLabel,
  tone = "default",
}: {
  values: QaLabelRole[];
  getLabel: (role: QaLabelRole) => string;
  tone?: "default" | "warning";
}) {
  if (!values?.length) {
    return (
      <p className="text-xs text-muted-foreground">—</p>
    );
  }
  const base =
    tone === "warning"
      ? "bg-amber-100 text-amber-900"
      : "bg-muted text-foreground";
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((role) => (
        <span
          key={role}
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
            base,
          )}
        >
          {getLabel(role)}
        </span>
      ))}
    </div>
  );
}

function LabelFormDialog({
  open,
  onOpenChange,
  values,
  setValues,
  onSubmit,
  isSaving,
  isEditing,
  error,
  canManageLabels,
  roleOptions,
  toggleRole,
  getRoleLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: LabelFormValues;
  setValues: Dispatch<SetStateAction<LabelFormValues>>;
  onSubmit: () => void | Promise<void>;
  isSaving: boolean;
  isEditing: boolean;
  error: string | null;
  canManageLabels: boolean;
  roleOptions: QaLabelRole[];
  toggleRole: (role: QaLabelRole, list: "visibleToRoles" | "readOnlyRoles") => void;
  getRoleLabel: (role: QaLabelRole) => string;
}) {
  const t = useTranslations("app.projects.labels");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="m-4 max-w-lg rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-lg font-semibold">
          {isEditing ? t("dialog.editTitle") : t("dialog.createTitle")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("dialog.description")}
        </DialogDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isSaving && canManageLabels) {
              onSubmit();
            }
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("fields.name")}
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(event) =>
                setValues({ ...values, name: event.target.value })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("fields.namePlaceholder")}
              disabled={!canManageLabels}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values.isMandatory}
              onChange={(event) =>
                setValues({ ...values, isMandatory: event.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              disabled={!canManageLabels}
            />
            {t("fields.isMandatory")}
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values.isNotApplicableByDefault}
              onChange={(event) =>
                setValues({
                  ...values,
                  isNotApplicableByDefault: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              disabled={!canManageLabels}
            />
            {t("fields.isNotApplicableByDefault")}
          </label>

          <RoleCheckboxGroup
            title={t("fields.visibleToRoles")}
            helper={t("fields.visibleToRolesHint")}
            values={values.visibleToRoles}
            roleOptions={roleOptions}
            onToggle={(role) => toggleRole(role, "visibleToRoles")}
            getRoleLabel={getRoleLabel}
            disabled={!canManageLabels}
          />

          <RoleCheckboxGroup
            title={t("fields.readOnlyRoles")}
            helper={t("fields.readOnlyRolesHint")}
            values={values.readOnlyRoles}
            roleOptions={roleOptions}
            onToggle={(role) => toggleRole(role, "readOnlyRoles")}
            getRoleLabel={getRoleLabel}
            disabled={!canManageLabels}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogActions
            closeLabel={t("actions.cancel")}
            confirmLabel={isSaving ? t("actions.saving") : t("actions.save")}
            onConfirm={() => {
              if (!isSaving && canManageLabels) {
                void onSubmit();
              }
              return false;
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleCheckboxGroup({
  title,
  helper,
  values,
  roleOptions,
  onToggle,
  getRoleLabel,
  disabled,
}: {
  title: string;
  helper: string;
  values: QaLabelRole[];
  roleOptions: QaLabelRole[];
  onToggle: (role: QaLabelRole) => void;
  getRoleLabel: (role: QaLabelRole) => string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {roleOptions.map((role) => (
          <label key={role} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", values.includes(role) ? "border-primary bg-primary/5 font-semibold" : "border-border bg-background")}>
            <input
              type="checkbox"
              checked={values.includes(role)}
              onChange={() => onToggle(role)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              disabled={disabled}
            />
            <span>{getRoleLabel(role)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
