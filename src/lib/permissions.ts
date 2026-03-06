import type { ProjectRole } from "@/lib/api/project-roles";
import type { Project } from "@/lib/model-definitions/project";
import type { ProjectMember } from "@/lib/model-definitions/project-member";

export function resolveMemberRoleId({
  project,
  members,
  currentUserId,
  roles,
}: {
  project: Project;
  members?: ProjectMember[] | null;
  currentUserId?: string | null;
  roles: ProjectRole[];
}): string | null {
  if (!currentUserId) return null;
  const ownerRoleId = roles.find((role) => role.isOwner)?.id ?? null;
  const member = members?.find((item) => item.userId === currentUserId);
  if (member?.roleId) return member.roleId;
  if (member?.role?.id) return member.role.id;
  if (project.ownerId === currentUserId) return ownerRoleId;
  return project.membershipRoleId ?? project.membershipRole ?? null;
}

export function resolveRolePermissions(
  roles: ProjectRole[],
  roleId: string | null | undefined
): string[] {
  if (!roleId) return [];
  return roles.find((role) => role.id === roleId)?.permissionKeys ?? [];
}

export function hasPermission(
  permissions: string[] | Set<string> | null | undefined,
  key: string
): boolean {
  if (!permissions) return false;
  if (permissions instanceof Set) return permissions.has(key);
  return permissions.includes(key);
}
