// src/ui/components/projects/project-detail.client.tsx
"use client";

import { useTranslations } from "next-intl";

import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";

export default function ProjectDetailClient({
  project,
  structureModules,
  canManageStructure = false,
}: {
  project: Project;
  structureModules: StructureModuleNode[];
  canManageStructure?: boolean;
}) {
  const t = useTranslations("app.projects.detail");

  return (
    <StructureTree
      projectId={project.id}
      roots={structureModules}
      title={t("modules.title")}
      emptyLabel={t("modules.empty")}
      expandLabel={t("modules.expandAll", { default: "Expand all" })}
      collapseLabel={t("modules.collapseAll", { default: "Collapse all" })}
      description={project.description}
      className="bg-white"
      canManageStructure={canManageStructure}
    />
  );
}
