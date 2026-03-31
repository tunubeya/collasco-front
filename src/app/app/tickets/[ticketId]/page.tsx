import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getTicket } from "@/lib/api/tickets";
import { fetchProjectById, fetchProjectStructure } from "@/lib/data";
import { listProjectMembers } from "@/lib/api/project-members";
import { listProjectRoles, type ProjectRole } from "@/lib/api/project-roles";
import { fetchGetUserProfile } from "@/lib/data";
import { handlePageError } from "@/lib/handle-page-error";
import { hasPermission, resolveMemberRoleId, resolveRolePermissions } from "@/lib/permissions";
import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { Breadcrumb } from "@/ui/components/navigation/Breadcrumb";
import { UnauthorizedView } from "@/ui/components/error-unauthorized-view";
import { TicketDetailView } from "./ticket-detail.client";
import { findModulePath } from "@/lib/structure-helpers";
import type { StructureModuleNode } from "@/lib/definitions";

type Params = { ticketId: string };
type Props = { params: Promise<Params> };

export default async function TicketDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const { ticketId } = await params;
  const t = await getTranslations("app.tickets.detail");

  let ticket = null;
  try {
    ticket = await getTicket(session.token, ticketId);
  } catch (error) {
    if (error instanceof Response && error.status === 404) {
      notFound();
    }
    await handlePageError(error);
  }

  if (!ticket) notFound();

  let project = null;
  try {
    project = await fetchProjectById(session.token, ticket.projectId);
  } catch (error) {
    await handlePageError(error);
  }

  if (!project) notFound();

  let currentUserId: string | null = null;
  try {
    const profile = await fetchGetUserProfile(session.token);
    currentUserId = profile.id;
  } catch (error) {
    await handlePageError(error);
  }

  let roles: ProjectRole[] = [];
  let members = project.members ?? [];
  try {
    roles = await listProjectRoles(session.token, project.id);
    if (!members.length) {
      members = await listProjectMembers(session.token, project.id);
    }
  } catch (error) {
    await handlePageError(error);
  }

  const roleId = resolveMemberRoleId({
    project,
    members,
    currentUserId,
    roles,
  });
  const permissionKeys = resolveRolePermissions(roles, roleId);
  const permissionSet = new Set(permissionKeys);

  const canReadAll = hasPermission(permissionSet, "ticket.read_all");
  const canReadOwn = hasPermission(permissionSet, "ticket.read_own");
  const isOwner = Boolean(currentUserId && ticket.createdById === currentUserId);
  const canReadTicket = canReadAll || (canReadOwn && isOwner);
  if (!canReadTicket) {
    return (
      <div className="grid gap-6">
        <Breadcrumb items={[{ label: t("breadcrumb.ticket") }]} className="mb-2" />
        <UnauthorizedView />
      </div>
    );
  }

  const canManageTicket = hasPermission(permissionSet, "ticket.manage");
  const canRespondTicket = hasPermission(permissionSet, "ticket.respond") || isOwner;
  const canAccessImages = canReadAll || isOwner;

  let modulePath: StructureModuleNode[] = [];
  if (ticket.feature?.moduleId) {
    try {
      const structure = await fetchProjectStructure(session.token, project.id, {
        limit: 1000,
        sort: "sortOrder",
      });
      const path = findModulePath(structure.modules, ticket.feature.moduleId);
      modulePath = path ?? [];
    } catch (error) {
      await handlePageError(error);
    }
  }

  const breadcrumbItems = [
    {
      label: project.name,
      href: `/app/projects/${project.id}`,
    },
    ...modulePath.map((module) => ({
      label: module.name,
      href: `/app/projects/${project.id}/modules/${module.id}`,
    })),
    ...(ticket.feature?.id
      ? [
          {
            label: ticket.feature.name ?? t("breadcrumb.featureFallback"),
            href: `/app/projects/${project.id}/features/${ticket.feature.id}`,
          },
        ]
      : []),
    { label: ticket.title || t("breadcrumb.ticket") },
  ];

  return (
    <TicketDetailView
      token={session.token}
      projectId={project.id}
      ticket={ticket}
      members={members}
      canManageTicket={canManageTicket}
      canRespondTicket={canRespondTicket}
      canAccessImages={canAccessImages}
      currentUserId={currentUserId}
      breadcrumbItems={breadcrumbItems}
    />
  );
}
