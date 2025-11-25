"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { Feature } from "@/lib/model-definitions/feature";
import type { Project } from "@/lib/model-definitions/project";
import type { StructureModuleNode } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { FeatureQA } from "./feature-qa.client";
import {
  ManualOutline,
  buildProjectManualTree,
} from "@/ui/components/manual/manual-outline.client";

type FeatureTabsProps = {
  feature: Feature;
  project: Project;
  structureModules: StructureModuleNode[];
  featureId: string;
  token: string;
  currentUserId?: string;
  canManageQa?: boolean;
};

type FeatureTab = "info" | "issues" | "versions" | "qa" | "manual";

export function FeatureTabs({
  feature,
  project,
  structureModules,
  featureId,
  token,
  currentUserId,
  canManageQa = false,
}: FeatureTabsProps) {
  const tTabs = useTranslations("app.projects.feature.tabs");
  const t = useTranslations("app.projects.feature");
  const tManual = useTranslations("app.projects.manual");
  const formatter = useFormatter();
  const [activeTab, setActiveTab] = useState<FeatureTab>("info");
  const manualTree = useMemo(
    () => buildProjectManualTree(project, structureModules),
    [project, structureModules],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          label={tTabs("info")}
          isActive={activeTab === "info"}
          onClick={() => setActiveTab("info")}
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
        />
        <TabButton
          label={tTabs("manual")}
          isActive={activeTab === "manual"}
          onClick={() => setActiveTab("manual")}
        />
      </div>

      {activeTab === "info" && (
        <section className="rounded-xl border bg-background p-4">
          <h2 className="mb-2 font-semibold">{t("description.title")}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {feature.description ?? t("description.empty")}
          </p>
        </section>
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

      {activeTab === "manual" && (
        <ManualOutline
          root={manualTree}
          focusId={feature.id}
          fallbackDescription={tManual("noDescription")}
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
