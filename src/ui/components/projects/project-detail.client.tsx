// src/ui/components/projects/project-detail.client.tsx
"use client";

import { useTranslations } from "next-intl";

import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";

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
    <div className="space-y-4">
      <div className="rounded-xl border bg-background p-4">
        <RichTextPreview
          value={project.description}
          emptyLabel={t("description.empty")}
        />
      </div>
      <StructureTree
        projectId={project.id}
        roots={structureModules}
        title={t("modules.title")}
        emptyLabel={t("modules.empty")}
        expandLabel={t("modules.expandAll", { default: "Expand all" })}
        collapseLabel={t("modules.collapseAll", { default: "Collapse all" })}
        className="bg-white"
        canManageStructure={canManageStructure}
      />
    </div>
  );
}
