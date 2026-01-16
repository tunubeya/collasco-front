"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { Feature } from "@/lib/model-definitions/feature";
import type { Project } from "@/lib/model-definitions/project";
import { cn } from "@/lib/utils";
import { FeatureQA } from "./feature-qa.client";
import { ManualLabelsNavbar } from "@/ui/components/manual/manual-labels-navbar.client";
import { ManualTabContent } from "@/ui/components/manual/manual-tab-content.client";
import type { QaLinkedFeature } from "@/lib/api/qa";
import { LinkedFeaturesPanel } from "./feature-linked-features.client";
import { EntityDocumentationPanel } from "@/ui/components/documentation/entity-documentation-panel.client";

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
  initialLinkedFeatures: QaLinkedFeature[];
  linkableFeatures: LinkedOption[];
  modulePathById: Record<string, string>;
  projectId: string;
  linkedFeaturesCount?: number | null;
  testCasesCount?: number | null;
};

type FeatureTab =
  | "documentation"
  | "issues"
  | "versions"
  | "qa"
  | "linked"
  | "manual";

export function FeatureTabs({
  feature,
  project,
  featureId,
  token,
  currentUserId,
  canManageQa = false,
  initialLinkedFeatures,
  linkableFeatures,
  modulePathById,
  projectId,
  linkedFeaturesCount,
  testCasesCount,
}: FeatureTabsProps) {
  const tTabs = useTranslations("app.projects.feature.tabs");
  const t = useTranslations("app.projects.feature");
  const tProjectDetail = useTranslations("app.projects.detail");
  const tManual = useTranslations("app.projects.manual");
  const formatter = useFormatter();
  const [activeTab, setActiveTab] = useState<FeatureTab>("documentation");
  const [linkedFeatures, setLinkedFeatures] =
    useState<QaLinkedFeature[]>(initialLinkedFeatures);

  useEffect(() => {
    setLinkedFeatures(initialLinkedFeatures);
  }, [initialLinkedFeatures]);

  const linkedBadgeCount =
    linkedFeatures.length ??
    linkedFeaturesCount ??
    feature.linkedFeaturesCount ??
    0;
  const qaBadgeCount = testCasesCount ?? feature.testCasesCount ?? 0;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          label={tTabs("info")}
          isActive={activeTab === "documentation"}
          onClick={() => setActiveTab("documentation")}
        />
        <TabButton
          label={tTabs("issues")}
          isActive={activeTab === "issues"}
          onClick={() => setActiveTab("issues")}
        />
        <TabButton
          label={tTabs("versions")}
          isActive={activeTab === "versions"}
          onClick={() => setActiveTab("versions")}
        />
        <TabButton
          label={tTabs("qa")}
          isActive={activeTab === "qa"}
          onClick={() => setActiveTab("qa")}
          badge={qaBadgeCount}
        />
        <TabButton
          label={tTabs("linked")}
          isActive={activeTab === "linked"}
          onClick={() => setActiveTab("linked")}
          badge={linkedBadgeCount}
        />
        <TabButton
          label={tTabs("manual")}
          isActive={activeTab === "manual"}
          onClick={() => setActiveTab("manual")}
        />
      </div>

      {activeTab === "documentation" && (
        <EntityDocumentationPanel
          token={token}
          entityId={featureId}
          entityType="feature"
          projectId={projectId}
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

      {activeTab === "qa" && (
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
        />
      )}

      {activeTab === "manual" && (
        <div className="space-y-4">
          <ManualLabelsNavbar token={token} projectId={projectId} />
          <ManualTabContent
            token={token}
            project={project}
            projectId={projectId}
            focusId={feature.id}
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
  isActive,
  onClick,
  badge,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
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
      <span className="flex items-center gap-1">
        {label}
        {badge && badge > 0 ? (
          <span
            className={cn(
              "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isActive
                ? "bg-primary/80 text-primary-foreground"
                : "bg-background/80 text-primary",
            )}
          >
            {badge}
          </span>
        ) : null}
      </span>
    </button>
  );
}
