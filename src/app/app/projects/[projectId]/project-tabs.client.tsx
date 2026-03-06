"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ProjectDetailClient from "@/ui/components/projects/project-detail.client";
import { ProjectQA } from "./project-qa.client";
import { ProjectMembersTab } from "./project-members-tab.client";
import type { FeatureOption } from "./project-qa.types";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Plus } from "lucide-react";
import { ManualLabelsNavbar } from "@/ui/components/manual/manual-labels-navbar.client";
import { ManualTabContent } from "@/ui/components/manual/manual-tab-content.client";
import { ProjectLabelsTab } from "./project-labels-tab.client";
import { EntityDocumentationPanel } from "@/ui/components/documentation/entity-documentation-panel.client";
import { ProjectTrashTab } from "./project-trash-tab.client";
import { ProjectImagesTab } from "./project-images-tab.client";
import type { ProjectPermission, ProjectRole } from "@/lib/api/project-roles";
import { hasPermission } from "@/lib/permissions";

type ProjectTabsProps = {
  project: Project;
  projectId: string;
  structureModules: StructureModuleNode[];
  token: string;
  featureOptions: FeatureOption[];
  currentUserId?: string;
  permissions: string[];
  roles: ProjectRole[];
  permissionsCatalog: ProjectPermission[];
};

type ProjectTab =
  | "structure"
  | "documentation"
  | "images"
  | "qa"
  | "members"
  | "labels"
  | "manual"
  | "trash";

export function ProjectTabs({
  project,
  projectId,
  structureModules,
  token,
  featureOptions,
  currentUserId,
  permissions,
  roles,
  permissionsCatalog,
}: ProjectTabsProps) {
  const tTabs = useTranslations("app.projects.detail.tabs");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tActions = useTranslations("app.projects.detail.actions");
  const tManual = useTranslations("app.projects.manual");
  const [activeTab, setActiveTab] = useState<ProjectTab>("structure");
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canViewStructure = hasPermission(permissionSet, "module.read");
  const canManageStructure = hasPermission(permissionSet, "module.write");
  const canViewQa = hasPermission(permissionSet, "qa.read");
  const canManageQa = hasPermission(permissionSet, "qa.write");
  const canManageLabels = hasPermission(permissionSet, "labels.manage");
  const canManageTrash = hasPermission(permissionSet, "project.delete");
  const canManageMembers = hasPermission(permissionSet, "project.manage_members");
  const canManageRoles = hasPermission(permissionSet, "project.manage_roles");
  const canManageShareLinks = hasPermission(
    permissionSet,
    "project.manage_share_links",
  );
  const canViewProjectDocumentation = canViewQa;
  const canViewImages = canViewQa;
  const canViewMembers = canManageMembers || canManageRoles;
  const canViewLabels = canManageLabels;
  const canViewManual = canViewQa;
  const [roleList, setRoleList] = useState<ProjectRole[]>(roles);

  useEffect(() => {
    setRoleList(roles);
  }, [roles]);

  const availableTabs = useMemo<ProjectTab[]>(() => {
    const tabs: ProjectTab[] = [];
    if (canViewStructure) tabs.push("structure");
    if (canViewProjectDocumentation) tabs.push("documentation");
    if (canViewImages) tabs.push("images");
    if (canViewQa) tabs.push("qa");
    if (canViewMembers) tabs.push("members");
    if (canViewLabels) tabs.push("labels");
    if (canViewManual) tabs.push("manual");
    if (canManageTrash) tabs.push("trash");
    return tabs;
  }, [
    canManageTrash,
    canViewImages,
    canViewLabels,
    canViewManual,
    canViewMembers,
    canViewProjectDocumentation,
    canViewQa,
    canViewStructure,
  ]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? "structure");
    }
  }, [activeTab, availableTabs]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canViewStructure && (
          <TabButton
            label={tTabs("structure")}
            isActive={activeTab === "structure"}
            onClick={() => setActiveTab("structure")}
          />
        )}
        {canViewProjectDocumentation && (
          <TabButton
            label={tTabs("documentation")}
            isActive={activeTab === "documentation"}
            onClick={() => setActiveTab("documentation")}
          />
        )}
        {canViewImages && (
          <TabButton
            label={tTabs("images")}
            isActive={activeTab === "images"}
            onClick={() => setActiveTab("images")}
          />
        )}
        {canViewQa && (
          <TabButton
            label={tTabs("qa")}
            isActive={activeTab === "qa"}
            onClick={() => setActiveTab("qa")}
          />
        )}
        {canViewMembers && (
          <TabButton
            label={tTabs("members")}
            isActive={activeTab === "members"}
            onClick={() => setActiveTab("members")}
          />
        )}
        {canViewLabels && (
          <TabButton
            label={tTabs("labels")}
            isActive={activeTab === "labels"}
            onClick={() => setActiveTab("labels")}
          />
        )}
        {canViewManual && (
          <TabButton
            label={tTabs("manual")}
            isActive={activeTab === "manual"}
            onClick={() => setActiveTab("manual")}
          />
        )}
        {canManageTrash && (
          <TabButton
            label={tTabs("trash", { default: "Trash" })}
            isActive={activeTab === "trash"}
            onClick={() => setActiveTab("trash")}
          />
        )}
        <TabButton
          label={tTabs("dashboard")}
          href={`/app/projects/${projectId}/dashboard`}
        />
      </div>

      {activeTab === "structure" && canViewStructure && (
        <>
          <ProjectDetailClient
            project={project}
            structureModules={structureModules}
            canManageStructure={canManageStructure}
          />
          {canManageStructure && (
            <div>
              <Link
                href={`/app/projects/${project.id}/modules/new`}
                className={actionButtonClass()}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {tActions("addModule")}
              </Link>
            </div>
          )}
        </>
      )}

      {activeTab === "qa" && canViewQa && (
        <ProjectQA
          token={token}
          projectId={projectId}
          featureOptions={featureOptions}
          currentUserId={currentUserId}
          canManageQa={canManageQa}
        />
      )}

      {activeTab === "documentation" && canViewProjectDocumentation && (
        <EntityDocumentationPanel
          token={token}
          entityId={projectId}
          entityType="project"
          projectId={projectId}
        />
      )}

      {activeTab === "images" && canViewImages && (
        <ProjectImagesTab token={token} projectId={projectId} />
      )}
      {activeTab === "members" && canViewMembers && (
        <ProjectMembersTab
          token={token}
          projectId={projectId}
          initialMembers={project.members ?? []}
          canManageMembers={canManageMembers}
          canManageRoles={canManageRoles}
          permissionsCatalog={permissionsCatalog}
          roles={roleList}
          onRolesChange={setRoleList}
          currentUserId={currentUserId}
        />
      )}

      {activeTab === "labels" && canViewLabels && (
        <ProjectLabelsTab
          token={token}
          projectId={projectId}
          canManageLabels={canManageLabels}
          roles={roleList}
        />
      )}

      {activeTab === "manual" && canViewManual && (
        <div className="space-y-4">
          <ManualLabelsNavbar token={token} projectId={projectId} />
          <ManualTabContent
            token={token}
            project={project}
            projectId={projectId}
            focusId={project.id}
            fallbackDescription={tManual("noDescription")}
            expandLabel={tProjectDetail("modules.expandAll", {
              default: "Expand all",
            })}
            collapseLabel={tProjectDetail("modules.collapseAll", {
              default: "Collapse all",
            })}
            title={""}
            hideProjectTitle
            canShareManual={canManageShareLinks}
          />
        </div>
      )}

      {activeTab === "trash" && canManageTrash && (
        <ProjectTrashTab token={token} projectId={projectId} />
      )}
    </section>
  );
}

function TabButton({
  label,
  isActive = false,
  onClick,
  href,
}: {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    "rounded-full border px-3 py-1 text-sm transition",
    isActive
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-muted text-muted-foreground hover:bg-background",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
