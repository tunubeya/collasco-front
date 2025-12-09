"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  type QaDashboardFeatureCoverage,
  type QaDashboardRunSummary,
  type QaProjectDashboardResponse,
  getProjectDashboard,
} from "@/lib/api/qa";
import { EmptyState, Skeleton, SummaryBadge } from "./project-qa-shared";

type ProjectQaDashboardProps = {
  token: string;
  projectId: string;
};

export function ProjectQaDashboard({ token, projectId }: ProjectQaDashboardProps) {
  const t = useTranslations("app.qa.dashboard");
  const tRuns = useTranslations("app.qa.runs.list");
  const statusLabels = useTranslations("app.qa.runs.panel.statusBadge");
  const formatter = useFormatter();
  const [data, setData] = useState<QaProjectDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await getProjectDashboard(token, projectId);
      setData(payload);
    } catch (error) {
      toast.error(t("errors.load"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const formatPercent = useCallback(
    (value: number | null | undefined) =>
      formatter.number(value ?? 0, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [formatter]
  );

  const header = useMemo(
    () => ({
      title: t("title"),
      subtitle: t("subtitle"),
    }),
    [t]
  );

  let content: ReactNode = null;

  if (isLoading) {
    content = <DashboardSkeleton />;
  } else if (!data) {
    content = (
      <EmptyState
        title={t("empty.title")}
        description={t("empty.description")}
        actionLabel={t("empty.retry")}
        onAction={() => loadDashboard()}
      />
    );
  } else {
    const { metrics, reports } = data;
    const metricCards: Array<{
      key: keyof typeof metrics;
      label: string;
      format?: (value: number | null | undefined) => string;
    }> = [
      { key: "totalFeatures", label: t("metrics.totalFeatures") },
      {
        key: "featuresMissingDescription",
        label: t("metrics.featuresMissingDescription"),
      },
      {
        key: "featuresWithRuns",
        label: t("metrics.featuresWithRuns"),
      },
      {
        key: "testCoverageRatio",
        label: t("metrics.testCoverageRatio"),
        format: formatPercent,
      },
      {
        key: "openRuns",
        label: t("metrics.openRuns"),
      },
      {
        key: "runsWithFullPass",
        label: t("metrics.runsWithFullPass"),
      },
      {
        key: "averagePassRate",
        label: t("metrics.averagePassRate"),
        format: formatPercent,
      },
    ];

    content = (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {metricCards.map((metric) => {
            const rawValue = metrics[metric.key] ?? 0;
            const value =
              metric.format !== undefined
                ? metric.format(rawValue)
                : formatter.number(rawValue);
            return (
              <article
                key={metric.key}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
              </article>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CoverageOverview
            metrics={{
              coverage: metrics.testCoverageRatio,
              withRuns: metrics.featuresWithRuns,
              total: metrics.totalFeatures,
              missingDescriptions: metrics.featuresMissingDescription,
            }}
            t={{
              title: t("coverage.title"),
              description: t("coverage.description"),
              caption: t("coverage.caption", {
                executed: metrics.featuresWithRuns,
                total: metrics.totalFeatures,
              }),
              coveredBadge: t("coverage.coveredBadge", {
                value: formatPercent(metrics.testCoverageRatio),
              }),
              pendingBadge: t("coverage.pendingBadge", {
                count: metrics.featuresMissingDescription,
              }),
            }}
          />

          <DashboardCard
            title={t("featureHealth.title")}
            description={t("featureHealth.description")}
            isEmpty={!reports.featureHealth.length}
            emptyMessage={t("featureHealth.empty")}
          >
            <ul className="space-y-4">
              {reports.featureHealth.map((feature) => {
                const passRate = feature.passRate ?? 0;
                const percent = formatPercent(passRate);
                const width = `${Math.min(Math.max(passRate, 0), 1) * 100}%`;
                const runDate = feature.latestRun
                  ? formatter.dateTime(new Date(feature.latestRun.runDate), {
                      dateStyle: "medium",
                    })
                  : null;
                return (
                  <li key={feature.featureId} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {feature.featureName}
                        </p>
                        <p className="text-2xs text-muted-foreground">
                          {runDate ??
                            t("featureHealth.noRuns", { default: "—" })}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{percent}</p>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </DashboardCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardCard
            title={t("featureCoverage.title")}
            description={t("featureCoverage.description")}
            isEmpty={!reports.featureCoverage.length}
            emptyMessage={t("featureCoverage.empty")}
          >
            <FeatureCoverageList
              items={reports.featureCoverage}
              formatter={formatter}
              t={{
                latestRun: (date) =>
                  t("featureCoverage.latestRun", { date }),
                coverageLabel: (executed, total) =>
                  t("featureCoverage.coverageLabel", { executed, total }),
                missingLabel: (count) =>
                  t("featureCoverage.missingLabel", { count }),
                noRuns: t("featureCoverage.noRuns"),
                badges: {
                  hasDescription: t("featureCoverage.badges.hasDescription"),
                  missingDescription: t(
                    "featureCoverage.badges.missingDescription"
                  ),
                  withRuns: t("featureCoverage.badges.withRuns"),
                  withoutRuns: t("featureCoverage.badges.withoutRuns"),
                },
              }}
            />
          </DashboardCard>

          <DashboardCard
            title={t("openRuns.title")}
            description={t("openRuns.description")}
            isEmpty={!reports.openRuns.length}
            emptyMessage={t("openRuns.empty")}
          >
            <RunList
              runs={reports.openRuns}
              formatter={formatter}
              titleFallback={(id) => tRuns("runFallback", { id })}
              runByLabel={(name) => tRuns("runBy", { name })}
              coverageLabel={(executed, total) =>
                t("runs.coverageLabel", { executed, total })
              }
              badgeLabel={(status) => statusLabels(status)}
              badgeTone={(status) => (status === "CLOSED" ? "success" : "default")}
            />
          </DashboardCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardCard
            title={t("missingDescription.title")}
            description={t("missingDescription.description")}
            isEmpty={!reports.featuresMissingDescription.length}
            emptyMessage={t("missingDescription.empty")}
          >
            <ul className="space-y-3">
              {reports.featuresMissingDescription.map((feature) => (
                <li
                  key={feature.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{feature.name}</p>
                    <p className="text-2xs text-muted-foreground">
                      {t("missingDescription.caption")}
                    </p>
                  </div>
                  <SummaryBadge label={t("missingDescription.badge")} />
                </li>
              ))}
            </ul>
          </DashboardCard>

          <DashboardCard
            title={t("runsWithFullPass.title")}
            description={t("runsWithFullPass.description")}
            isEmpty={!reports.runsWithFullPass.length}
            emptyMessage={t("runsWithFullPass.empty")}
          >
            <RunList
              runs={reports.runsWithFullPass}
              formatter={formatter}
              titleFallback={(id) => tRuns("runFallback", { id })}
              runByLabel={(name) => tRuns("runBy", { name })}
              coverageLabel={(executed, total) =>
                t("runs.coverageLabel", { executed, total })
              }
              badgeLabel={() => t("runsWithFullPass.badge")}
              badgeTone={() => "success"}
            />
          </DashboardCard>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <header className="border-b border-border px-4 pb-2 pt-4 md:px-6">
        <h2 className="text-lg font-semibold">{header.title}</h2>
        <p className="text-sm text-muted-foreground">{header.subtitle}</p>
      </header>
      <div className="px-4 py-6 md:px-6">{content}</div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function CoverageOverview({
  metrics,
  t,
}: {
  metrics: {
    coverage: number | null;
    withRuns: number;
    total: number;
    missingDescriptions: number;
  };
  t: {
    title: string;
    description: string;
    caption: string;
    coveredBadge: string;
    pendingBadge: string;
  };
}) {
  const safeCoverage = Math.min(Math.max(metrics.coverage ?? 0, 0), 1);
  const percentage = Math.round(safeCoverage * 100);
  const fillDegrees = `${safeCoverage * 360}deg`;
  return (
    <article className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold">{t.title}</p>
        <p className="text-xs text-muted-foreground">{t.description}</p>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-36 w-36">
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(var(--primary) 0deg ${fillDegrees}, rgba(15,23,42,0.08) ${fillDegrees} 360deg)`,
            }}
          />
          <div className="absolute inset-6 flex items-center justify-center rounded-full bg-background text-2xl font-semibold">
            {percentage}%
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <p className="text-sm text-muted-foreground">{t.caption}</p>
          <div className="flex flex-wrap gap-2">
            <SummaryBadge label={t.coveredBadge} tone="success" />
            <SummaryBadge label={t.pendingBadge} />
          </div>
        </div>
      </div>
    </article>
  );
}

function FeatureCoverageList({
  items,
  formatter,
  t,
}: {
  items: QaDashboardFeatureCoverage[];
  formatter: ReturnType<typeof useFormatter>;
  t: {
    latestRun: (date: string) => string;
    coverageLabel: (executed: number, total: number) => string;
    missingLabel: (count: number) => string;
    noRuns: string;
    badges: {
      hasDescription: string;
      missingDescription: string;
      withRuns: string;
      withoutRuns: string;
    };
  };
}) {
  return (
    <ul className="space-y-4">
      {items.map((feature) => {
        const coverage = feature.latestRun?.coverage;
        const executed = coverage?.executedCases ?? 0;
        const total = coverage?.totalCases ?? 0;
        const percent =
          total > 0 ? Math.round((executed / total) * 100) : 0;
        const missing = coverage?.missingCases ?? 0;
        const runDate = feature.latestRun
          ? formatter.dateTime(new Date(feature.latestRun.runDate), {
              dateStyle: "medium",
            })
          : null;
        return (
          <li
            key={feature.featureId}
            className="space-y-3 rounded-xl border bg-background/80 px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{feature.featureName}</p>
                <p className="text-2xs text-muted-foreground">
                  {runDate ? t.latestRun(runDate) : t.noRuns}
                </p>
              </div>
              <p className="text-lg font-semibold">{percent}%</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SummaryBadge
                label={
                  feature.hasDescription
                    ? t.badges.hasDescription
                    : t.badges.missingDescription
                }
                tone={feature.hasDescription ? "success" : "default"}
              />
              <SummaryBadge
                label={
                  feature.hasTestRun
                    ? t.badges.withRuns
                    : t.badges.withoutRuns
                }
                tone={feature.hasTestRun ? "success" : "default"}
              />
            </div>
            {coverage ? (
              <>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-2xs text-muted-foreground">
                  {t.coverageLabel(executed, total)}
                </p>
                {missing > 0 && (
                  <p className="text-2xs text-amber-700">
                    {t.missingLabel(missing)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xs text-muted-foreground">{t.noRuns}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RunList({
  runs,
  formatter,
  titleFallback,
  runByLabel,
  coverageLabel,
  badgeLabel,
  badgeTone,
}: {
  runs: QaDashboardRunSummary[];
  formatter: ReturnType<typeof useFormatter>;
  titleFallback: (id: string) => string;
  runByLabel: (name: string) => string;
  coverageLabel: (executed: number, total: number) => string;
  badgeLabel: (status: QaDashboardRunSummary["status"]) => string;
  badgeTone?: (status: QaDashboardRunSummary["status"]) => "default" | "success";
}) {
  return (
    <ul className="space-y-3">
      {runs.map((run) => {
        const title = run.feature?.name ?? titleFallback(run.id);
        const runDate = formatter.dateTime(new Date(run.runDate), {
          dateStyle: "medium",
          timeStyle: "short",
        });
        return (
          <li
            key={run.id}
            className="space-y-2 rounded-xl border bg-background/80 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-2xs text-muted-foreground">{runDate}</p>
              </div>
              <SummaryBadge
                label={badgeLabel(run.status)}
                tone={badgeTone ? badgeTone(run.status) : "default"}
              />
            </div>
            {run.environment && (
              <p className="text-2xs text-muted-foreground">
                {run.environment}
              </p>
            )}
            {run.runBy && (
              <p className="text-2xs text-muted-foreground">
                {runByLabel(run.runBy)}
              </p>
            )}
            {run.coverage && (
              <p className="text-2xs font-medium text-foreground">
                {coverageLabel(
                  run.coverage.executedCases,
                  run.coverage.totalCases
                )}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DashboardCard({
  title,
  description,
  children,
  isEmpty,
  emptyMessage,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
}) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-2xs text-muted-foreground">{description}</p>
        )}
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        children
      )}
    </article>
  );
}
