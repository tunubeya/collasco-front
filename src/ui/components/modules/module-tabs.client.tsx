"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import type { Module } from "@/lib/model-definitions/module";
import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";
import { actionButtonClass } from "@/ui/styles/action-button";
import {
  ManualOutline,
  buildProjectManualTree,
} from "@/ui/components/manual/manual-outline.client";

type ModuleTabsProps = {
  project: Project;
  module: Module;
  structureNode: StructureModuleNode;
  structureModules: StructureModuleNode[];
  canManageStructure: boolean;
};

type ModuleTab = "structure" | "details" | "manual";

export function ModuleTabs({
  project,
  module,
  structureNode,
  structureModules,
  canManageStructure,
}: ModuleTabsProps) {
  const [activeTab, setActiveTab] = useState<ModuleTab>("structure");
  const tModule = useTranslations("app.projects.module");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tProjectTabs = useTranslations("app.projects.detail.tabs");
  const tFeatureTabs = useTranslations("app.projects.feature.tabs");
  const tManual = useTranslations("app.projects.manual");

  const structureLabel = tProjectTabs("structure");
  const detailsLabel = tFeatureTabs("info");
  const manualLabel = tProjectTabs("manual");

  const manualTree = useMemo(
    () => buildProjectManualTree(project, structureModules),
    [project, structureModules],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          label={structureLabel}
          isActive={activeTab === "structure"}
          onClick={() => setActiveTab("structure")}
        />
        <TabButton
          label={detailsLabel}
          isActive={activeTab === "details"}
          onClick={() => setActiveTab("details")}
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

      {activeTab === "details" && (
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {module.description ?? tModule("description.empty")}
          </p>
        </div>
      )}

      {activeTab === "manual" && (
        <ManualOutline
          root={manualTree}
          focusId={module.id}
          fallbackDescription={tManual("noDescription")}
          expandLabel={tProjectDetail("modules.expandAll", {
            default: "Expand all",
          })}
          collapseLabel={tProjectDetail("modules.collapseAll", {
            default: "Collapse all",
          })}
          title={manualLabel}
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
