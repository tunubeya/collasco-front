"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  CreateProjectTestRunDto,
  QaEvaluation,
  QaProjectRunListItem,
  QaTestCase,
  QaTestRunDetail,
  createProjectTestRun,
  getTestRun,
  listProjectTestRuns,
  listTestCases,
} from "@/lib/api/qa";
import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";
import { TestRunPanel, RESULT_STATUSES } from "@/app/app/projects/[projectId]/features/[featureId]/feature-qa.client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogTrigger,
} from "@/ui/components/dialog/dialog";

const RUNS_LIMIT = 10;

type FeatureOption = {
  id: string;
  name: string;
};

type ProjectQAProps = {
  token: string;
  projectId: string;
  featureOptions: FeatureOption[];
  currentUserId?: string;
};

export function ProjectQA({ token, projectId, featureOptions, currentUserId }: ProjectQAProps) {
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
        acc[evaluation] = run.results.filter((result) => result.evaluation === evaluation).length;
        return acc;
      },
      {
        NOT_WORKING: 0,
        MINOR_ISSUE: 0,
        PASSED: 0,
      },
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
            by: created.runBy?.name ?? null,
            feature: created.feature,
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
    [currentUserId, projectId, summarizeResults, t, token],
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
    [t, token],
  );

  const handleRunUpdated = useCallback(
    (run: QaTestRunDetail) => {
      const summary = summarizeResults(run);
      setRuns((prev) =>
        prev.map((item) =>
          item.id === run.id
            ? { ...item, summary, by: run.runBy?.name ?? item.by, feature: run.feature ?? item.feature }
            : item,
        ),
      );
      setSelectedRun(run);
    },
    [summarizeResults],
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
          const total = Object.values(run.summary ?? {}).reduce((acc, value) => acc + value, 0);
          const passed = run.summary?.PASSED ?? 0;
          const runDate = formatter.dateTime(new Date(run.runDate), {
            dateStyle: "medium",
            timeStyle: "short",
          });
          return (
            <li
              key={run.id}
              className={cn(
                "rounded-xl border p-4 transition hover:border-primary",
                selectedRunId === run.id && "border-primary",
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    {run.feature ? `${run.feature.name}` : t("list.runFallback", { id: run.id })}
                  </h3>
                  <p className="text-xs text-muted-foreground">{runDate}</p>
                  {run.by && (
                    <p className="text-xs text-muted-foreground">
                      {t("list.runBy", { name: run.by })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SummaryBadge label={t("summary.total", { count: total })} />
                  <SummaryBadge label={t("summary.passed", { count: passed })} tone="success" />
                  <Button size="sm" variant={selectedRunId === run.id ? "default" : "outline"} onClick={() => openRun(run.id)}>
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
          <Button onClick={() => hasFeatures && setDialogOpen(true)} disabled={!hasFeatures}>
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
            <TestRunPanel token={token} run={selectedRun} onRunUpdated={handleRunUpdated} />
          )}
          {!isRunLoading && !selectedRun && runs.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">{t("list.open")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

type NewProjectRunDialogProps = {
  token: string;
  featureOptions: FeatureOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateProjectTestRunDto) => Promise<void>;
};

type DraftResult = {
  featureId: string;
  featureName: string;
  testCaseId: string;
  testCaseName: string;
  evaluation: QaEvaluation;
  comment?: string;
};

function NewProjectRunDialog({ token, featureOptions, open, onOpenChange, onSubmit }: NewProjectRunDialogProps) {
  const t = useTranslations("app.qa.runs");
  const statusLabels = useTranslations("app.qa.runs.resultStatus");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<DraftResult[]>([]);
  const [caseCache, setCaseCache] = useState<Record<string, QaTestCase[]>>({});
  const [selectedFeature, setSelectedFeature] = useState<string>(featureOptions[0]?.id ?? "");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<QaEvaluation | "">("");
  const [comment, setComment] = useState("");
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCasesForFeature = useCallback(
    async (featureId: string) => {
      if (!featureId || caseCache[featureId]) return;
      setIsLoadingCases(true);
      try {
        const cases = await listTestCases(token, featureId, false);
        setCaseCache((prev) => ({ ...prev, [featureId]: cases }));
      } catch (err) {
        toast.error(t("errors.load"), {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setIsLoadingCases(false);
      }
    },
    [caseCache, t, token],
  );

  useEffect(() => {
    if (open && selectedFeature) {
      void loadCasesForFeature(selectedFeature);
    }
  }, [loadCasesForFeature, open, selectedFeature]);

  const availableCases = useMemo(
    () => caseCache[selectedFeature] ?? [],
    [caseCache, selectedFeature],
  );

  const handleAddEntry = useCallback(() => {
    if (!selectedFeature || !selectedCase || !selectedEvaluation) {
      setError(t("errors.validation"));
      return;
    }
    const featureName = featureOptions.find((option) => option.id === selectedFeature)?.name ?? "";
    const testCaseName = availableCases.find((testCase) => testCase.id === selectedCase)?.name ?? selectedCase;
    setEntries((prev) => {
      if (prev.some((entry) => entry.testCaseId === selectedCase)) {
        return prev;
      }
      return [
        ...prev,
        {
          featureId: selectedFeature,
          featureName,
          testCaseId: selectedCase,
          testCaseName,
          evaluation: selectedEvaluation as QaEvaluation,
          comment: comment.trim() || undefined,
        },
      ];
    });
    setSelectedCase("");
    setSelectedEvaluation("");
    setComment("");
    setError(null);
  }, [availableCases, comment, featureOptions, selectedCase, selectedEvaluation, selectedFeature, t]);

  const handleRemoveEntry = useCallback((testCaseId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.testCaseId !== testCaseId));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!entries.length) {
      setError(t("errors.validation"));
      return;
    }
    setError(null);
    await onSubmit({
      notes: notes.trim() || undefined,
      results: entries.map((entry) => ({
        testCaseId: entry.testCaseId,
        evaluation: entry.evaluation,
        comment: entry.comment,
      })),
    });
    setEntries([]);
    setNotes("");
    setSelectedCase("");
    setSelectedEvaluation("");
    setComment("");
  }, [entries, notes, onSubmit, t]);

  useEffect(() => {
    if (!open) {
      setEntries([]);
      setSelectedCase("");
      setSelectedEvaluation("");
      setComment("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="m-4 max-w-3xl rounded-2xl bg-background p-6 shadow-xl">
        <DialogHeading className="text-lg font-semibold">{t("dialogs.newRun.title")}</DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("dialogs.newRun.description")}
        </DialogDescription>

        <div className="mt-4 space-y-4">
          {!featureOptions.length && (
            <p className="text-sm text-muted-foreground">{t("noFeatures")}</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Feature
              </label>
              <select
                value={selectedFeature}
                onChange={(event) => {
                  setSelectedFeature(event.target.value);
                  setSelectedCase("");
                  void loadCasesForFeature(event.target.value);
                }}
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!featureOptions.length}
              >
                {featureOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Test case
              </label>
              <select
                value={selectedCase}
                onChange={(event) => setSelectedCase(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!availableCases.length || isLoadingCases}
              >
                <option value="">
                  {isLoadingCases ? t("labels.refreshing") : t("panel.statusPlaceholder")}
                </option>
                {availableCases.map((testCase) => (
                  <option key={testCase.id} value={testCase.id}>
                    {testCase.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("panel.fields.status")}
              </label>
              <select
                value={selectedEvaluation}
                onChange={(event) => setSelectedEvaluation(event.target.value as QaEvaluation)}
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("panel.statusPlaceholder")}</option>
                {RESULT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("panel.fields.note")}
              </label>
              <input
                type="text"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("panel.notePlaceholder")}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAddEntry} disabled={!featureOptions.length}>
              {t("actions.add")}
            </Button>
          </div>

          {entries.length > 0 && (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.testCaseId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{entry.testCaseName}</p>
                    <p className="text-xs text-muted-foreground">{entry.featureName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {statusLabels(entry.evaluation)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveEntry(entry.testCaseId)}>
                      ×
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.notes")}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.notes")}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("dialogs.cancel")}
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!entries.length}>
              {t("dialogs.newRun.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success";
}) {
  const colors =
    tone === "success"
      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
      : "border-muted bg-muted/60 text-foreground";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", colors)}>
      {label}
    </span>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 px-6 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
