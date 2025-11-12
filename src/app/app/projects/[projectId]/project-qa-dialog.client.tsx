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

        <div className="mt-4 space-y-4">
          {!hasFeatures && (
            <p className="text-sm text-muted-foreground">{t("noFeatures")}</p>
          )}

          {hasFeatures && (
            <>
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
                <Button onClick={handleAddEntry}>{t("actions.newRun")}</Button>
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
            </>
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
