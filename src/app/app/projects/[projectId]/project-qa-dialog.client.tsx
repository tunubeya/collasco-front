"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { FeatureOption } from "./project-qa.types";
import { RESULT_STATUSES } from "@/app/app/projects/[projectId]/features/[featureId]/feature-qa.client";
import { listTestCases } from "@/lib/api/qa";
import type { CreateProjectTestRunDto, QaEvaluation, QaTestCase } from "@/lib/api/qa";
import { Button } from "@/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeading, DialogTrigger } from "@/ui/components/dialog/dialog";

type DraftResult = {
  featureId: string;
  featureName: string;
  testCaseId: string;
  testCaseName: string;
  evaluation: QaEvaluation;
  comment?: string;
};

type NewProjectRunDialogProps = {
  token: string;
  featureOptions: FeatureOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateProjectTestRunDto) => Promise<void>;
};

export function NewProjectRunDialog({
  token,
  featureOptions,
  open,
  onOpenChange,
  onSubmit,
}: NewProjectRunDialogProps) {
  const t = useTranslations("app.qa.runs");
  const statusLabels = useTranslations("app.qa.runs.resultStatus");

  const [runName, setRunName] = useState("");
  const [environment, setEnvironment] = useState("");
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

  useEffect(() => {
    if (!open) {
      setEntries([]);
      setSelectedCase("");
      setSelectedEvaluation("");
      setComment("");
      setRunName("");
      setEnvironment("");
      setNotes("");
      setError(null);
    }
  }, [open]);

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
    if (!runName.trim() || !environment.trim() || !entries.length) {
      setError(t("errors.validation"));
      return;
    }
    setError(null);
    await onSubmit({
      name: runName.trim(),
      environment: environment.trim(),
      notes: notes.trim() || undefined,
      results: entries.map((entry) => ({
        testCaseId: entry.testCaseId,
        evaluation: entry.evaluation,
        comment: entry.comment,
      })),
    });
    setRunName("");
    setEnvironment("");
    setEntries([]);
    setNotes("");
    setSelectedCase("");
    setSelectedEvaluation("");
    setComment("");
  }, [environment, entries, notes, onSubmit, runName, t]);

  const hasFeatures = featureOptions.length > 0;

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

        <div className="mt-4 space-y-5">
          <section className="rounded-2xl border bg-muted/20 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("fields.name")}
                </label>
                <input
                  type="text"
                  value={runName}
                  onChange={(event) => setRunName(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("placeholders.name")}
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("hints.name", { default: "Short label for the execution." })}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("fields.environment")}
                </label>
                <input
                  type="text"
                  value={environment}
                  onChange={(event) => setEnvironment(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("placeholders.environment")}
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("hints.environment", { default: "e.g. Staging, Production." })}
                </p>
              </div>
            </div>
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
          </section>

          {!hasFeatures && (
            <p className="text-sm text-muted-foreground">{t("noFeatures")}</p>
          )}

          {hasFeatures && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-background p-4 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1 space-y-1.5">
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
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {featureOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Test case
                    </label>
                    <select
                      value={selectedCase}
                      onChange={(event) => setSelectedCase(event.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={!availableCases.length || isLoadingCases}
                    >
                      <option value="">
                        {isLoadingCases ? t("labels.refreshing") : t("panel.testCasePlaceholder")}
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
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t("panel.notePlaceholder")}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    onClick={handleAddEntry}
                    disabled={!selectedCase || !selectedEvaluation}
                    variant="secondary"
                  >
                    {t("panel.coverage.addResult")}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/10 p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{t("panel.entries", { default: "Selected cases" })}</span>
                  <span className="text-xs text-muted-foreground">{entries.length}</span>
                </div>
                {entries.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t("panel.empty.description")}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {entries.map((entry) => (
                      <li
                        key={entry.testCaseId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold">{entry.testCaseName}</p>
                          <p className="text-xs text-muted-foreground">{entry.featureName}</p>
                          {entry.comment && (
                            <p className="text-xs text-muted-foreground">{entry.comment}</p>
                          )}
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
              </div>
            </div>
          )}

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
