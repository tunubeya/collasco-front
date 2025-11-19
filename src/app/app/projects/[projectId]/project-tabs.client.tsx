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

type ProjectTabsProps = {
  project: Project;
  projectId: string;
  structureModules: StructureModuleNode[];
  token: string;
  featureOptions: FeatureOption[];
  currentUserId?: string;
  membershipRole?: ProjectMemberRole | null;
};

type ProjectTab = "structure" | "qa" | "members";

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
  const tActions = useTranslations("app.projects.detail.actions");
  const [activeTab, setActiveTab] = useState<ProjectTab>("structure");
  const canManageStructure =
    membershipRole === ProjectMemberRole.OWNER ||
    membershipRole === ProjectMemberRole.MAINTAINER;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          label={tTabs("structure")}
          isActive={activeTab === "structure"}
          onClick={() => setActiveTab("structure")}
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
      </div>

      {activeTab === "structure" && (
        <>
          <ProjectDetailClient project={project} structureModules={structureModules} />
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
    </section>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:bg-background",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
