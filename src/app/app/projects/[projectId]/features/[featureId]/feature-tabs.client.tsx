"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Activity,
  BookOpen,
  FileText,
  GitBranch,
  History,
  MessageSquare,
  Rocket,
  type LucideIcon,
} from "lucide-react";

import type { Feature } from "@/lib/model-definitions/feature";
import type { Project } from "@/lib/model-definitions/project";
import { FeatureQA } from "./feature-qa.client";
import { ManualLabelsNavbar } from "@/ui/components/manual/manual-labels-navbar.client";
import { ManualTabContent } from "@/ui/components/manual/manual-tab-content.client";
import type { QaLinkedFeature } from "@/lib/api/qa";
import { LinkedFeaturesPanel } from "./feature-linked-features.client";
import { EntityDocumentationPanel } from "@/ui/components/documentation/entity-documentation-panel.client";
import { FeatureTicketsTab } from "./feature-tickets-tab.client";
import {
  AppPrimaryTabButton as PrimaryTabButton,
  AppSecondaryTabButton as SecondaryTabButton,
} from "@/ui/components/tabs/app-tabs";
import { useStructureSessionTab } from "@/ui/components/projects/use-structure-session-tab";

type LinkedOption = {
  id: string;
  name: string;
  moduleId: string | null;
  moduleName: string | null;
};

type FeatureTabsProps = {
  feature: Feature;
  project: Project;
  featureId: string;
  token: string;
  currentUserId?: string;
  canManageQa?: boolean;
  canViewQa?: boolean;
  canShareManual?: boolean;
  initialLinkedFeatures: QaLinkedFeature[];
  linkableFeatures: LinkedOption[];
  modulePathById: Record<string, string>;
  projectId: string;
  linkedFeaturesCount?: number | null;
  testCasesCount?: number | null;
  canManageFeature?: boolean;
  canReadFeature?: boolean;
  canReadTickets?: boolean;
  canCreateTicket?: boolean;
};

type FeatureTab =
  | "documentation"
  | "issues"
  | "versions"
  | "tickets"
  | "qa"
  | "linked"
  | "manual";

type FeaturePrimaryTab =
  | "build"
  | "documentation"
  | "planning"
  | "quality"
  | "delivery";

type FeatureNavigationItem = {
  key: FeatureTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type FeatureNavigationGroup = {
  key: FeaturePrimaryTab;
  label: string;
  icon: LucideIcon;
  items: FeatureNavigationItem[];
};

export function FeatureTabs({
  feature,
  project,
  featureId,
  token,
  currentUserId,
  canManageQa = false,
  canViewQa = false,
  canShareManual = false,
  initialLinkedFeatures,
  linkableFeatures,
  modulePathById,
  projectId,
  linkedFeaturesCount,
  testCasesCount,
  canManageFeature = false,
  canReadFeature = false,
  canReadTickets = false,
  canCreateTicket = false,
}: FeatureTabsProps) {
  const tTabs = useTranslations("app.projects.feature.tabs");
  const tProjectTabs = useTranslations("app.projects.detail.tabs");
  const t = useTranslations("app.projects.feature");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tManual = useTranslations("app.projects.manual");
  const formatter = useFormatter();
  const [activePrimaryTab, setActivePrimaryTab] =
    useState<FeaturePrimaryTab>("documentation");
  const [linkedFeatures, setLinkedFeatures] =
    useState<QaLinkedFeature[]>(initialLinkedFeatures);

  useEffect(() => {
    setLinkedFeatures(initialLinkedFeatures);
  }, [initialLinkedFeatures]);

  useEffect(() => {
    const showDocumentationSection = () => {
      setActivePrimaryTab("documentation");
      setActiveTab("documentation");
    };
    window.addEventListener("feature-documentation-anchor", showDocumentationSection);
    return () =>
      window.removeEventListener("feature-documentation-anchor", showDocumentationSection);
  }, []);

  const canViewDocumentation = canViewQa || canReadFeature;

  const availableTabs = useMemo<FeatureTab[]>(() => {
    const tabs: FeatureTab[] = [];
    if (canViewDocumentation) tabs.push("documentation");
    if (canViewQa) tabs.push("manual");
    if (canReadTickets) tabs.push("tickets");
    tabs.push("issues");
    tabs.push("linked");
    if (canViewQa) tabs.push("qa");
    tabs.push("versions");
    return tabs;
  }, [canReadTickets, canViewDocumentation, canViewQa]);
  const [activeTab, setActiveTab] = useStructureSessionTab<FeatureTab>(
    availableTabs,
    "documentation",
  );

  const linkedBadgeCount =
    linkedFeatures.length ??
    linkedFeaturesCount ??
    feature.linkedFeaturesCount ??
    0;
  const qaBadgeCount = testCasesCount ?? feature.testCasesCount ?? 0;

  const navigationGroups = useMemo<FeatureNavigationGroup[]>(() => {
    const groups: FeatureNavigationGroup[] = [
      {
        key: "documentation",
        label: tProjectTabs("documentation"),
        icon: BookOpen,
        items: [
          ...(canViewDocumentation
            ? [{ key: "documentation" as const, label: tProjectTabs("sections"), icon: FileText }]
            : []),
          ...(canViewQa
            ? [{ key: "manual" as const, label: tTabs("manual"), icon: BookOpen }]
            : []),
          ...(canReadTickets
            ? [{ key: "tickets" as const, label: tTabs("tickets"), icon: MessageSquare }]
            : []),
        ],
      },
      {
        key: "build",
        label: tProjectTabs("build"),
        icon: GitBranch,
        items: [
          {
            key: "linked",
            label: tTabs("linked"),
            icon: GitBranch,
            badge: linkedBadgeCount,
          },
        ],
      },
      {
        key: "planning",
        label: tProjectTabs("planning"),
        icon: MessageSquare,
        items: [
          { key: "issues", label: tTabs("issues"), icon: MessageSquare },
        ],
      },
      {
        key: "quality",
        label: tProjectTabs("quality"),
        icon: Activity,
        items: [
          ...(canViewQa
            ? [
                {
                  key: "qa" as const,
                  label: tTabs("qa"),
                  icon: Activity,
                  badge: qaBadgeCount,
                },
              ]
            : []),
        ],
      },
      {
        key: "delivery",
        label: tProjectTabs("delivery"),
        icon: Rocket,
        items: [
          { key: "versions", label: tTabs("versions"), icon: History },
        ],
      },
    ];

    return groups.filter((group) => group.items.length > 0);
  }, [
    canReadTickets,
    canViewDocumentation,
    canViewQa,
    linkedBadgeCount,
    qaBadgeCount,
    tProjectTabs,
    tTabs,
  ]);

  useEffect(() => {
    const activeGroup = navigationGroups.find(
      (group) => group.key === activePrimaryTab,
    );
    if (activeGroup) return;
    const fallbackGroup = navigationGroups[0];
    setActivePrimaryTab(fallbackGroup?.key ?? "build");
    if (fallbackGroup?.items[0]) {
      setActiveTab(fallbackGroup.items[0].key);
    }
  }, [activePrimaryTab, navigationGroups]);

  useEffect(() => {
    const groupForActiveTab = navigationGroups.find((group) =>
      group.items.some((item) => item.key === activeTab),
    );
    if (groupForActiveTab && groupForActiveTab.key !== activePrimaryTab) {
      setActivePrimaryTab(groupForActiveTab.key);
    }
  }, [activePrimaryTab, activeTab, navigationGroups]);

  const activeGroup = useMemo(
    () =>
      navigationGroups.find((group) => group.key === activePrimaryTab) ??
      navigationGroups[0],
    [activePrimaryTab, navigationGroups],
  );

  function handlePrimaryTabChange(group: FeatureNavigationGroup) {
    setActivePrimaryTab(group.key);
    const activeItem = group.items.find((item) => item.key === activeTab);
    setActiveTab(activeItem?.key ?? group.items[0]?.key ?? "versions");
  }

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

        {activeGroup ? (
          <div className="flex flex-wrap gap-2 px-3 py-3">
            {activeGroup.items.map((item) => (
              <SecondaryTabButton
                key={item.key}
                label={item.label}
                icon={item.icon}
                isActive={activeTab === item.key}
                onClick={() => setActiveTab(item.key)}
                badge={item.badge}
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeTab === "documentation" && canViewDocumentation && (
        <EntityDocumentationPanel
          token={token}
          entityId={featureId}
          entityType="feature"
          projectId={projectId}
          entityName={feature.name ?? ""}
        />
      )}

      {activeTab === "issues" && (
        <section className="rounded-xl border bg-background p-4">
          <h2 className="mb-2 font-semibold">{t("issues.title")}</h2>
          {feature.issueElements?.length ? (
            <ul className="space-y-2 text-sm">
              {feature.issueElements.map((issue) => (
                <li key={issue.id} className="flex flex-wrap items-center gap-2">
                  {issue.githubIssueUrl && (
                    <a
                      href={issue.githubIssueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {t("issues.issueLink")}
                    </a>
                  )}
                  {issue.pullRequestUrl && (
                    <a
                      href={issue.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {t("issues.pullRequestLink")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("issues.empty")}</p>
          )}
        </section>
      )}

      {activeTab === "versions" && (
        <section className="rounded-xl border bg-background p-4">
          <h2 className="mb-2 font-semibold">{t("versions.title")}</h2>
          {feature.versions?.length ? (
            <ul className="space-y-2 text-sm">
              {feature.versions.map((version) => (
                <li
                  key={version.id}
                  className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-muted"
                >
                  <div>
                    <span className="font-medium">
                      {t("versions.label", {
                        version: version.versionNumber,
                      })}
                    </span>
                    {version.isRollback && (
                      <span className="ml-2 text-xs text-amber-600">
                        {t("versions.rollback")}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatter.dateTime(new Date(version.createdAt), {
                      dateStyle: "medium",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("versions.empty")}
            </p>
          )}
        </section>
      )}

      {activeTab === "tickets" && canReadTickets && (
        <FeatureTicketsTab
          token={token}
          projectId={projectId}
          featureId={featureId}
          featureName={feature.name}
          canCreateTicket={canCreateTicket}
        />
      )}

      {activeTab === "qa" && canViewQa && (
        <FeatureQA
          token={token}
          featureId={featureId}
          currentUserId={currentUserId}
          canManageQa={canManageQa}
        />
      )}

      {activeTab === "linked" && (
        <LinkedFeaturesPanel
          token={token}
          featureId={featureId}
          links={linkedFeatures}
          onLinksChange={setLinkedFeatures}
          options={linkableFeatures}
          modulePathById={modulePathById}
          projectId={projectId}
          canManageFeature={canManageFeature}
        />
      )}

      {activeTab === "manual" && canViewQa && (
        <div className="space-y-4">
          <ManualLabelsNavbar token={token} projectId={projectId} />
          <ManualTabContent
            token={token}
            project={project}
            projectId={projectId}
            focusId={feature.id}
            subtreeRootId={feature.id}
            fallbackDescription={tManual("noDescription")}
            expandLabel={tProjectDetail("modules.expandAll", {
              default: "Expand all",
            })}
            collapseLabel={tProjectDetail("modules.collapseAll", {
              default: "Collapse all",
            })}
            title={""}
            hideProjectTitle
            canShareManual={canShareManual}
            shareRootType="FEATURE"
            shareRootId={feature.id}
            shareHashTargetId={feature.id}
            shareHashTargetType="FEATURE"
          />
        </div>
      )}
    </section>
  );
}
