"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import type { Module } from "@/lib/model-definitions/module";
import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";
import { actionButtonClass } from "@/ui/styles/action-button";
import { ManualLabelsNavbar } from "@/ui/components/manual/manual-labels-navbar.client";
import { EntityDocumentationPanel } from "@/ui/components/documentation/entity-documentation-panel.client";
import { ManualTabContent } from "@/ui/components/manual/manual-tab-content.client";

type ModuleTabsProps = {
  project: Project;
  module: Module;
  structureNode: StructureModuleNode;
  canManageStructure: boolean;
  token: string;
};

type ModuleTab = "structure" | "documentation" | "manual";

export function ModuleTabs({
  project,
  module,
  structureNode,
  canManageStructure,
  token,
}: ModuleTabsProps) {
  const [activeTab, setActiveTab] = useState<ModuleTab>("structure");
  const tModule = useTranslations("app.projects.module");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tProjectTabs = useTranslations("app.projects.detail.tabs");
  const tFeatureTabs = useTranslations("app.projects.feature.tabs");
  const tManual = useTranslations("app.projects.manual");

  const structureLabel = tProjectTabs("structure");
  const documentationLabel = tFeatureTabs("info");
  const manualLabel = tProjectTabs("manual");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          label={structureLabel}
          isActive={activeTab === "structure"}
          onClick={() => setActiveTab("structure")}
        />
        <TabButton
          label={documentationLabel}
          isActive={activeTab === "documentation"}
          onClick={() => setActiveTab("documentation")}
        />
        <TabButton
          label={manualLabel}
          isActive={activeTab === "manual"}
          onClick={() => setActiveTab("manual")}
        />
      </div>

      {activeTab === "structure" && (
        <>
          <StructureTree
            projectId={project.id}
            roots={[structureNode]}
            title={tModule("children.title")}
            emptyLabel={tModule("children.empty")}
            expandLabel={tProjectDetail("modules.expandAll", {
              default: "Expand all",
            })}
            collapseLabel={tProjectDetail("modules.collapseAll", {
              default: "Collapse all",
            })}
            canManageStructure={canManageStructure}
            hideRootModule
          />

          {canManageStructure && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/app/projects/${project.id}/modules/new?parent=${module.id}`}
                className={actionButtonClass()}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {tModule("actions.addChild")}
              </Link>
              <Link
                href={`/app/projects/${project.id}/features/new?moduleId=${module.id}`}
                className={actionButtonClass()}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {tModule("actions.addFeature")}
              </Link>
            </div>
          )}
        </>
      )}

      {activeTab === "documentation" && (
        <EntityDocumentationPanel
          token={token}
          entityId={module.id}
          entityType="module"
          projectId={project.id}
        />
      )}

      {activeTab === "manual" && (
        <div className="space-y-4">
          <ManualLabelsNavbar token={token} projectId={project.id} />
          <ManualTabContent
            token={token}
            project={project}
            projectId={project.id}
            focusId={module.id}
            subtreeRootId={module.id}
            fallbackDescription={tManual("noDescription")}
            expandLabel={tProjectDetail("modules.expandAll", {
              default: "Expand all",
            })}
            collapseLabel={tProjectDetail("modules.collapseAll", {
              default: "Collapse all",
            })}
            title={manualLabel}
          />
        </div>
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
      className={`rounded-full border px-3 py-1 text-sm transition ${
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:bg-background"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
