"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  FileText,
  FolderTree,
  Home,
  Plus,
  type LucideIcon,
} from "lucide-react";

import type { Module } from "@/lib/model-definitions/module";
import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { StructureTree } from "@/ui/components/projects/StructureTree.client";
import { actionButtonClass } from "@/ui/styles/action-button";
import { ManualLabelsNavbar } from "@/ui/components/manual/manual-labels-navbar.client";
import { EntityDocumentationPanel } from "@/ui/components/documentation/entity-documentation-panel.client";
import { ManualTabContent } from "@/ui/components/manual/manual-tab-content.client";
import { hasPermission } from "@/lib/permissions";
import {
  AppPrimaryTabButton as PrimaryTabButton,
  AppSecondaryTabButton as SecondaryTabButton,
} from "@/ui/components/tabs/app-tabs";

type ModuleTabsProps = {
  project: Project;
  module: Module;
  structureNode: StructureModuleNode;
  permissions: string[];
  token: string;
};

type ModuleTab = "structure" | "documentation" | "manual";
type ModulePrimaryTab = "overview" | "documentation";

type ModuleNavigationItem = {
  key: ModuleTab;
  label: string;
  icon: LucideIcon;
};

type ModuleNavigationGroup = {
  key: ModulePrimaryTab;
  label: string;
  icon: LucideIcon;
  items: ModuleNavigationItem[];
};

export function ModuleTabs({
  project,
  module,
  structureNode,
  permissions,
  token,
}: ModuleTabsProps) {
  const [activePrimaryTab, setActivePrimaryTab] =
    useState<ModulePrimaryTab>("overview");
  const [activeTab, setActiveTab] = useState<ModuleTab>("structure");
  const tModule = useTranslations("app.projects.module");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tProjectTabs = useTranslations("app.projects.detail.tabs");
  const tManual = useTranslations("app.projects.manual");

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canViewProject = hasPermission(permissionSet, "project.read");
  const canViewStructure = canViewProject || hasPermission(permissionSet, "module.read");
  const canManageStructure = hasPermission(permissionSet, "module.write");
  const canManageFeatures = hasPermission(permissionSet, "feature.write");
  const canViewDocumentation = canViewProject || hasPermission(permissionSet, "qa.read");
  const canViewManual = canViewProject || hasPermission(permissionSet, "qa.read");
  const canShareManual = hasPermission(permissionSet, "project.manage_share_links");

  const availableTabs = useMemo<ModuleTab[]>(() => {
    const tabs: ModuleTab[] = [];
    if (canViewStructure) tabs.push("structure");
    if (canViewDocumentation) tabs.push("documentation");
    if (canViewManual) tabs.push("manual");
    return tabs;
  }, [canViewDocumentation, canViewManual, canViewStructure]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? "structure");
    }
  }, [activeTab, availableTabs]);

  const structureLabel = tProjectTabs("structure");
  const documentationLabel = tProjectTabs("sections");
  const manualLabel = tProjectTabs("manual");
  const navigationGroups = useMemo<ModuleNavigationGroup[]>(() => {
    const groups: ModuleNavigationGroup[] = [
      {
        key: "overview",
        label: tProjectTabs("overview"),
        icon: Home,
        items: canViewStructure
          ? [{ key: "structure", label: structureLabel, icon: FolderTree }]
          : [],
      },
      {
        key: "documentation",
        label: tProjectTabs("documentation"),
        icon: BookOpen,
        items: [
          ...(canViewDocumentation
            ? [{ key: "documentation" as const, label: documentationLabel, icon: FileText }]
            : []),
          ...(canViewManual
            ? [{ key: "manual" as const, label: manualLabel, icon: BookOpen }]
            : []),
        ],
      },
    ];

    return groups.filter((group) => group.items.length > 0);
  }, [
    canViewDocumentation,
    canViewManual,
    canViewStructure,
    documentationLabel,
    manualLabel,
    structureLabel,
    tProjectTabs,
  ]);

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

  function handlePrimaryTabChange(group: ModuleNavigationGroup) {
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
                key={item.key}
                label={item.label}
                icon={item.icon}
                isActive={activeTab === item.key}
                onClick={() => setActiveTab(item.key)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeTab === "structure" && canViewStructure && (
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

          {(canManageStructure || canManageFeatures) && (
            <div className="flex flex-wrap gap-2">
              {canManageStructure && (
                <Link
                  href={`/app/projects/${project.id}/modules/new?parent=${module.id}`}
                  className={actionButtonClass()}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  {tModule("actions.addChild")}
                </Link>
              )}
              {canManageFeatures && (
                <Link
                  href={`/app/projects/${project.id}/features/new?moduleId=${module.id}`}
                  className={actionButtonClass()}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  {tModule("actions.addFeature")}
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "documentation" && canViewDocumentation && (
        <EntityDocumentationPanel
          token={token}
          entityId={module.id}
          entityType="module"
          projectId={project.id}
        />
      )}

      {activeTab === "manual" && canViewManual && (
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
            canShareManual={canShareManual}
            shareRootType="MODULE"
            shareRootId={module.id}
            shareHashTargetId={module.id}
            shareHashTargetType="MODULE"
          />
        </div>
      )}
    </section>
  );
}
