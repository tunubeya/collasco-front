"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  CreateProjectTestRunDto,
  QaEvaluation,
  QaProjectRunListItem,
  QaTestRunDetail,
  createProjectTestRun,
  getTestRun,
  listProjectTestRuns,
} from "@/lib/api/qa";
import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";
import { TestRunPanel, RESULT_STATUSES } from "@/app/app/projects/[projectId]/features/[featureId]/feature-qa.client";
import { FeatureOption } from "./project-qa.types";
import { NewProjectRunDialog } from "./project-qa-dialog.client";
import { SummaryBadge, EmptyState, Skeleton } from "./project-qa-shared";

const RUNS_LIMIT = 10;

type ProjectQAProps = {
  token: string;
  projectId: string;
  featureOptions: FeatureOption[];
  currentUserId?: string;
};

export function ProjectQA({
  token,
  projectId,
  featureOptions,
  currentUserId,
}: ProjectQAProps) {
  const t = useTranslations("app.qa.runs");
  const formatter = useFormatter();
  const hasFeatures = featureOptions.length > 0;

  const [runs, setRuns] = useState<QaProjectRunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<QaTestRunDetail | null>(null);
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listProjectTestRuns(token, projectId, RUNS_LIMIT);
      setRuns(data);
    } catch (error) {
      toast.error(t("errors.load"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t, token]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const summarizeResults = useCallback((run: QaTestRunDetail) => {
    return RESULT_STATUSES.reduce<Record<QaEvaluation, number>>(
      (acc, evaluation) => {
        acc[evaluation] = run.results.filter(
          (result) => result.evaluation === evaluation
        ).length;
        return acc;
      },
      {
        NOT_WORKING: 0,
        MINOR_ISSUE: 0,
        PASSED: 0,
      }
    );
  }, []);

  const handleCreateRun = useCallback(
    async (dto: CreateProjectTestRunDto) => {
      try {
        const payload: CreateProjectTestRunDto = {
          ...dto,
          runById: currentUserId ?? dto.runById,
        };
        const created = await createProjectTestRun(token, projectId, payload);
        const summary = summarizeResults(created);
        setRuns((prev) => [
          {
            id: created.id,
            runDate: created.runDate,
            name: created.name ?? null,
            environment: created.environment ?? null,
            by: created.runBy?.name ?? null,
            feature: created.feature ?? null,
            summary,
          },
          ...prev,
        ]);
        setSelectedRunId(created.id);
        setSelectedRun(created);
        toast.success(t("alerts.created"));
      } catch (error) {
        toast.error(t("errors.create"), {
          description: error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [currentUserId, projectId, summarizeResults, t, token]
  );

  const openRun = useCallback(
    async (runId: string) => {
      setSelectedRunId(runId);
      setIsRunLoading(true);
      try {
        const run = await getTestRun(token, runId);
        setSelectedRun(run);
      } catch (error) {
        toast.error(t("errors.loadRun"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setIsRunLoading(false);
      }
    },
    [t, token]
  );

  const handleRunUpdated = useCallback(
    (run: QaTestRunDetail) => {
      const summary = summarizeResults(run);
      setRuns((prev) =>
        prev.map((item) =>
          item.id === run.id
            ? {
                ...item,
                summary,
                by: run.runBy?.name ?? item.by,
                name: run.name ?? item.name,
                environment: run.environment ?? item.environment,
                feature: run.feature ?? item.feature,
              }
            : item
        )
      );
      setSelectedRun(run);
    },
    [summarizeResults]
  );

  const runListContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      );
    }

    if (!runs.length) {
      return (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.description")}
          actionLabel={t("empty.cta")}
          onAction={() => setDialogOpen(true)}
        />
      );
    }

    return (
      <ul className="space-y-3">
        {runs.map((run) => {
          const total = Object.values(run.summary ?? {}).reduce(
            (acc, value) => acc + value,
            0
          );
          const passed = run.summary?.PASSED ?? 0;
          const runDate = formatter.dateTime(new Date(run.runDate), {
            dateStyle: "medium",
            timeStyle: "short",
          });
          const title =
            run.name?.trim() || t("list.runFallback", { id: run.id });
          return (
            <li
              key={run.id}
              className={cn(
                "rounded-xl border p-4 transition hover:border-primary",
                selectedRunId === run.id && "border-primary"
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="text-xs text-muted-foreground">{runDate}</p>
                  {run.environment && (
                    <p className="text-xs text-muted-foreground">
                      {run.environment}
                    </p>
                  )}
                  {run.feature?.name && (
                    <p className="text-xs text-muted-foreground">
                      {run.feature.name}
                    </p>
                  )}
                  {run.by && (
                    <p className="text-xs text-muted-foreground">
                      {t("list.runBy", { name: run.by })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SummaryBadge label={t("summary.total", { count: total })} />
                  <SummaryBadge
                    label={t("summary.passed", { count: passed })}
                    tone="success"
                  />
                  <Button
                    size="sm"
                    variant={selectedRunId === run.id ? "default" : "outline"}
                    onClick={() => openRun(run.id)}
                  >
                    {t("list.open")}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }, [formatter, isLoading, openRun, runs, selectedRunId, t]);

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <header className="border-b border-border px-4 pb-2 pt-4 md:px-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <div className="space-y-6 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Button
            onClick={() => hasFeatures && setDialogOpen(true)}
            disabled={!hasFeatures}
          >
            {t("actions.newRun")}
          </Button>
          {!hasFeatures && (
            <p className="text-xs text-muted-foreground">{t("noFeatures")}</p>
          )}
        </div>

        {runListContent}

        <NewProjectRunDialog
          token={token}
          featureOptions={featureOptions}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={async (values) => {
            await handleCreateRun(values);
            setDialogOpen(false);
            void loadRuns();
          }}
        />

        <div>
          {isRunLoading && (
            <div className="mt-6 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {!isRunLoading && selectedRun && (
            <TestRunPanel
              token={token}
              run={selectedRun}
              onRunUpdated={handleRunUpdated}
            />
          )}
          {!isRunLoading && !selectedRun && runs.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("list.open")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
