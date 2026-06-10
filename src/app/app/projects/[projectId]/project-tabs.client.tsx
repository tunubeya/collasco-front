"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import ProjectDetailClient from "@/ui/components/projects/project-detail.client";
import { ProjectQA } from "./project-qa.client";
import { ProjectMembersTab } from "./project-members-tab.client";
import type { FeatureOption } from "./project-qa.types";
import { actionButtonClass } from "@/ui/styles/action-button";
import {
  AppPrimaryTabButton as PrimaryTabButton,
  AppSecondaryTabButton as SecondaryTabButton,
} from "@/ui/components/tabs/app-tabs";
import { Plus } from "lucide-react";
import { ManualLabelsNavbar } from "@/ui/components/manual/manual-labels-navbar.client";
import { ManualTabContent } from "@/ui/components/manual/manual-tab-content.client";
import { ProjectLabelsTab } from "./project-labels-tab.client";
import { EntityDocumentationPanel } from "@/ui/components/documentation/entity-documentation-panel.client";
import { ProjectTrashTab } from "./project-trash-tab.client";
import { ProjectImagesTab } from "./project-images-tab.client";
import type { ProjectPermission, ProjectRole } from "@/lib/api/project-roles";
import { hasPermission } from "@/lib/permissions";
import { ProjectReleasesTab } from "./project-releases-tab.client";
import { ProjectQaDashboard } from "./project-qa-dashboard.client";
import {
  Activity,
  Archive,
  BookOpen,
  FileText,
  FolderTree,
  Home,
  Paperclip,
  Rocket,
  Settings,
  Tags,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

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
  canViewQa?: boolean;
};

type ProjectTab =
  | "qaOverview"
  | "structure"
  | "documentation"
  | "attachments"
  | "qa"
  | "releases"
  | "members"
  | "labels"
  | "manual"
  | "trash";

type ProjectPrimaryTab =
  | "overview"
  | "documentation"
  | "planning"
  | "quality"
  | "delivery"
  | "settings";

type ProjectNavigationItem = {
  key: ProjectTab;
  label: string;
  icon: LucideIcon;
  href?: string;
};

type ProjectNavigationGroup = {
  key: ProjectPrimaryTab;
  label: string;
  icon: LucideIcon;
  items: ProjectNavigationItem[];
};

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
  canViewQa: canViewQaProp,
}: ProjectTabsProps) {
  const tTabs = useTranslations("app.projects.detail.tabs");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tActions = useTranslations("app.projects.detail.actions");
  const tManual = useTranslations("app.projects.manual");
  const [activePrimaryTab, setActivePrimaryTab] =
    useState<ProjectPrimaryTab>("overview");
  const [activeTab, setActiveTab] = useState<ProjectTab>("structure");
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canViewProject = hasPermission(permissionSet, "project.read");
  const canViewStructure = canViewProject || hasPermission(permissionSet, "module.read");
  const canManageStructure = hasPermission(permissionSet, "module.write");
  const hasQaRead = canViewQaProp ?? hasPermission(permissionSet, "qa.read");
  const canViewQa = hasQaRead;
  const canManageQa = hasPermission(permissionSet, "qa.write");
  const canManageLabels = hasPermission(permissionSet, "labels.manage");
  const canManageTrash = hasPermission(permissionSet, "project.delete");
  const canManageMembers = hasPermission(permissionSet, "project.manage_members");
  const canManageRoles = hasPermission(permissionSet, "project.manage_roles");
  const canManageShareLinks = hasPermission(
    permissionSet,
    "project.manage_share_links",
  );
  const canViewProjectDocumentation = canViewProject || hasQaRead;
  const canViewAttachments = canViewProject || hasQaRead;
  const canViewMembers = canManageMembers || canManageRoles;
  const canViewLabels = canManageLabels;
  const canViewManual = canViewProject || hasQaRead;
  const [roleList, setRoleList] = useState<ProjectRole[]>(roles);

  useEffect(() => {
    setRoleList(roles);
  }, [roles]);

  const availableTabs = useMemo<ProjectTab[]>(() => {
    const tabs: ProjectTab[] = [];
    if (canViewStructure) tabs.push("structure");
    if (canViewProjectDocumentation) tabs.push("documentation");
    if (canViewAttachments) tabs.push("attachments");
    if (canViewQa) tabs.push("qa");
    if (canViewQa) tabs.push("qaOverview");
    if (canViewQa) tabs.push("releases");
    if (canViewMembers) tabs.push("members");
    if (canViewLabels) tabs.push("labels");
    if (canViewManual) tabs.push("manual");
    if (canManageTrash) tabs.push("trash");
    return tabs;
  }, [
    canManageTrash,
    canViewAttachments,
    canViewLabels,
    canViewManual,
    canViewMembers,
    canViewProjectDocumentation,
    canViewQa,
    canViewStructure,
  ]);

  const navigationGroups = useMemo<ProjectNavigationGroup[]>(() => {
    const groups: ProjectNavigationGroup[] = [
      {
        key: "overview",
        label: tTabs("overview"),
        icon: Home,
        items: canViewStructure
          ? [{ key: "structure", label: tTabs("structure"), icon: FolderTree }]
          : [],
      },
      {
        key: "documentation",
        label: tTabs("documentation"),
        icon: BookOpen,
        items: [
          ...(canViewProjectDocumentation
            ? [{ key: "documentation" as const, label: tTabs("sections"), icon: FileText }]
            : []),
          ...(canViewManual
            ? [{ key: "manual" as const, label: tTabs("manual"), icon: BookOpen }]
            : []),
          ...(canViewAttachments
            ? [{ key: "attachments" as const, label: tTabs("attachments"), icon: Paperclip }]
            : []),
        ],
      },
      {
        key: "quality",
        label: tTabs("quality"),
        icon: Activity,
        items: [
          ...(canViewQa
            ? [{ key: "qa" as const, label: tTabs("qa"), icon: Activity }]
            : []),
          ...(canViewQa
            ? [{ key: "qaOverview" as const, label: tTabs("overview"), icon: Home }]
            : []),
        ],
      },
      {
        key: "delivery",
        label: tTabs("delivery"),
        icon: Rocket,
        items: [
          ...(canViewQa
            ? [{ key: "releases" as const, label: tTabs("releases"), icon: Archive }]
            : []),
        ],
      },
      {
        key: "settings",
        label: tTabs("settings"),
        icon: Settings,
        items: [
          ...(canViewLabels
            ? [{ key: "labels" as const, label: tTabs("labels"), icon: Tags }]
            : []),
          ...(canViewMembers
            ? [{ key: "members" as const, label: tTabs("members"), icon: Users }]
            : []),
          ...(canManageTrash
            ? [{ key: "trash" as const, label: tTabs("trash", { default: "Trash" }), icon: Trash2 }]
            : []),
        ],
      },
    ];

    return groups.filter((group) => group.items.length > 0);
  }, [
    canManageTrash,
    canViewAttachments,
    canViewLabels,
    canViewManual,
    canViewMembers,
    canViewProjectDocumentation,
    canViewQa,
    canViewStructure,
    tTabs,
  ]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? "structure");
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    const activeGroup = navigationGroups.find(
      (group) => group.key === activePrimaryTab,
    );
    if (activeGroup) return;
    const fallbackGroup = navigationGroups[0];
    setActivePrimaryTab(fallbackGroup?.key ?? "overview");
    if (fallbackGroup?.items[0]) {
      setActiveTab(fallbackGroup.items[0].key);
    }
  }, [activePrimaryTab, navigationGroups]);

  const activeGroup = useMemo(
    () =>
      navigationGroups.find((group) => group.key === activePrimaryTab) ??
      navigationGroups[0],
    [activePrimaryTab, navigationGroups],
  );

  function handlePrimaryTabChange(group: ProjectNavigationGroup) {
    setActivePrimaryTab(group.key);
    const activeItem = group.items.find((item) => item.key === activeTab);
    setActiveTab(activeItem?.key ?? group.items[0]?.key ?? "structure");
  }

  const showSecondaryNavigation = activeGroup?.key !== "overview";

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 pt-3">
          {navigationGroups.map((group) => (
            <PrimaryTabButton
              key={group.key}
              label={group.label}
              icon={group.icon}
              isActive={activePrimaryTab === group.key}
              onClick={() => handlePrimaryTabChange(group)}
            />
          ))}
        </div>

        {activeGroup && showSecondaryNavigation ? (
          <div className="flex flex-wrap gap-2 px-3 py-3">
            {activeGroup.items.map((item) => (
              <SecondaryTabButton
                key={`${activeGroup.key}-${item.key}-${item.href ?? "local"}`}
                label={item.label}
                icon={item.icon}
                href={item.href}
                isActive={!item.href && activeTab === item.key}
                onClick={() => {
                  if (item.href) return;
                  setActiveTab(item.key);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeTab === "qaOverview" && hasQaRead && (
        <ProjectQaDashboard
          token={token}
          projectId={projectId}
          showHeader={false}
        />
      )}

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

      {activeTab === "releases" && canViewQa && (
        <ProjectReleasesTab
          token={token}
          projectId={projectId}
          canManageQa={canManageQa}
        />
      )}

      {activeTab === "documentation" && canViewProjectDocumentation && (
        <EntityDocumentationPanel
          token={token}
          entityId={projectId}
          entityType="project"
          projectId={projectId}
          entityName={project.name}
        />
      )}

      {activeTab === "attachments" && canViewAttachments && (
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
