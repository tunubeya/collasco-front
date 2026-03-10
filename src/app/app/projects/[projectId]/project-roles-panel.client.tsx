"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createProjectRole,
  deleteProjectRole,
  listProjectRoles,
  updateProjectRole,
  type ProjectPermission,
  type ProjectRole,
} from "@/lib/api/project-roles";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogTrigger,
} from "@/ui/components/dialog/dialog";
import { cn } from "@/lib/utils";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type RoleFormValues = {
  name: string;
  description: string;
  permissionKeys: string[];
};

const DEFAULT_FORM_VALUES: RoleFormValues = {
  name: "",
  description: "",
  permissionKeys: [],
};

type ProjectRolesPanelProps = {
  token: string;
  projectId: string;
  roles: ProjectRole[];
  permissionsCatalog: ProjectPermission[];
  canManageRoles: boolean;
  onRolesChange: (roles: ProjectRole[]) => void;
};

export function ProjectRolesPanel({
  token,
  projectId,
  roles,
  permissionsCatalog,
  canManageRoles,
  onRolesChange,
}: ProjectRolesPanelProps) {
  const t = useTranslations("app.projects.roles");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<ProjectRole | null>(null);
  const [formValues, setFormValues] = useState<RoleFormValues>({
    ...DEFAULT_FORM_VALUES,
  });

  const sortedRoles = useMemo(() => {
    return roles.slice().sort((a, b) => {
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  const sortedPermissions = useMemo(() => {
    return permissionsCatalog
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [permissionsCatalog]);

  const refreshRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await listProjectRoles(token, projectId);
      onRolesChange(next);
    } catch (error) {
      toast.error(t("messages.loadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onRolesChange, projectId, t, token]);

  useEffect(() => {
    if (!roles.length) {
      void refreshRoles();
    }
  }, [refreshRoles, roles.length]);

  const openCreateDialog = useCallback(() => {
    setEditingRole(null);
    setFormValues({ ...DEFAULT_FORM_VALUES });
    setFormError(null);
    setFormOpen(true);
  }, []);

  const openEditDialog = useCallback((role: ProjectRole) => {
    setEditingRole(role);
    setFormValues({
      name: role.name ?? "",
      description: role.description ?? "",
      permissionKeys: role.permissionKeys ?? [],
    });
    setFormError(null);
    setFormOpen(true);
  }, []);

  const closeDialog = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingRole(null);
      setFormValues({ ...DEFAULT_FORM_VALUES });
      setFormError(null);
      setIsSaving(false);
    }
  }, []);

  const togglePermission = useCallback((key: string) => {
    setFormValues((prev) => {
      const next = new Set(prev.permissionKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return {
        ...prev,
        permissionKeys: Array.from(next),
      };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formValues.name.trim()) {
      setFormError(t("validation.name"));
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingRole) {
        await updateProjectRole(token, projectId, editingRole.id, {
          name: formValues.name.trim(),
          description: formValues.description.trim() || null,
          permissionKeys: formValues.permissionKeys,
        });
        toast.success(t("messages.updated"));
      } else {
        await createProjectRole(token, projectId, {
          name: formValues.name.trim(),
          description: formValues.description.trim() || null,
          permissionKeys: formValues.permissionKeys,
        });
        toast.success(t("messages.created"));
      }
      closeDialog(false);
      void refreshRoles();
    } catch (error) {
      toast.error(t("messages.saveError"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setIsSaving(false);
    }
  }, [
    closeDialog,
    editingRole,
    formValues.description,
    formValues.name,
    formValues.permissionKeys,
    projectId,
    refreshRoles,
    t,
    token,
  ]);

  const handleDelete = useCallback(
    async (role: ProjectRole) => {
      if (role.isOwner || role.memberCount > 0) return;
      const confirmed = window.confirm(
        t("messages.deleteConfirm", { name: role.name }),
      );
      if (!confirmed) return;
      try {
        await deleteProjectRole(token, projectId, role.id);
        toast.success(t("messages.deleted"));
        void refreshRoles();
      } catch (error) {
        toast.error(t("messages.deleteError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [projectId, refreshRoles, t, token],
  );

  if (!canManageRoles) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("messages.manageOnly")}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-lg font-semibold">{t("title")}</h4>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          className={actionButtonClass()}
          onClick={openCreateDialog}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {t("actions.add")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("messages.loading")}
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
          <p className="font-semibold">{t("empty.title")}</p>
          <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("table.role")}</th>
                <th className="px-3 py-2">{t("table.description")}</th>
                <th className="px-3 py-2">{t("table.permissions")}</th>
                <th className="px-3 py-2">{t("table.members")}</th>
                <th className="px-3 py-2 text-right">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRoles.map((role) => {
                const disableDelete = role.isOwner || role.memberCount > 0;
                return (
                  <tr key={role.id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{role.name}</span>
                        {role.isOwner && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-primary">
                            {t("badges.owner")}
                          </span>
                        )}
                        {role.isDefault && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                            {t("badges.default")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {role.description || "-"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {role.permissionKeys?.length ?? 0}
                    </td>
                    <td className="px-3 py-3 text-xs">{role.memberCount}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded border border-border bg-background p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          onClick={() => openEditDialog(role)}
                          disabled={role.isOwner}
                          aria-label={t("actions.edit")}
                          title={t("actions.edit")}
                        >
                          <Pencil className="h-3 w-3" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border bg-background p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          onClick={() => void handleDelete(role)}
                          disabled={disableDelete}
                          aria-label={t("actions.delete")}
                          title={
                            disableDelete
                              ? t("messages.cannotDelete")
                              : t("actions.delete")
                          }
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={closeDialog}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="m-4 max-w-2xl rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeading className="text-lg font-semibold">
            {editingRole ? t("dialog.editTitle") : t("dialog.createTitle")}
          </DialogHeading>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("dialog.description")}
          </DialogDescription>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isSaving && canManageRoles) {
                void handleSubmit();
              }
            }}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("form.name")}
              </label>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues({ ...formValues, name: event.target.value })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("form.namePlaceholder")}
                disabled={!canManageRoles || Boolean(editingRole?.isOwner)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("form.description")}
              </label>
              <textarea
                value={formValues.description}
                onChange={(event) =>
                  setFormValues({ ...formValues, description: event.target.value })
                }
                className="min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("form.descriptionPlaceholder")}
                disabled={!canManageRoles || Boolean(editingRole?.isOwner)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("form.permissions")}
                </label>
                <span className="text-xs text-muted-foreground">
                  {t("form.permissionsCount", {
                    count: formValues.permissionKeys.length,
                  })}
                </span>
              </div>

              {(() => {
                const groups: Record<string, ProjectPermission[]> = {
                  project: [],
                  module: [],
                  feature: [],
                  qa: [],
                  labels: [],
                  other: [],
                };

                sortedPermissions.forEach((p) => {
                  const prefix = p.key.split(".")[0];
                  if (prefix && prefix in groups) {
                    groups[prefix].push(p);
                  } else {
                    groups.other.push(p);
                  }
                });

                return Object.entries(groups)
                  .filter(([, items]) => items.length > 0)
                  .map(([key, items]) => (
                    <div key={key} className="space-y-3 rounded-xl border bg-muted/5 p-4">
                      <div>
                        <h5 className="font-bold text-sm text-foreground">
                          {t(`form.permissionGroups.${key}.label`)}
                        </h5>
                        <p className="text-[11px] text-muted-foreground">
                          {t(`form.permissionGroups.${key}.description`)}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {items.map((permission) => {
                          const checked = formValues.permissionKeys.includes(
                            permission.key,
                          );
                          const translationKey = permission.key.replace(/\./g, "_");
                          return (
                            <label
                              key={permission.key}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all hover:bg-background",
                                checked
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "border-border bg-background/50",
                              )}
                            >
                              <div className="flex h-5 items-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(permission.key)}
                                  disabled={
                                    !canManageRoles || Boolean(editingRole?.isOwner)
                                  }
                                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5 leading-none">
                                <span className="text-xs font-semibold">
                                  {t(`form.permissionsList.${translationKey}.label`, {
                                    default: permission.key ?? "",
                                  })}
                                </span>
                                <span className="text-[10px] text-muted-foreground line-clamp-2">
                                  {t(
                                    `form.permissionsList.${translationKey}.description`,
                                    { default: permission.description ?? "" },
                                  )}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ));
              })()}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogActions
              closeLabel={t("actions.cancel")}
              confirmLabel={isSaving ? t("actions.saving") : t("actions.save")}
              onConfirm={() => {
                if (!isSaving && canManageRoles) {
                  void handleSubmit();
                }
              }}
            />
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
