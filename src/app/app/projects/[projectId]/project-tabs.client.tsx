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
import { ProjectReleasesTab } from "./project-releases-tab.client";
import { ProjectQaDashboard } from "./project-qa-dashboard.client";
import {
  Activity,
  BookOpen,
  FileText,
  FolderTree,
  Home,
  Layers,
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
  | "overview"
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
  | "build"
  | "documentation"
  | "team"
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
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
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
    const tabs: ProjectTab[] = ["overview"];
    if (canViewStructure) tabs.push("structure");
    if (canViewProjectDocumentation) tabs.push("documentation");
    if (canViewAttachments) tabs.push("attachments");
    if (canViewQa) tabs.push("qa");
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
        items: [
          {
            key: "overview",
            label: tTabs("overview"),
            icon: Home,
          },
        ],
      },
      {
        key: "build",
        label: tTabs("build"),
        icon: Layers,
        items: [
          ...(canViewStructure
            ? [{ key: "structure" as const, label: tTabs("structure"), icon: FolderTree }]
            : []),
          ...(canViewQa
            ? [{ key: "qa" as const, label: tTabs("qa"), icon: Activity }]
            : []),
        ],
      },
      {
        key: "documentation",
        label: tTabs("documentation"),
        icon: BookOpen,
        items: [
          ...(canViewProjectDocumentation
            ? [{ key: "documentation" as const, label: tTabs("documentation"), icon: FileText }]
            : []),
          ...(canViewManual
            ? [{ key: "manual" as const, label: tTabs("manual"), icon: BookOpen }]
            : []),
          ...(canViewAttachments
            ? [{ key: "attachments" as const, label: tTabs("attachments"), icon: Paperclip }]
            : []),
          ...(canViewQa
            ? [{ key: "releases" as const, label: tTabs("releases"), icon: Rocket }]
            : []),
        ],
      },
      {
        key: "team",
        label: tTabs("team"),
        icon: Users,
        items: [
          ...(canViewMembers
            ? [{ key: "members" as const, label: tTabs("members"), icon: Users }]
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
      setActiveTab(availableTabs[0] ?? "overview");
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    const activeGroup = navigationGroups.find(
      (group) => group.key === activePrimaryTab,
    );
    if (activeGroup) return;
    setActivePrimaryTab(navigationGroups[0]?.key ?? "overview");
  }, [activePrimaryTab, navigationGroups]);

  const activeGroup = useMemo(
    () =>
      navigationGroups.find((group) => group.key === activePrimaryTab) ??
      navigationGroups[0],
    [activePrimaryTab, navigationGroups],
  );

  function handlePrimaryTabChange(group: ProjectNavigationGroup) {
    setActivePrimaryTab(group.key);
    const firstLocalItem = group.items.find((item) => !item.href);
    if (firstLocalItem) {
      setActiveTab(firstLocalItem.key);
    }
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

      {activeTab === "overview" && (
        hasQaRead ? (
          <ProjectQaDashboard
            token={token}
            projectId={projectId}
            showHeader={false}
          />
        ) : (
          <ProjectOverviewFallback
            project={project}
            structureModules={structureModules}
            membersCount={project.members?.length ?? 0}
            labels={{
              structure: tTabs("structure"),
              features: tTabs("features"),
              members: tTabs("members"),
              documentation: tTabs("documentation"),
              fallbackDescription: tProjectDetail("modules.noDescription"),
            }}
          />
        )
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

function PrimaryTabButton({
  label,
  icon: Icon,
  isActive = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "relative -mb-px inline-flex items-center gap-2 rounded-t-lg border border-transparent px-4 py-3 text-sm font-medium transition",
    isActive
      ? "border-blue-100 bg-blue-50 text-blue-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-600"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
  );

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function SecondaryTabButton({
  label,
  icon: Icon,
  isActive = false,
  onClick,
  href,
}: {
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-blue-100 text-blue-700 shadow-sm"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="h-4 w-4" aria-hidden />
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
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ProjectOverviewFallback({
  project,
  structureModules,
  membersCount,
  labels,
}: {
  project: Project;
  structureModules: StructureModuleNode[];
  membersCount: number;
  labels: {
    structure: string;
    features: string;
    members: string;
    documentation: string;
    fallbackDescription: string;
  };
}) {
  const featureCount = countFeatures(structureModules);
  const documentationLabelsCount = countDocumentationLabels(structureModules);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-slate-950">{project.name}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {project.description?.trim() || labels.fallbackDescription}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetricCard
          label={labels.structure}
          value={structureModules.length}
          icon={FolderTree}
        />
        <OverviewMetricCard
          label={labels.features}
          value={featureCount}
          icon={Layers}
        />
        <OverviewMetricCard
          label={labels.members}
          value={membersCount}
          icon={Users}
        />
        <OverviewMetricCard
          label={labels.documentation}
          value={documentationLabelsCount}
          icon={BookOpen}
        />
      </div>
    </div>
  );
}

function countDocumentationLabels(nodes: StructureModuleNode[]): number {
  const labelIds = new Set<string>();

  function visitModule(node: StructureModuleNode) {
    node.documentationLabels.forEach((label) => labelIds.add(label.labelId));
    node.items.forEach((item) => {
      item.documentationLabels.forEach((label) => labelIds.add(label.labelId));
      if (item.type === "module") {
        visitModule(item);
      }
    });
  }

  nodes.forEach(visitModule);
  return labelIds.size;
}

function OverviewMetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-blue-500" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function countFeatures(nodes: StructureModuleNode[]): number {
  return nodes.reduce((total, node) => {
    const childFeatureCount = node.items.filter(
      (item) => item.type === "feature",
    ).length;
    const childModuleCount = countFeatures(
      node.items.filter(
        (item): item is StructureModuleNode => item.type === "module",
      ),
    );
    return total + childFeatureCount + childModuleCount;
  }, 0);
}
