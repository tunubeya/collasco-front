"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  CreateProjectTestRunDto,
  QaEvaluation,
  QaProjectRunListItem,
  QaRunScope,
  QaTestRunDetail,
  createProjectTestRun,
  listProjectTestRuns,
} from "@/lib/api/qa";
import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";
import { RESULT_STATUSES } from "@/app/app/projects/[projectId]/features/[featureId]/feature-qa.client";
import { FeatureOption } from "./project-qa.types";
import { NewProjectRunDialog } from "./project-qa-dialog.client";
import { SummaryBadge, EmptyState, Skeleton, ScopeBadge } from "./project-qa-shared";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Plus } from "lucide-react";

const RUNS_LIMIT = 10;

type ProjectQAProps = {
  token: string;
  projectId: string;
  featureOptions: FeatureOption[];
  currentUserId?: string;
  canManageQa?: boolean;
};

export function ProjectQA({
  token,
  projectId,
  featureOptions,
  currentUserId,
  canManageQa = false,
}: ProjectQAProps) {
  const t = useTranslations("app.qa.runs");
  const formatter = useFormatter();
  const router = useRouter();
  const hasFeatures = featureOptions.length > 0;

  const [runs, setRuns] = useState<QaProjectRunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<QaRunScope>("ALL");

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listProjectTestRuns(token, projectId, RUNS_LIMIT, scopeFilter);
      setRuns(data);
    } catch (error) {
      toast.error(t("errors.load"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, scopeFilter, t, token]);

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
        NOT_STARTED: 0,
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
          status: "OPEN",
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
            status: created.status,
            feature: created.feature ?? null,
            summary,
            totalTestCases: dto.targetTestCaseIds?.length ?? 0,
          },
          ...prev,
        ]);
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

  const openRunPage = useCallback(
    (runId: string) => {
      router.push(`/app/projects/${projectId}/test-runs/${runId}`);
    },
    [projectId, router]
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
          actionLabel={
            canManageQa && hasFeatures ? t("empty.cta") : undefined
          }
          onAction={
            canManageQa && hasFeatures ? () => setDialogOpen(true) : undefined
          }
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
          const scope: QaRunScope = run.feature ? "FEATURE" : "PROJECT";
          const statusLabel =
            run.status === "CLOSED"
              ? t("panel.statusBadge.CLOSED")
              : run.status === "OPEN"
              ? t("panel.statusBadge.OPEN")
              : null;
          return (
            <li
              key={run.id}
              className={cn(
                "rounded-xl border p-4 transition hover:border-primary"
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <ScopeBadge scope={scope} />
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
                  {statusLabel && (
                    <SummaryBadge
                      label={statusLabel}
                      tone={run.status === "CLOSED" ? "success" : "default"}
                    />
                  )}
                  <SummaryBadge label={t("summary.total", { count: total })} />
                  <SummaryBadge
                    label={t("summary.passed", { count: passed })}
                    tone="success"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRunPage(run.id)}
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
  }, [canManageQa, formatter, hasFeatures, isLoading, openRunPage, runs, t]);

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <header className="border-b border-border px-4 pb-2 pt-4 md:px-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <div className="space-y-6 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("filters.label")}
            </span>
            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as QaRunScope)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">{t("filters.all")}</option>
              <option value="PROJECT">{t("filters.project")}</option>
              <option value="FEATURE">{t("filters.feature")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {canManageQa && (
              <button
                type="button"
                className={actionButtonClass()}
                onClick={() => hasFeatures && setDialogOpen(true)}
                disabled={!hasFeatures}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t("actions.newRun")}
              </button>
            )}
            {!hasFeatures && (
              <p className="text-xs text-muted-foreground">{t("noFeatures")}</p>
            )}
          </div>
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

      </div>
    </section>
  );
}
