"use client";

import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import {
  type QaDashboardFeatureCoverage,
  type QaDashboardFeatureMissingDescription,
  type QaDashboardFeatureWithoutTestCases,
  type QaDashboardFeatureHealth,
  type QaDashboardMandatoryDocumentationMissing,
  type QaDashboardMetrics,
  type QaDashboardRunSummary,
  getProjectDashboard,
  getProjectDashboardFeatureCoverage,
  getProjectDashboardFeaturesWithoutTestCases,
  getProjectDashboardFeaturesMissingDescription,
  getProjectDashboardFeatureHealth,
  getProjectDashboardOpenRuns,
  getProjectDashboardRunsWithFullPass,
  getProjectDashboardMandatoryDocumentationMissing,
} from "@/lib/api/qa";
import { cn, generatePagination } from "@/lib/utils";
import { EmptyState, Skeleton, SummaryBadge } from "./project-qa-shared";

type ProjectQaDashboardProps = {
  token: string;
  projectId: string;
  initialDetail?: DashboardDetailType;
  showSummary?: boolean;
  detailParams?: Partial<Record<DashboardDetailType, Record<string, string>>>;
  showHeader?: boolean;
};

export type DashboardDetailType =
  | "featuresMissingDescription"
  | "featuresWithoutTestCases"
  | "mandatoryDocumentationMissing"
  | "featureCoverage"
  | "openRuns"
  | "runsWithFullPass"
  | "featureHealth";

type DetailState = {
  type: DashboardDetailType | null;
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error?: string | null;
  params?: Record<string, string>;
};

type MissingDescriptionTypeFilter = "ALL" | "FEATURE" | "MODULE" | "PROJECT";
type MandatoryDocumentationTypeFilter = MissingDescriptionTypeFilter;

const DETAIL_PAGE_SIZE = 10;

export function ProjectQaDashboard({
  token,
  projectId,
  initialDetail,
  showSummary = true,
  detailParams,
  showHeader = true,
}: ProjectQaDashboardProps) {
  const t = useTranslations("app.qa.dashboard");
  const tRuns = useTranslations("app.qa.runs.list");
  const statusLabels = useTranslations("app.qa.runs.panel.statusBadge");
  const formatter = useFormatter();
  const detailCta = t("detail.cta");
  const openExternalLabel = t("detail.openInNewTab");

  const [metrics, setMetrics] = useState<QaDashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [featureHealthSummary, setFeatureHealthSummary] = useState<{
    passed: number;
    failed: number;
    missing: number;
  } | null>(null);
  const [isLoadingHealthSummary, setIsLoadingHealthSummary] = useState(false);
  const [detailState, setDetailState] = useState<DetailState>({
    type: null,
    items: [],
    total: 0,
    page: 1,
    pageSize: DETAIL_PAGE_SIZE,
    isLoading: false,
    error: null,
    params: {},
  });
  const [coverageSortDirection, setCoverageSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [missingDescriptionType, setMissingDescriptionType] =
    useState<MissingDescriptionTypeFilter>("ALL");
  const [mandatoryDocumentationType, setMandatoryDocumentationType] =
    useState<MandatoryDocumentationTypeFilter>("ALL");

  const formatPercent = useCallback(
    (value: number | null | undefined) =>
      formatter.number(value ?? 0, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [formatter]
  );

  const sanitizeDetailParams = useCallback(
    (params?: Record<string, string | undefined>) => {
      if (!params) return undefined;
      const entries = Object.entries(params).filter(
        ([, value]) => value !== undefined
      ) as Array<[string, string]>;
      return entries.length ? Object.fromEntries(entries) : undefined;
    },
    []
  );

  const detailFetchers = useMemo(
    () => ({
      featuresMissingDescription: (
        page: number,
        pageSize: number,
        params?: Record<string, string>
      ) =>
        getProjectDashboardFeaturesMissingDescription(
          token,
          projectId,
          page,
          pageSize,
          params
        ),
      featuresWithoutTestCases: (
        page: number,
        pageSize: number,
        _params?: Record<string, string>
      ) => {
        void _params;
        return getProjectDashboardFeaturesWithoutTestCases(
          token,
          projectId,
          page,
          pageSize
        );
      },
      mandatoryDocumentationMissing: (
        page: number,
        pageSize: number,
        params?: Record<string, string>
      ) =>
        getProjectDashboardMandatoryDocumentationMissing(
          token,
          projectId,
          page,
          pageSize,
          params ?? {}
        ),
      featureCoverage: (
        page: number,
        pageSize: number,
        params?: Record<string, string>
      ) =>
        getProjectDashboardFeatureCoverage(
          token,
          projectId,
          page,
          pageSize,
          params ?? {}
        ),
      featureHealth: (
        page: number,
        pageSize: number,
        _params?: Record<string, string>
      ) => {
        void _params;
        return getProjectDashboardFeatureHealth(
          token,
          projectId,
          page,
          pageSize
        );
      },
      openRuns: (
        page: number,
        pageSize: number,
        _params?: Record<string, string>
      ) => {
        void _params;
        return getProjectDashboardOpenRuns(token, projectId, page, pageSize);
      },
      runsWithFullPass: (
        page: number,
        pageSize: number,
        _params?: Record<string, string>
      ) => {
        void _params;
        return getProjectDashboardRunsWithFullPass(token, projectId, page, pageSize);
      },
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
      featuresWithoutTestCases: {
        title: t("featuresWithoutTestCases.title"),
        description: t("featuresWithoutTestCases.description"),
        empty: t("featuresWithoutTestCases.empty"),
      },
      mandatoryDocumentationMissing: {
        title: t("mandatoryDocumentationMissing.title"),
        description: t("mandatoryDocumentationMissing.description"),
        empty: t("mandatoryDocumentationMissing.empty"),
      },
      featureCoverage: {
        title: t("featureCoverage.title"),
        description: t("featureCoverage.description"),
        empty: t("featureCoverage.empty"),
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
      featureHealth: {
        title: t("featureHealth.title"),
        description: t("featureHealth.description"),
        empty: t("featureHealth.empty"),
      },
    }),
    [t]
  );

  const summarizeFeatureHealth = useCallback(
    (items: QaDashboardFeatureHealth[]) => {
      let passed = 0;
      let failed = 0;
      let missing = 0;
      items.forEach((feature) => {
        const hasMissing = Boolean(feature.hasMissingTestCases);
        const hasFailures =
          typeof feature.failedTestCases === "number" &&
          feature.failedTestCases > 0;
        const hasFullPass =
          !hasMissing &&
          typeof feature.executedTestCases === "number" &&
          feature.executedTestCases > 0 &&
          !hasFailures;
        if (hasMissing) missing += 1;
        if (hasFailures) failed += 1;
        if (hasFullPass) passed += 1;
      });
      return { passed, failed, missing };
    },
    [],
  );

  const loadFeatureHealthSummary = useCallback(async () => {
    setIsLoadingHealthSummary(true);
    try {
      const pageSize = 200;
      const maxPages = 5;
      let page = 1;
      let allItems: QaDashboardFeatureHealth[] = [];
      let total = 0;
      while (page <= maxPages) {
        const result = await getProjectDashboardFeatureHealth(
          token,
          projectId,
          page,
          pageSize,
        );
        allItems = allItems.concat(result.items ?? []);
        total = result.total ?? allItems.length;
        if (allItems.length >= total || result.items.length === 0) break;
        page += 1;
      }
      setFeatureHealthSummary(summarizeFeatureHealth(allItems));
    } catch {
      setFeatureHealthSummary(null);
    } finally {
      setIsLoadingHealthSummary(false);
    }
  }, [projectId, summarizeFeatureHealth, token]);

  const loadDashboard = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const payload = await getProjectDashboard(token, projectId);
      setMetrics({
        ...payload.metrics,
        featuresWithoutTestCases:
          payload.featuresWithoutTestCases ??
          payload.metrics.featuresWithoutTestCases ??
          0,
      });
      void loadFeatureHealthSummary();
    } catch (error) {
      toast.error(t("errors.load"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [loadFeatureHealthSummary, projectId, t, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const mergeDetailParams = useCallback(
    (
      type: DashboardDetailType,
      override?: Record<string, string | undefined>
    ): Record<string, string> | undefined => {
      const base = detailParams?.[type];
      if (!base && !override) return undefined;
      const merged = { ...(base ?? {}), ...(override ?? {}) };
      return sanitizeDetailParams(merged);
    },
    [detailParams, sanitizeDetailParams]
  );
  const loadDetail = useCallback(
    async (
      type: DashboardDetailType,
      page: number,
      params?: Record<string, string>
    ) => {
      let resolvedParams = params;
      setDetailState((prev) => {
        const nextParams =
          resolvedParams ?? (type === prev.type ? prev.params : undefined);
        resolvedParams = nextParams;
        return {
          ...prev,
          type,
          isLoading: true,
          error: null,
          page,
          params: nextParams,
        };
      });
      try {
        const fetcher = detailFetchers[type];
        const result = await fetcher(page, DETAIL_PAGE_SIZE, resolvedParams);
        setDetailState({
          type,
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize ?? DETAIL_PAGE_SIZE,
          isLoading: false,
          error: null,
          params: resolvedParams,
        });
      } catch (error) {
        const description = error instanceof Error ? error.message : null;
        setDetailState((prev) => ({
          ...prev,
          isLoading: false,
          error: description,
          type,
          params: resolvedParams,
        }));
        toast.error(t("errors.detail"), {
          description: description ?? undefined,
        });
      }
    },
    [detailFetchers, t]
  );

  useEffect(() => {
    if (!initialDetail) return;
    const override =
      initialDetail === "featureCoverage"
        ? {
            sort:
              coverageSortDirection === "desc"
                ? "coverageDesc"
                : "coverageAsc",
          }
        : initialDetail === "featuresMissingDescription"
        ? missingDescriptionType === "ALL"
          ? undefined
          : { type: missingDescriptionType }
        : initialDetail === "mandatoryDocumentationMissing"
        ? mandatoryDocumentationType === "ALL"
          ? undefined
          : { type: mandatoryDocumentationType }
        : undefined;
    const params = mergeDetailParams(initialDetail, override);
    void loadDetail(initialDetail, 1, params);
  }, [
    coverageSortDirection,
    initialDetail,
    loadDetail,
    mergeDetailParams,
    missingDescriptionType,
    mandatoryDocumentationType,
  ]);

  useEffect(() => {
    const initialType = detailParams?.featuresMissingDescription?.type;
    if (initialType === "FEATURE" || initialType === "MODULE") {
      setMissingDescriptionType((prev) =>
        prev === "ALL" ? initialType : prev
      );
    }
  }, [detailParams]);

  useEffect(() => {
    const initialType = detailParams?.mandatoryDocumentationMissing?.type;
    if (initialType === "FEATURE" || initialType === "MODULE" || initialType === "PROJECT") {
      setMandatoryDocumentationType((prev) =>
        prev === "ALL" ? initialType : prev
      );
    }
  }, [detailParams]);

  const handleDetailPageChange = useCallback(
    (page: number) => {
      if (!detailState.type) return;
      void loadDetail(detailState.type, page, detailState.params);
    },
    [detailState.params, detailState.type, loadDetail]
  );

  const handleCoverageSortChange = useCallback(
    (direction: "asc" | "desc") => {
      setCoverageSortDirection(direction);
      if (detailState.type === "featureCoverage") {
        const sortParam = direction === "desc" ? "coverageDesc" : "coverageAsc";
        const params = mergeDetailParams("featureCoverage", {
          sort: sortParam,
        });
        void loadDetail("featureCoverage", 1, params);
      }
    },
    [detailState.type, loadDetail, mergeDetailParams]
  );

  const handleMissingDescriptionFilterChange = useCallback(
    (next: MissingDescriptionTypeFilter) => {
      setMissingDescriptionType(next);
      const override =
        next === "ALL" ? { type: undefined } : { type: next };
      const params = mergeDetailParams(
        "featuresMissingDescription",
        override
      );
      void loadDetail("featuresMissingDescription", 1, params);
    },
    [loadDetail, mergeDetailParams]
  );

  const handleMandatoryDocumentationFilterChange = useCallback(
    (next: MandatoryDocumentationTypeFilter) => {
      setMandatoryDocumentationType(next);
      const override =
        next === "ALL" ? { type: undefined } : { type: next };
      const params = mergeDetailParams(
        "mandatoryDocumentationMissing",
        override
      );
      void loadDetail("mandatoryDocumentationMissing", 1, params);
    },
    [loadDetail, mergeDetailParams]
  );

  const getFeatureHref = useCallback(
    (featureId: string) => `/app/projects/${projectId}/features/${featureId}`,
    [projectId]
  );

  const getRunHref = useCallback(
    (runId: string) => `/app/projects/${projectId}/test-runs/${runId}`,
    [projectId]
  );

  const missingDescriptionFilterLabels = useMemo(
    () => ({
      label: t("missingDescription.filter.label"),
      all: t("missingDescription.filter.all"),
      features: t("missingDescription.filter.features"),
      modules: t("missingDescription.filter.modules"),
    }),
    [t]
  );

  const mandatoryDocumentationFilterLabels = useMemo(
    () => ({
      label: t("mandatoryDocumentationMissing.filter.label"),
      all: t("mandatoryDocumentationMissing.filter.all"),
      features: t("mandatoryDocumentationMissing.filter.features"),
      modules: t("mandatoryDocumentationMissing.filter.modules"),
      projects: t("mandatoryDocumentationMissing.filter.projects"),
    }),
    [t]
  );

  const missingDescriptionEntityLabels = useMemo(
    () => ({
      FEATURE: t("missingDescription.entityType.FEATURE"),
      MODULE: t("missingDescription.entityType.MODULE"),
    }),
    [t]
  );

  const mandatoryDocumentationEntityLabels = useMemo(
    () => ({
      FEATURE: t("mandatoryDocumentationMissing.entityType.FEATURE"),
      MODULE: t("mandatoryDocumentationMissing.entityType.MODULE"),
      PROJECT: t("mandatoryDocumentationMissing.entityType.PROJECT"),
    }),
    [t]
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
      detailType?: DashboardDetailType;
      slug?: string;
      badges?: ReactNode;
    }> = [
      { key: "totalFeatures", label: t("metrics.totalFeatures") },
      {
        key: "featuresMissingDescription",
        label: t("metrics.featuresMissingDescription"),
        detailType: "featuresMissingDescription",
        slug: "no-description",
      },
      {
        key: "entitiesMissingMandatoryDocumentation",
        label: t("metrics.entitiesMissingMandatoryDocumentation"),
        detailType: "mandatoryDocumentationMissing",
        slug: "mandatory-missing",
      },
      {
        key: "featuresWithoutTestCases",
        label: t("metrics.featuresWithoutTestCases"),
        detailType: "featuresWithoutTestCases",
        slug: "no-test-cases",
      },
      {
        key: "featuresWithRuns",
        label: t("metrics.featuresWithRuns"),
        detailType: "featureHealth",
        slug: "with-runs",
        badges:
          !isLoadingHealthSummary && featureHealthSummary
            ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SummaryBadge
                    label={`${t("featureHealth.labels.passed")}: ${featureHealthSummary.passed}`}
                    tone="success"
                  />
                  <SummaryBadge
                    label={`${t("featureHealth.labels.failed")}: ${featureHealthSummary.failed}`}
                    tone="danger"
                  />
                  <SummaryBadge
                    label={`${t("featureHealth.labels.missing")}: ${featureHealthSummary.missing}`}
                  />
                </div>
              )
            : null,
      },
      {
        key: "openRuns",
        label: t("metrics.openRuns"),
        detailType: "openRuns",
        slug: "open-runs",
      },
      {
        key: "runsWithFullPass",
        label: t("metrics.runsWithFullPass"),
        detailType: "runsWithFullPass",
        slug: "fullpass",
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
              getFeatureHref={getFeatureHref}
              openExternalLabel={openExternalLabel}
              entityLabels={missingDescriptionEntityLabels}
            />
          );
          break;
        case "featuresWithoutTestCases":
          detailContent = (
            <MissingDescriptionList
              items={
                detailState.items as QaDashboardFeatureWithoutTestCases[]
              }
              linkLabel={t("detail.openFeature")}
              getFeatureHref={getFeatureHref}
              openExternalLabel={openExternalLabel}
            />
          );
          break;
        case "mandatoryDocumentationMissing":
          detailContent = (
            <>
              <MandatoryDocumentationList
                items={
                  detailState.items as QaDashboardMandatoryDocumentationMissing[]
                }
                t={{
                  missingLabels: t("mandatoryDocumentationMissing.labels.missing"),
                }}
                entityLabels={mandatoryDocumentationEntityLabels}
                openExternalLabel={openExternalLabel}
                getFeatureHref={getFeatureHref}
              />
            </>
          );
          break;
        case "featureCoverage": {
          detailContent = (
            <>
              <CoverageSortControls
                direction={coverageSortDirection}
                onChange={handleCoverageSortChange}
                labels={{
                  sort: t("detail.sortLabel"),
                  highToLow: t("detail.sortDesc"),
                  lowToHigh: t("detail.sortAsc"),
                }}
              />
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
                  noCases: t("featureCoverage.noCases"),
                }}
                getFeatureHref={getFeatureHref}
                openExternalLabel={openExternalLabel}
              />
          </>
        );
        break;
      }
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
              getRunHref={getRunHref}
              openExternalLabel={openExternalLabel}
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
              getRunHref={getRunHref}
              openExternalLabel={openExternalLabel}
            />
          );
          break;
        case "featureHealth":
          detailContent = (
            <FeatureHealthList
              items={detailState.items as QaDashboardFeatureHealth[]}
              formatter={formatter}
              t={{
                lastRunLabel: t("featureHealth.lastRunLabel"),
                noRuns: t("featureHealth.noRuns"),
                notAvailable: t("featureHealth.notAvailable"),
                stats: {
                  executed: (count) =>
                    t("featureHealth.stats.executed", { count }),
                  passed: (count) =>
                    t("featureHealth.stats.passed", { count }),
                  failed: (count) =>
                    t("featureHealth.stats.failed", { count }),
                },
                missingAlert: (count) =>
                  t("featureHealth.missingAlert", { count }),
                labels: {
                  missing: t("featureHealth.labels.missing"),
                  passed: t("featureHealth.labels.passed"),
                  failed: t("featureHealth.labels.failed"),
                },
              }}
              getFeatureHref={getFeatureHref}
              openExternalLabel={openExternalLabel}
            />
          );
          break;
        default:
          detailContent = null;
      }
    }

    const detailBaseHref = `/app/projects/${projectId}/dashboard`;
    const summarySection = showSummary ? (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => {
            const rawValue = metrics[metric.key] ?? 0;
            const value =
              metric.format !== undefined
                ? metric.format(rawValue)
                : formatter.number(rawValue);
            const isCoverageButton = metric.key === "totalFeatures";
            const detailHref = isCoverageButton
              ? `${detailBaseHref}/coverage`
              : metric.slug !== undefined
              ? `${detailBaseHref}/${metric.slug}`
              : undefined;
            const ctaLabel = isCoverageButton
              ? t("featureCoverage.cta")
              : metric.detailType
              ? detailCta
              : undefined;
            return (
              <DashboardMetricCard
                key={metric.key}
                label={metric.label}
                value={value}
                href={detailHref}
                ctaLabel={ctaLabel}
                badges={metric.badges}
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
          ctaHref={`${detailBaseHref}/coverage`}
          ctaLabel={detailCta}
        />
      </>
    ) : null;

  const detailSection = (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {activeDetail ? detailMeta[activeDetail].title : t("detail.title")}
            </p>
            <p className="text-2xs text-muted-foreground">
              {activeDetail
                ? detailMeta[activeDetail].description
                : t("detail.subtitle")}
            </p>
          </div>
          {activeDetail === "featuresMissingDescription" && (
            <MissingDescriptionFilter
              value={missingDescriptionType}
              labels={missingDescriptionFilterLabels}
              onChange={handleMissingDescriptionFilterChange}
            />
          )}
          {activeDetail === "mandatoryDocumentationMissing" && (
              <MissingDescriptionFilter
                value={mandatoryDocumentationType}
                labels={mandatoryDocumentationFilterLabels}
                onChange={handleMandatoryDocumentationFilterChange}
                includeProjects
              />
          )}
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
    );

    content = (
      <div className="space-y-6">
        {summarySection}
        {!showSummary && detailSection}
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      {showHeader && (
        <header className="border-b border-border px-4 pb-2 pt-4 md:px-6">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>
      )}
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
  ctaLabel,
  ctaHref,
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
  ctaLabel?: string;
  ctaHref?: string;
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
          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className="inline-flex w-fit text-2xs font-medium text-primary transition hover:text-primary/80"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function CoverageSortControls({
  direction,
  onChange,
  labels,
}: {
  direction: "asc" | "desc";
  onChange: (direction: "asc" | "desc") => void;
  labels: { sort: string; highToLow: string; lowToHigh: string };
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium text-muted-foreground">{labels.sort}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("desc")}
          className={cn(
            "rounded-full border px-3 py-1 transition",
            direction === "desc"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-background"
          )}
        >
          {labels.highToLow}
        </button>
        <button
          type="button"
          onClick={() => onChange("asc")}
          className={cn(
            "rounded-full border px-3 py-1 transition",
            direction === "asc"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-background"
          )}
        >
          {labels.lowToHigh}
        </button>
      </div>
    </div>
  );
}

function FeatureCoverageList({
  items,
  formatter,
  t,
  onSelectFeature,
  getFeatureHref,
  openExternalLabel,
}: {
  items: QaDashboardFeatureCoverage[];
  formatter: ReturnType<typeof useFormatter>;
  t: {
    latestRun: (date: string) => string;
    coverageLabel: (executed: number, total: number) => string;
    missingLabel: (count: number) => string;
    noRuns: string;
    noCases: string;
  };
  onSelectFeature?: (featureId?: string | null) => void;
  getFeatureHref?: (featureId: string) => string;
  openExternalLabel: string;
}) {
  return (
    <ul className="space-y-4">
      {items.map((feature) => {
        const total = feature.totalTestCases ?? 0;
        const executed = feature.executedTestCases ?? 0;
        const missing =
          feature.missingTestCases ??
          (total > 0 ? Math.max(total - executed, 0) : 0);
        const ratio =
          feature.coverageRatio !== null && feature.coverageRatio !== undefined
            ? feature.coverageRatio
            : total > 0
            ? executed / total
            : null;
        const percent =
          ratio !== null ? Math.round(Math.min(Math.max(ratio, 0), 1) * 100) : null;
        const runDate = feature.latestRun
          ? formatter.dateTime(new Date(feature.latestRun.runDate), {
              dateStyle: "medium",
            })
          : null;
        const href =
          feature.featureId && getFeatureHref
            ? getFeatureHref(feature.featureId)
            : null;
        const isClickable = Boolean(onSelectFeature && feature.featureId);
        const externalLink =
          href && openExternalLabel ? (
            <Link
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={openExternalLabel}
              title={openExternalLabel}
              className="text-muted-foreground transition hover:text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{openExternalLabel}</span>
            </Link>
          ) : null;
        const content = (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{feature.featureName}</p>
                  {externalLink}
                </div>
                <p className="text-2xs text-muted-foreground">
                  {runDate ? t.latestRun(runDate) : t.noRuns}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">
                  {percent !== null ? `${percent}%` : t.noCases}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${percent ?? 0}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
                <span>{t.coverageLabel(executed, total)}</span>
                {percent !== null ? (
                  <>
                    <span aria-hidden>•</span>
                    <span>{percent}%</span>
                  </>
                ) : null}
                {total === 0 ? <span>{t.noCases}</span> : null}
              </div>
              {missing > 0 ? (
                <SummaryBadge label={t.missingLabel(missing)} />
              ) : null}
            </div>
          </>
        );
        return (
          <li key={feature.featureId}>
            {isClickable ? (
              <button
                type="button"
                onClick={() => onSelectFeature?.(feature.featureId)}
                className="w-full space-y-3 rounded-xl border bg-background/80 px-4 py-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {content}
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border bg-background/80 px-4 py-3">
                {content}
              </div>
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
  t,
  getFeatureHref,
  openExternalLabel,
}: {
  items: QaDashboardFeatureHealth[];
  formatter: ReturnType<typeof useFormatter>;
  t: {
    lastRunLabel: string;
    noRuns: string;
    notAvailable: string;
    stats: {
      executed: (count: number) => string;
      passed: (count: number) => string;
      failed: (count: number) => string;
    };
    missingAlert: (count: number) => string;
    labels: {
      missing: string;
      passed: string;
      failed: string;
    };
  };
  getFeatureHref?: (featureId: string) => string;
  openExternalLabel: string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((feature) => {
        const passRate =
          feature.passRate !== null && feature.passRate !== undefined
            ? formatter.number(feature.passRate, {
                style: "percent",
                maximumFractionDigits: 0,
              })
            : t.notAvailable;
        const runDate = feature.latestRun
          ? formatter.dateTime(new Date(feature.latestRun.runDate), {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : null;
        const lastRunText = runDate
          ? `${t.lastRunLabel}: ${runDate}`
          : t.noRuns;
        const executedCount =
          typeof feature.executedTestCases === "number"
            ? feature.executedTestCases
            : null;
        const passedCount =
          typeof feature.passedTestCases === "number"
            ? feature.passedTestCases
            : null;
        const failedCount =
          typeof feature.failedTestCases === "number"
            ? feature.failedTestCases
            : null;
        const safePassed = Math.max(passedCount ?? 0, 0);
        let safeFailed = Math.max(failedCount ?? 0, 0);
        if (
          safeFailed === 0 &&
          executedCount !== null &&
          executedCount > safePassed
        ) {
          safeFailed = Math.max(executedCount - safePassed, 0);
        }
        const safeMissing = Math.max(
          feature.missingTestCasesCount ?? 0,
          0
        );
        let totalTestCases = safePassed + safeFailed + safeMissing;
        if (totalTestCases === 0 && executedCount) {
          totalTestCases = executedCount;
        }
        const stats: string[] = [];
        if (executedCount !== null) {
          stats.push(t.stats.executed(executedCount));
        }
        if (passedCount !== null) {
          stats.push(t.stats.passed(passedCount));
        }
        if (failedCount !== null) {
          stats.push(t.stats.failed(failedCount));
        }
        const missingAlert =
          feature.hasMissingTestCases && feature.missingTestCasesCount !== null
            ? t.missingAlert(feature.missingTestCasesCount)
            : feature.hasMissingTestCases
            ? t.missingAlert(0)
            : null;
        const badgeToneClasses: Record<"default" | "success" | "danger", string> = {
          default: "border-muted bg-muted/60 text-muted-foreground",
          success: "border-emerald-200 bg-emerald-100 text-emerald-800",
          danger: "border-red-200 bg-red-100 text-red-800",
        };
        const hasFailures = failedCount !== null && failedCount > 0;
        const hasFullPass =
          !feature.hasMissingTestCases &&
          executedCount !== null &&
          executedCount > 0 &&
          !hasFailures;
        const badges: Array<{ label: string; tone: "default" | "success" | "danger" }> = [];
        if (feature.hasMissingTestCases) {
          badges.push({ label: t.labels.missing, tone: "default" });
        }
        if (hasFailures) {
          badges.push({ label: t.labels.failed, tone: "danger" });
        }
        if (hasFullPass) {
          badges.push({ label: t.labels.passed, tone: "success" });
        }
        const href =
          getFeatureHref && feature.featureId
            ? getFeatureHref(feature.featureId)
            : null;
        const externalLink =
          href && openExternalLabel ? (
            <Link
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={openExternalLabel}
              title={openExternalLabel}
              className="text-muted-foreground transition hover:text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{openExternalLabel}</span>
            </Link>
          ) : null;
        const badgeElements =
          badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={`${feature.featureId}-${badge.label}`}
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium",
                    badgeToneClasses[badge.tone]
                  )}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null;
        return (
          <li key={feature.featureId}>
            <div className="space-y-2 rounded-xl border bg-background/80 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{feature.featureName}</p>
                    {externalLink}
                  </div>
                  <p className="text-2xs text-muted-foreground">{lastRunText}</p>
                  {badgeElements}
                  {stats.length ? (
                    <p className="text-2xs text-muted-foreground">
                  {stats.join(" · ")}
                </p>
              ) : null}
              {totalTestCases > 0 ? (
                <TestCaseDistributionBar
                  total={totalTestCases}
                  missing={safeMissing}
                  passed={safePassed}
                  failed={safeFailed}
                  labels={{
                    missing: t.labels.missing,
                    passed: t.labels.passed,
                    failed: t.labels.failed,
                  }}
                />
              ) : null}
              {missingAlert ? (
                <p className="text-2xs font-medium text-destructive">
                  {missingAlert}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{passRate}</p>
                </div>
              </div>
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
  linkLabel,
  onSelectFeature,
  getFeatureHref,
  openExternalLabel,
  entityLabels,
}: {
  items: Array<{ id: string; name: string; entityType?: string }>;
  caption?: string;
  badgeLabel?: string;
  linkLabel?: string;
  onSelectFeature?: (featureId: string) => void;
  getFeatureHref?: (featureId: string) => string;
  openExternalLabel: string;
  entityLabels?: Record<string, string>;
}) {
  return (
    <ul className="space-y-3">
      {items.map((feature) => {
        const href =
          getFeatureHref && feature.id ? getFeatureHref(feature.id) : null;
        const isClickable = Boolean(onSelectFeature);
        const baseLinkProps = href
          ? {
              href,
              target: "_blank",
              rel: "noreferrer",
              onClick: (event: MouseEvent) => event.stopPropagation(),
            }
          : null;
        const externalLink =
          baseLinkProps && openExternalLabel ? (
            <Link
              {...baseLinkProps}
              aria-label={openExternalLabel}
              title={openExternalLabel}
              className="text-muted-foreground transition hover:text-primary"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{openExternalLabel}</span>
            </Link>
          ) : null;
        const buttonLink =
          baseLinkProps && linkLabel ? (
            <Link
              {...baseLinkProps}
              aria-label={openExternalLabel}
              title={openExternalLabel}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:underline"
            >
              {linkLabel}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null;
        const content = (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">{feature.name}</p>
                {feature.entityType && entityLabels ? (
                  <span className="inline-flex rounded-full border border-muted px-2 py-0.5 text-2xs text-muted-foreground">
                    {entityLabels[feature.entityType] ?? feature.entityType}
                  </span>
                ) : null}
                {buttonLink ?? externalLink}
              </div>
              {caption ? (
                <p className="text-2xs text-muted-foreground">{caption}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {badgeLabel ? <SummaryBadge label={badgeLabel} /> : null}
            </div>
          </div>
        );
        return (
          <li key={feature.id}>
            {isClickable ? (
              <button
                type="button"
                onClick={() => onSelectFeature?.(feature.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 py-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 py-3">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MandatoryDocumentationList({
  items,
  t,
  entityLabels,
  openExternalLabel,
  getFeatureHref,
}: {
  items: QaDashboardMandatoryDocumentationMissing[];
  t: {
    missingLabels: string;
  };
  entityLabels: Record<string, string>;
  openExternalLabel: string;
  getFeatureHref?: (featureId: string) => string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((entity) => {
        const featureLink =
          entity.entityType === "FEATURE" && getFeatureHref
            ? getFeatureHref(entity.id)
            : null;
        const externalLink =
          featureLink && openExternalLabel ? (
            <Link
              href={featureLink}
              target="_blank"
              rel="noreferrer"
              aria-label={openExternalLabel}
              title={openExternalLabel}
              className="text-muted-foreground transition hover:text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{openExternalLabel}</span>
            </Link>
          ) : null;
        return (
          <li key={entity.id}>
            <div className="rounded-xl border bg-background/70 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{entity.name}</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium",
                        entity.entityType === "FEATURE"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : entity.entityType === "MODULE"
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      )}
                    >
                      {entityLabels[entity.entityType] ?? entity.entityType}
                    </span>
                    {externalLink}
                  </div>
                  <p className="text-[11px] text-blue-700">
                    <span className="inline-flex rounded-md border border-blue-200 bg-blue-50/70 px-2 py-0.5">
                      {t.missingLabels}:{" "}
                      <span className="font-medium text-blue-900">
                        {entity.missingLabels.map((label) => label.name).join(", ")}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
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
  onSelectRun,
  getRunHref,
  openExternalLabel,
}: {
  runs: QaDashboardRunSummary[];
  formatter: ReturnType<typeof useFormatter>;
  titleFallback: (id: string) => string;
  runByLabel: (name: string) => string;
  coverageLabel: (executed: number, total: number) => string;
  badgeLabel: (status: QaDashboardRunSummary["status"]) => string;
  badgeTone?: (status: QaDashboardRunSummary["status"]) => "default" | "success";
  onSelectRun?: (runId: string) => void;
  getRunHref?: (runId: string) => string;
  openExternalLabel: string;
}) {
  return (
    <ul className="space-y-3">
      {runs.map((run) => {
        const title = run.feature?.name ?? titleFallback(run.id);
        const runDate = formatter.dateTime(new Date(run.runDate), {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const isClickable = Boolean(onSelectRun);
        const href = getRunHref ? getRunHref(run.id) : null;
        const externalLink =
          href && openExternalLabel ? (
            <Link
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={openExternalLabel}
              title={openExternalLabel}
              className="text-muted-foreground transition hover:text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{openExternalLabel}</span>
            </Link>
          ) : null;
        const content = (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{title}</p>
                  {externalLink}
                </div>
                <p className="text-2xs text-muted-foreground">{runDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <SummaryBadge
                  label={badgeLabel(run.status)}
                  tone={badgeTone ? badgeTone(run.status) : "default"}
                />
              </div>
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
          </>
        );
        return (
          <li key={run.id}>
            {isClickable ? (
              <button
                type="button"
                onClick={() => onSelectRun?.(run.id)}
                className="w-full space-y-2 rounded-xl border bg-background/80 px-4 py-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {content}
              </button>
            ) : (
              <div className="space-y-2 rounded-xl border bg-background/80 px-4 py-3">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TestCaseDistributionBar({
  total,
  missing,
  passed,
  failed,
  labels,
}: {
  total: number;
  missing: number;
  passed: number;
  failed: number;
  labels: { missing: string; passed: string; failed: string };
}) {
  if (total <= 0) return null;
  const segments = [
    { value: missing, color: "bg-slate-300 dark:bg-slate-600" },
    { value: passed, color: "bg-emerald-500" },
    { value: failed, color: "bg-rose-500" },
  ].filter((segment) => segment.value > 0);
  let offset = 0;
  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment, index) => {
          const width = Math.max((segment.value / total) * 100, 0);
          if (width <= 0) {
            return null;
          }
          const style = {
            width: `${width}%`,
            left: `${offset}%`,
          };
          offset += width;
          return (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`${segment.color}-${index}`}
              className={cn(
                "absolute inset-y-0",
                segment.color
              )}
              style={style}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-2xs text-muted-foreground">
        <LegendDot colorClass="bg-slate-400 dark:bg-slate-500" label={`${labels.missing}: ${missing}`} />
        <LegendDot colorClass="bg-emerald-500" label={`${labels.passed}: ${passed}`} />
        <LegendDot colorClass="bg-rose-500" label={`${labels.failed}: ${failed}`} />
      </div>
    </div>
  );
}

function LegendDot({
  colorClass,
  label,
}: {
  colorClass: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn("h-2 w-2 rounded-full", colorClass)}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
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

function MissingDescriptionFilter({
  value,
  labels,
  onChange,
  includeProjects = false,
}: {
  value: MissingDescriptionTypeFilter;
  labels: {
    label: string;
    all: string;
    features: string;
    modules: string;
    projects?: string;
  };
  onChange: (next: MissingDescriptionTypeFilter) => void;
  includeProjects?: boolean;
}) {
  const options: Array<{ value: MissingDescriptionTypeFilter; label: string }> =
    [
      { value: "ALL", label: labels.all },
      { value: "FEATURE", label: labels.features },
      { value: "MODULE", label: labels.modules },
    ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-muted-foreground">{labels.label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded-full border px-3 py-1 transition",
            value === option.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-background"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DashboardMetricCard({
  label,
  value,
  href,
  ctaLabel,
  badges,
}: {
  label: string;
  value: string;
  href?: string;
  ctaLabel?: string;
  badges?: ReactNode;
}) {
  const content = (
    <>
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {badges}
      {ctaLabel && (
        <span className="mt-2 inline-flex text-2xs font-medium text-primary">
          {ctaLabel}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl border bg-card p-4 shadow-sm">{content}</div>;
}
