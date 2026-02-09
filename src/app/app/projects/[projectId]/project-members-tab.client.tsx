"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ProjectMember } from "@/lib/model-definitions/project";
import { ProjectMemberRole } from "@/lib/definitions";
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
} from "@/lib/api/project-members";
import { Button } from "@/ui/components/button";
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
import { Plus } from "lucide-react";

type ProjectMembersTabProps = {
  token: string;
  projectId: string;
  initialMembers: ProjectMember[];
  canManageMembers: boolean;
  currentUserId?: string;
};

const ROLE_OPTIONS: ProjectMemberRole[] = [
  ProjectMemberRole.OWNER,
  ProjectMemberRole.MAINTAINER,
  ProjectMemberRole.DEVELOPER,
  ProjectMemberRole.VIEWER,
];

export function ProjectMembersTab({
  token,
  projectId,
  initialMembers,
  canManageMembers,
  currentUserId,
}: ProjectMembersTabProps) {
  const t = useTranslations("app.projects.members");
  const formatter = useFormatter();
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (initialMembers?.length) {
      setMembers(initialMembers);
    }
  }, [initialMembers]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listProjectMembers(token, projectId);
      setMembers(data);
    } catch (error) {
      toast.error(t("messages.loadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const sortedMembers = useMemo(() => {
    const order = {
      [ProjectMemberRole.OWNER]: 0,
      [ProjectMemberRole.MAINTAINER]: 1,
      [ProjectMemberRole.DEVELOPER]: 2,
      [ProjectMemberRole.VIEWER]: 3,
    };
    return [...members].sort((a, b) => order[a.role] - order[b.role]);
  }, [members]);

  const handleAddMember = useCallback(
    async (email: string, role?: ProjectMemberRole) => {
      try {
        await addProjectMember(token, projectId, { email, role });
        toast.success(t("messages.added"));
        void fetchMembers();
      } catch (error) {
        toast.error(t("messages.addError"), {
          description: error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [fetchMembers, projectId, t, token],
  );

  const handleRoleChange = useCallback(
    async (userId: string, role: ProjectMemberRole) => {
      try {
        await updateProjectMemberRole(token, projectId, userId, { role });
        toast.success(t("messages.roleUpdated"));
        void fetchMembers();
      } catch (error) {
        toast.error(t("messages.updateError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [fetchMembers, projectId, t, token],
  );

  const handleRemove = useCallback(
    async (userId: string) => {
      try {
        await removeProjectMember(token, projectId, userId);
        toast.success(t("messages.removed"));
        void fetchMembers();
      } catch (error) {
        toast.error(t("messages.removeError"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [fetchMembers, projectId, t, token],
  );

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManageMembers && (
          <button
            type="button"
            className={actionButtonClass()}
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("actions.add")}
          </button>
        )}
      </header>

      {!canManageMembers && (
        <p className="text-xs text-muted-foreground">{t("messages.ownerOnly")}</p>
      )}

      {isLoading ? (
        <MembersSkeleton />
      ) : members.length === 0 ? (
        <EmptyMembersState />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("table.member")}</th>
                <th className="px-3 py-2">{t("table.role")}</th>
                <th className="px-3 py-2">{t("table.joined")}</th>
                <th className="px-3 py-2 text-right">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedMembers.map((member) => {
                const user = member.user;
                const joinedAt = formatter.dateTime(new Date(member.joinedAt), {
                  dateStyle: "medium",
                });
                const isCurrentUser = user?.id === currentUserId;
                const disableRoleChange =
                  !canManageMembers || member.role === ProjectMemberRole.OWNER;
                return (
                  <tr key={member.userId} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold">
                        {user?.name ?? t("table.unknown")}
                        {isCurrentUser && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t("badges.you")}
                          </span>
                        )}
                        {member.role === ProjectMemberRole.OWNER && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-primary">
                            {t("roles.owner")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleRoleChange(member.userId, event.target.value as ProjectMemberRole)
                        }
                        disabled={disableRoleChange}
                        className={cn(
                          "rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary",
                          disableRoleChange && "cursor-not-allowed bg-muted",
                        )}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role} disabled={role === ProjectMemberRole.OWNER && member.role !== ProjectMemberRole.OWNER}>
                            {t(`roles.${role.toLowerCase() as Lowercase<ProjectMemberRole>}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{joinedAt}</td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          member.role === ProjectMemberRole.OWNER ||
                          !canManageMembers
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              t("messages.removeConfirm", {
                                name: user?.name ?? user?.email ?? member.userId,
                              }),
                            )
                          ) {
                            void handleRemove(member.userId);
                          }
                        }}
                      >
                        {t("actions.remove")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canManageMembers && (
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddMember}
        />
      )}
    </section>
  );
}

function MembersSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

function EmptyMembersState() {
  const t = useTranslations("app.projects.members");
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <p className="font-semibold">{t("empty.title")}</p>
      <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string, role?: ProjectMemberRole) => Promise<void>;
}) {
  const t = useTranslations("app.projects.members");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>(ProjectMemberRole.DEVELOPER);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole(ProjectMemberRole.DEVELOPER);
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError(t("validation.email"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(email.trim(), role);
      onOpenChange(false);
    } catch {
      // handled upstream
    } finally {
      setIsSubmitting(false);
    }
  }, [email, onOpenChange, onSubmit, role, t]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="m-4 max-w-md rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-lg font-semibold">{t("addDialog.title")}</DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("addDialog.description")}
        </DialogDescription>
        <form
          className="mt-4 space-y-4"
          onKeyDown={handleKeyDown}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.email")}
            />
            <p className="text-[11px] text-muted-foreground">{t("hints.email")}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.role")}
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as ProjectMemberRole)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`roles.${option.toLowerCase() as Lowercase<ProjectMemberRole>}`)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogActions
            closeLabel={t("actions.cancel")}
            confirmLabel={isSubmitting ? t("actions.saving") : t("actions.save")}
            onConfirm={() => {
              if (!isSubmitting) {
                void handleSubmit();
              }
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
