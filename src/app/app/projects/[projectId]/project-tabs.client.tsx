"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { ProjectMemberRole } from "@/lib/definitions";
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

type ProjectTabsProps = {
  project: Project;
  projectId: string;
  structureModules: StructureModuleNode[];
  token: string;
  featureOptions: FeatureOption[];
  currentUserId?: string;
  membershipRole?: ProjectMemberRole | null;
};

type ProjectTab =
  | "structure"
  | "documentation"
  | "qa"
  | "members"
  | "labels"
  | "manual";

export function ProjectTabs({
  project,
  projectId,
  structureModules,
  token,
  featureOptions,
  currentUserId,
  membershipRole,
}: ProjectTabsProps) {
  const tTabs = useTranslations("app.projects.detail.tabs");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tActions = useTranslations("app.projects.detail.actions");
  const tManual = useTranslations("app.projects.manual");
  const [activeTab, setActiveTab] = useState<ProjectTab>("structure");
  const canManageStructure =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER;
  const canManageQa =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER ||
    membershipRole === ProjectMemberRole.DEVELOPER;

  const canManageLabels = membershipRole === ProjectMemberRole.OWNER;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          label={tTabs("structure")}
          isActive={activeTab === "structure"}
          onClick={() => setActiveTab("structure")}
        />
        <TabButton
          label={tTabs("documentation")}
          isActive={activeTab === "documentation"}
          onClick={() => setActiveTab("documentation")}
        />
        <TabButton
          label={tTabs("qa")}
          isActive={activeTab === "qa"}
          onClick={() => setActiveTab("qa")}
        />
        <TabButton
          label={tTabs("members")}
          isActive={activeTab === "members"}
          onClick={() => setActiveTab("members")}
        />
        <TabButton
          label={tTabs("labels")}
          isActive={activeTab === "labels"}
          onClick={() => setActiveTab("labels")}
        />
        <TabButton
          label={tTabs("manual")}
          isActive={activeTab === "manual"}
          onClick={() => setActiveTab("manual")}
        />
        <TabButton
          label={tTabs("dashboard")}
          href={`/app/projects/${projectId}/dashboard`}
        />
      </div>

      {activeTab === "structure" && (
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

      {activeTab === "qa" && (
        <ProjectQA
          token={token}
          projectId={projectId}
          featureOptions={featureOptions}
          currentUserId={currentUserId}
          canManageQa={canManageQa}
        />
      )}

      {activeTab === "documentation" && (
        <EntityDocumentationPanel
          token={token}
          entityId={projectId}
          entityType="project"
          projectId={projectId}
        />
      )}
      {activeTab === "members" && (
        <ProjectMembersTab
          token={token}
          projectId={projectId}
          initialMembers={project.members ?? []}
          canManageMembers={membershipRole === ProjectMemberRole.OWNER}
          currentUserId={currentUserId}
        />
      )}

      {activeTab === "labels" && (
        <ProjectLabelsTab
          token={token}
          projectId={projectId}
          canManageLabels={canManageLabels}
        />
      )}

      {activeTab === "manual" && (
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
            title={tTabs("manual")}
          />
        </div>
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
