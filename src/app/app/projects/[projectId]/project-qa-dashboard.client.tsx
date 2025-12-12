"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  type QaDashboardFeatureCoverage,
  type QaDashboardFeatureHealth,
  type QaDashboardFeatureMissingDescription,
  type QaDashboardMetrics,
  type QaDashboardRunSummary,
  getProjectDashboard,
  getProjectDashboardFeatureCoverage,
  getProjectDashboardFeatureHealth,
  getProjectDashboardFeaturesMissingDescription,
  getProjectDashboardOpenRuns,
  getProjectDashboardRunsWithFullPass,
} from "@/lib/api/qa";
import { cn, generatePagination } from "@/lib/utils";
import { EmptyState, Skeleton, SummaryBadge } from "./project-qa-shared";

type ProjectQaDashboardProps = {
  token: string;
  projectId: string;
};

type DashboardDetailType =
  | "featuresMissingDescription"
  | "featureCoverage"
  | "featureHealth"
  | "openRuns"
  | "runsWithFullPass";

type DetailState = {
  type: DashboardDetailType | null;
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error?: string | null;
};

const DETAIL_PAGE_SIZE = 10;

const METRIC_DETAIL_MAP: Partial<
  Record<keyof QaDashboardMetrics, DashboardDetailType>
> = {
  featuresMissingDescription: "featuresMissingDescription",
  featuresWithRuns: "featureCoverage",
  testCoverageRatio: "featureCoverage",
  openRuns: "openRuns",
  runsWithFullPass: "runsWithFullPass",
  averagePassRate: "featureHealth",
};

export function ProjectQaDashboard({
  token,
  projectId,
}: ProjectQaDashboardProps) {
  const t = useTranslations("app.qa.dashboard");
  const tRuns = useTranslations("app.qa.runs.list");
  const statusLabels = useTranslations("app.qa.runs.panel.statusBadge");
  const formatter = useFormatter();

  const [metrics, setMetrics] = useState<QaDashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [detailState, setDetailState] = useState<DetailState>({
    type: null,
    items: [],
    total: 0,
    page: 1,
    pageSize: DETAIL_PAGE_SIZE,
    isLoading: false,
    error: null,
  });

  const formatPercent = useCallback(
    (value: number | null | undefined) =>
      formatter.number(value ?? 0, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [formatter]
  );

  const detailFetchers = useMemo(
    () => ({
      featuresMissingDescription: (page: number, pageSize: number) =>
        getProjectDashboardFeaturesMissingDescription(
          token,
          projectId,
          page,
          pageSize
        ),
      featureCoverage: (page: number, pageSize: number) =>
        getProjectDashboardFeatureCoverage(token, projectId, page, pageSize),
      featureHealth: (page: number, pageSize: number) =>
        getProjectDashboardFeatureHealth(token, projectId, page, pageSize),
      openRuns: (page: number, pageSize: number) =>
        getProjectDashboardOpenRuns(token, projectId, page, pageSize),
      runsWithFullPass: (page: number, pageSize: number) =>
        getProjectDashboardRunsWithFullPass(token, projectId, page, pageSize),
    }),
    [projectId, token]
  );

  const detailMeta = useMemo(
    () => ({
      featuresMissingDescription: {
        title: t("missingDescription.title"),
        description: t("missingDescription.description"),
        empty: t("missingDescription.empty"),
      },
      featureCoverage: {
        title: t("featureCoverage.title"),
        description: t("featureCoverage.description"),
        empty: t("featureCoverage.empty"),
      },
      featureHealth: {
        title: t("featureHealth.title"),
        description: t("featureHealth.description"),
        empty: t("featureHealth.empty"),
      },
      openRuns: {
        title: t("openRuns.title"),
        description: t("openRuns.description"),
        empty: t("openRuns.empty"),
      },
      runsWithFullPass: {
        title: t("runsWithFullPass.title"),
        description: t("runsWithFullPass.description"),
        empty: t("runsWithFullPass.empty"),
      },
    }),
    [t]
  );

  const loadDashboard = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const payload = await getProjectDashboard(token, projectId);
      setMetrics(payload.metrics);
    } catch (error) {
      toast.error(t("errors.load"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadDetail = useCallback(
    async (type: DashboardDetailType, page: number) => {
      setDetailState((prev) => ({
        ...prev,
        type,
        isLoading: true,
        error: null,
        page,
      }));
      try {
        const fetcher = detailFetchers[type];
        const result = await fetcher(page, DETAIL_PAGE_SIZE);
        setDetailState({
          type,
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize ?? DETAIL_PAGE_SIZE,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        const description = error instanceof Error ? error.message : null;
        setDetailState((prev) => ({
          ...prev,
          isLoading: false,
          error: description,
          type,
        }));
        toast.error(t("errors.detail"), {
          description: description ?? undefined,
        });
      }
    },
    [detailFetchers, t]
  );

  const handleMetricSelect = useCallback(
    (type: DashboardDetailType | null) => {
      if (!type) return;
      void loadDetail(type, 1);
    },
    [loadDetail]
  );

  const handleDetailPageChange = useCallback(
    (page: number) => {
      if (!detailState.type) return;
      void loadDetail(detailState.type, page);
    },
    [detailState.type, loadDetail]
  );

  let content: ReactNode = null;

  if (isLoadingMetrics) {
    content = <DashboardSkeleton />;
  } else if (!metrics) {
    content = (
      <EmptyState
        title={t("empty.title")}
        description={t("empty.description")}
        actionLabel={t("empty.retry")}
        onAction={() => loadDashboard()}
      />
    );
  } else {
    const metricCards: Array<{
      key: keyof QaDashboardMetrics;
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

    const activeDetail = detailState.type;

    let detailContent: ReactNode;
    if (!activeDetail) {
      detailContent = (
        <p className="text-sm text-muted-foreground">{t("detail.empty")}</p>
      );
    } else if (detailState.isLoading) {
      detailContent = <DetailSkeleton />;
    } else if (detailState.error) {
      detailContent = (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t("errors.detail")}
        </p>
      );
    } else if (!detailState.items.length) {
      detailContent = (
        <p className="text-sm text-muted-foreground">
          {detailMeta[activeDetail].empty}
        </p>
      );
    } else {
      switch (activeDetail) {
        case "featuresMissingDescription":
          detailContent = (
            <MissingDescriptionList
              items={
                detailState.items as QaDashboardFeatureMissingDescription[]
              }
              caption={t("missingDescription.caption")}
              badgeLabel={t("missingDescription.badge")}
            />
          );
          break;
        case "featureCoverage":
          detailContent = (
            <FeatureCoverageList
              items={detailState.items as QaDashboardFeatureCoverage[]}
              formatter={formatter}
              t={{
                latestRun: (date) => t("featureCoverage.latestRun", { date }),
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
          );
          break;
        case "featureHealth":
          detailContent = (
            <FeatureHealthList
              items={detailState.items as QaDashboardFeatureHealth[]}
              formatter={formatter}
              formatPercent={formatPercent}
              noRunsLabel={t("featureHealth.noRuns", { default: "—" })}
            />
          );
          break;
        case "openRuns":
          detailContent = (
            <RunList
              runs={detailState.items as QaDashboardRunSummary[]}
              formatter={formatter}
              titleFallback={(id) => tRuns("runFallback", { id })}
              runByLabel={(name) => tRuns("runBy", { name })}
              coverageLabel={(executed, total) =>
                t("runs.coverageLabel", { executed, total })
              }
              badgeLabel={(status) => statusLabels(status)}
              badgeTone={(status) =>
                status === "CLOSED" ? "success" : "default"
              }
            />
          );
          break;
        case "runsWithFullPass":
          detailContent = (
            <RunList
              runs={detailState.items as QaDashboardRunSummary[]}
              formatter={formatter}
              titleFallback={(id) => tRuns("runFallback", { id })}
              runByLabel={(name) => tRuns("runBy", { name })}
              coverageLabel={(executed, total) =>
                t("runs.coverageLabel", { executed, total })
              }
              badgeLabel={() => t("runsWithFullPass.badge")}
              badgeTone={() => "success"}
            />
          );
          break;
        default:
          detailContent = null;
      }
    }

    content = (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => {
            const rawValue = metrics[metric.key] ?? 0;
            const value =
              metric.format !== undefined
                ? metric.format(rawValue)
                : formatter.number(rawValue);
            const detailType = METRIC_DETAIL_MAP[metric.key] ?? null;
            return (
              <DashboardMetricCard
                key={metric.key}
                label={metric.label}
                value={value}
                isActive={
                  detailType !== null && detailState.type === detailType
                }
                onClick={
                  detailType ? () => handleMetricSelect(detailType) : undefined
                }
              />
            );
          })}
        </div>

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
          onSelect={() => handleMetricSelect("featureCoverage")}
        />

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold">
              {activeDetail
                ? detailMeta[activeDetail].title
                : t("detail.title")}
            </p>
            <p className="text-2xs text-muted-foreground">
              {activeDetail
                ? detailMeta[activeDetail].description
                : t("detail.subtitle")}
            </p>
          </div>
          <div className="space-y-4">{detailContent}</div>
          {activeDetail &&
            !detailState.isLoading &&
            detailState.total > detailState.pageSize && (
              <DetailPagination
                page={detailState.page}
                total={detailState.total}
                pageSize={detailState.pageSize}
                onPageChange={handleDetailPageChange}
                labels={{
                  previous: t("detail.pagination.previous"),
                  next: t("detail.pagination.next"),
                }}
              />
            )}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <header className="border-b border-border px-4 pb-2 pt-4 md:px-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <div className="px-4 py-6 md:px-6">{content}</div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <DetailSkeleton />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

function CoverageOverview({
  metrics,
  t,
  onSelect,
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
  onSelect?: () => void;
}) {
  const safeCoverage = Math.min(Math.max(metrics.coverage ?? 0, 0), 1);
  const percentage = Math.round(safeCoverage * 100);
  const fillDegrees = `${safeCoverage * 360}deg`;
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onSelect) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      className={cn(
        "space-y-4 rounded-2xl border bg-card p-4 shadow-sm",
        onSelect &&
          "cursor-pointer transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
    >
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
        const percent = total > 0 ? Math.round((executed / total) * 100) : 0;
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

function FeatureHealthList({
  items,
  formatter,
  formatPercent,
  noRunsLabel,
}: {
  items: QaDashboardFeatureHealth[];
  formatter: ReturnType<typeof useFormatter>;
  formatPercent: (value: number | null | undefined) => string;
  noRunsLabel: string;
}) {
  return (
    <ul className="space-y-4">
      {items.map((feature) => {
        const passRate = feature.passRate ?? 0;
        const percentLabel = formatPercent(passRate);
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
                <p className="text-sm font-semibold">{feature.featureName}</p>
                <p className="text-2xs text-muted-foreground">
                  {runDate ?? noRunsLabel}
                </p>
              </div>
              <p className="text-sm font-semibold">{percentLabel}</p>
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
  );
}

function MissingDescriptionList({
  items,
  caption,
  badgeLabel,
}: {
  items: QaDashboardFeatureMissingDescription[];
  caption: string;
  badgeLabel: string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((feature) => (
        <li
          key={feature.id}
          className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold">{feature.name}</p>
            <p className="text-2xs text-muted-foreground">{caption}</p>
          </div>
          <SummaryBadge label={badgeLabel} />
        </li>
      ))}
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

function DetailPagination({
  page,
  total,
  pageSize,
  onPageChange,
  labels,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  labels: { previous: string; next: string };
}) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (totalPages <= 1) return null;

  const goToPage = (target: number) => {
    const clamped = Math.min(Math.max(1, target), totalPages);
    if (clamped === page) return;
    onPageChange(clamped);
  };

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => goToPage(page - 1)}
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        disabled={page <= 1}
      >
        {labels.previous}
      </button>
      <div className="flex items-center justify-center gap-1">
        {generatePagination(page, totalPages).map((entry, index) =>
          entry === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-muted-foreground"
            >
              &hellip;
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => goToPage(entry as number)}
              className={cn(
                "rounded border px-3 py-1 text-sm transition",
                entry === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              aria-current={entry === page ? "page" : undefined}
            >
              {entry}
            </button>
          )
        )}
      </div>
      <button
        type="button"
        onClick={() => goToPage(page + 1)}
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        disabled={page >= totalPages}
      >
        {labels.next}
      </button>
    </div>
  );
}

function DashboardMetricCard({
  label,
  value,
  onClick,
  isActive,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        className={cn(
          "rounded-2xl border bg-card p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "hover:border-primary",
          isActive && "border-primary bg-primary/5"
        )}
        onClick={onClick}
      >
        <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-3 text-2xl font-semibold">{value}</p>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
