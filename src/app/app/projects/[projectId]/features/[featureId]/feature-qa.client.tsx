"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useDebouncedCallback } from "use-debounce";

import {
  CreateTestCasesDto,
  CreateTestRunDto,
  QaHealth,
  QaResultStatus,
  QaTestCase,
  QaTestRun,
  UpsertResultsDto,
  createTestCases,
  createTestRun,
  getTestHealth,
  getTestRun,
  listTestCases,
  listTestRuns,
  updateTestCase,
  upsertResults,
} from "@/lib/api/qa";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogConfirm,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogTrigger,
} from "@/ui/components/dialog/dialog";

type FeatureQAProps = {
  token: string;
  featureId: string;
  runsLimit?: number;
};

type QaTabValue = "cases" | "runs" | "health";

type DraftTestCase = {
  title: string;
  stepsText: string;
  expectedResult: string;
};

type RunResultState = {
  status?: QaResultStatus;
  note?: string;
};

const RESULT_STATUSES: QaResultStatus[] = [
  "PASS",
  "FAIL",
  "BLOCKED",
  "SKIPPED",
];

const TAB_VALUES: QaTabValue[] = ["cases", "runs", "health"];

const EMPTY_TEST_CASE: DraftTestCase = {
  title: "",
  stepsText: "",
  expectedResult: "",
};

const CREATE_TEST_CASES_SCHEMA = z.object({
  cases: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        stepsText: z.string().optional(),
        expectedResult: z.string().optional(),
      }),
    )
    .min(1),
});

const UPDATE_TEST_CASE_SCHEMA = z.object({
  title: z.string().trim().min(1),
  stepsText: z.string().optional(),
  expectedResult: z.string().optional(),
  archived: z.boolean().optional(),
});

const NEW_TEST_RUN_SCHEMA = z.object({
  name: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  environment: z.string().trim().optional(),
});

export function FeatureQA({
  token,
  featureId,
  runsLimit = 10,
}: FeatureQAProps) {
  const t = useTranslations("app.qa");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = useMemo(() => {
    const current = searchParams.get("tab");
    return (TAB_VALUES.includes(current as QaTabValue)
      ? (current as QaTabValue)
      : "cases");
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<QaTabValue>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const updateTabQuery = useCallback(
    (nextTab: QaTabValue) => {
      const params = new URLSearchParams(searchParams);
      if (nextTab === "cases") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const queryString = params.toString();
      router.replace(
        queryString ? `${pathname}?${queryString}` : pathname,
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const handleTabChange = useCallback(
    (value: QaTabValue) => {
      setActiveTab(value);
      updateTabQuery(value);
    },
    [updateTabQuery],
  );

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <header className="border-b border-border px-4 pb-2 pt-4 md:px-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
        <div
          role="tablist"
          aria-label={t("tabs.ariaLabel")}
          className="mt-4 flex flex-wrap gap-2"
        >
          <TabButton
            label={t("tabs.cases")}
            isActive={activeTab === "cases"}
            onClick={() => handleTabChange("cases")}
          />
          <TabButton
            label={t("tabs.runs")}
            isActive={activeTab === "runs"}
            onClick={() => handleTabChange("runs")}
          />
          <TabButton
            label={t("tabs.health")}
            isActive={activeTab === "health"}
            onClick={() => handleTabChange("health")}
          />
        </div>
      </header>
      <div className="px-4 py-6 md:px-6">
        {activeTab === "cases" && (
          <TestCasesTab token={token} featureId={featureId} />
        )}
        {activeTab === "runs" && (
          <TestRunsTab
            token={token}
            featureId={featureId}
            runsLimit={runsLimit}
          />
        )}
        {activeTab === "health" && (
          <HealthTab token={token} featureId={featureId} />
        )}
      </div>
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
      role="tab"
      aria-selected={isActive}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-transparent bg-muted text-muted-foreground hover:border-border hover:bg-background",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TestCasesTab({
  token,
  featureId,
}: {
  token: string;
  featureId: string;
}) {
  const t = useTranslations("app.qa.cases");
  const formatter = useFormatter();

  const [testCases, setTestCases] = useState<QaTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<QaTestCase | null>(null);

  const loadCases = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      setIsFetching(true);
      try {
        const cases = await listTestCases(
          token,
          featureId,
          includeArchived,
        );
        if (!options?.signal?.aborted) {
          setTestCases(cases);
        }
      } catch (error) {
        if (!(options?.signal?.aborted ?? false)) {
          toast.error(t("errors.load"), {
            description:
              error instanceof Error ? error.message : undefined,
          });
        }
      } finally {
        if (!options?.signal?.aborted) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [featureId, includeArchived, t, token],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCases({ signal: controller.signal });
    return () => controller.abort();
  }, [loadCases]);

  const handleCreateCases = useCallback(
    async (dto: CreateTestCasesDto) => {
      try {
        const created = await createTestCases(token, featureId, dto);
        setTestCases((previous) => [...created, ...previous]);
        toast.success(t("alerts.created"));
      } catch (error) {
        toast.error(t("errors.create"), {
          description:
            error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [featureId, t, token],
  );

  const handleEditCase = useCallback(
    async (testCaseId: string, dto: Partial<QaTestCase>) => {
      const previous = [...testCases];
      setTestCases((current) =>
        current.map((item) =>
          item.id === testCaseId ? { ...item, ...dto } : item,
        ),
      );
      try {
        const updated = await updateTestCase(token, testCaseId, {
          title: dto.title,
          expectedResult: dto.expectedResult,
          steps: dto.steps,
          archived: dto.archived,
        });
        setTestCases((current) =>
          current.map((item) =>
            item.id === testCaseId ? updated : item,
          ),
        );
        toast.success(t("alerts.updated"));
      } catch (error) {
        setTestCases(previous);
        toast.error(t("errors.update"), {
          description:
            error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [t, testCases, token],
  );

  const toggleArchive = useCallback(
    async (testCase: QaTestCase, archived: boolean) => {
      const previous = [...testCases];
      setTestCases((current) =>
        current.map((item) =>
          item.id === testCase.id ? { ...item, archived } : item,
        ),
      );
      try {
        const updated = await updateTestCase(
          token,
          testCase.id,
          { archived },
        );
        setTestCases((current) =>
          current.map((item) =>
            item.id === testCase.id ? updated : item,
          ),
        );
        toast.success(
          archived ? t("alerts.archived") : t("alerts.restored"),
        );
      } catch (error) {
        setTestCases(previous);
        toast.error(t("errors.update"), {
          description:
            error instanceof Error ? error.message : undefined,
        });
      }
    },
    [t, testCases, token],
  );

  const handleEditClick = useCallback(
    (testCase: QaTestCase) => {
      setEditingCase(testCase);
      setEditDialogOpen(true);
    },
    [],
  );

  const handleCloseEdit = useCallback(() => {
    setEditDialogOpen(false);
    setEditingCase(null);
  }, []);

  const handleToggleArchived = useCallback(() => {
    setIncludeArchived((prev) => !prev);
  }, []);

  const tableContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (!testCases.length) {
      return (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.description")}
          actionLabel={t("empty.cta")}
          onAction={() => setAddDialogOpen(true)}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {t("table.title")}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t("table.updated")}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t("table.status")}
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-right">
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {testCases.map((testCase) => {
              const formattedDate = formatter.dateTime(
                new Date(testCase.updatedAt),
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <tr key={testCase.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{testCase.title}</p>
                    {testCase.expectedResult && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {testCase.expectedResult}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formattedDate}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge archived={Boolean(testCase.archived)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(testCase)}
                      >
                        {t("table.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleArchive(testCase, !testCase.archived)
                        }
                      >
                        {testCase.archived
                          ? t("table.unarchive")
                          : t("table.archive")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [
    formatter,
    handleEditClick,
    isLoading,
    t,
    testCases,
    toggleArchive,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddDialogOpen(true)}>
            {t("actions.add")}
          </Button>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={handleToggleArchived}
              className="rounded border-muted-foreground text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {t("actions.showArchived")}
          </label>
        </div>
        {isFetching && (
          <span className="text-xs text-muted-foreground">
            {t("labels.refreshing")}
          </span>
        )}
      </div>

      {tableContent}

      <AddTestCasesDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={async (draft) => {
          const payload = transformCreateDraft(draft);
          await handleCreateCases(payload);
          setAddDialogOpen(false);
          void loadCases();
        }}
      />

      <EditTestCaseDialog
        open={editDialogOpen}
        testCase={editingCase}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEdit();
          } else {
            setEditDialogOpen(true);
          }
        }}
        onSubmit={async (values) => {
          if (!editingCase) return;
          const steps =
            values.stepsText
              ?.split("\n")
              .map((line) => line.trim())
              .filter(Boolean) ?? editingCase.steps ?? [];
          await handleEditCase(editingCase.id, {
            title: values.title,
            expectedResult: values.expectedResult ?? "",
            steps,
            archived: values.archived ?? editingCase.archived,
          });
          handleCloseEdit();
          void loadCases();
        }}
      />
    </div>
  );
}

function transformCreateDraft(
  draft: DraftTestCase[],
): CreateTestCasesDto {
  return {
    cases: draft.map((item) => ({
      title: item.title.trim(),
      expectedResult: item.expectedResult.trim() || undefined,
      steps: item.stepsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    })),
  };
}

function StatusBadge({ archived }: { archived: boolean }) {
  const t = useTranslations("app.qa.cases");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
        archived
          ? "border-amber-200 bg-amber-100 text-amber-800"
          : "border-emerald-200 bg-emerald-100 text-emerald-900",
      )}
    >
      {archived ? t("status.archived") : t("status.active")}
    </span>
  );
}

function AddTestCasesDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: DraftTestCase[]) => Promise<void>;
}) {
  const t = useTranslations("app.qa.cases");
  const [draftCases, setDraftCases] = useState<DraftTestCase[]>([
    EMPTY_TEST_CASE,
  ]);
  const [errors, setErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 10);
    } else {
      setDraftCases([EMPTY_TEST_CASE]);
      setErrors(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleAddCase = useCallback(() => {
    setDraftCases((prev) => [...prev, EMPTY_TEST_CASE]);
  }, []);

  const handleRemoveCase = useCallback((index: number) => {
    setDraftCases((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  const handleChange = useCallback(
    (
      index: number,
      field: keyof DraftTestCase,
      value: string,
    ) => {
      setDraftCases((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setErrors(null);
    const parsed = CREATE_TEST_CASES_SCHEMA.safeParse({
      cases: draftCases.map((item) => ({
        title: item.title,
        stepsText: item.stepsText,
        expectedResult: item.expectedResult,
      })),
    });

    if (!parsed.success) {
      setErrors(t("errors.validation"));
      return;
    }

    const payload = draftCases.map((item) => ({
      ...item,
      title: item.title.trim(),
    }));

    if (!payload.some((item) => item.title.length > 0)) {
      setErrors(t("errors.validation"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  }, [draftCases, onSubmit, t]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="m-4 max-w-2xl rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-xl font-semibold">
          {t("dialogs.add.title")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("dialogs.add.description")}
        </DialogDescription>

        <form
          className="mt-4 space-y-6"
          onKeyDown={handleKeyDown}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {draftCases.map((testCase, index) => (
            <div
              key={`draft-${index}`}
              className="rounded-xl border border-dashed border-border bg-muted/40 p-4 transition hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {t("dialogs.add.caseLabel", { index: index + 1 })}
                </h3>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleRemoveCase(index)}
                  disabled={draftCases.length === 1}
                >
                  {t("dialogs.add.removeCase")}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("fields.title")}
                  </label>
                  <input
                    ref={index === 0 ? firstInputRef : undefined}
                    type="text"
                    value={testCase.title}
                    onChange={(event) =>
                      handleChange(index, "title", event.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t("placeholders.title")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("fields.steps")}
                  </label>
                  <textarea
                    rows={3}
                    value={testCase.stepsText}
                    onChange={(event) =>
                      handleChange(index, "stepsText", event.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t("placeholders.steps")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("hints.steps")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("fields.expectedResult")}
                  </label>
                  <textarea
                    rows={2}
                    value={testCase.expectedResult}
                    onChange={(event) =>
                      handleChange(index, "expectedResult", event.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t("placeholders.expectedResult")}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCase}
            >
              {t("dialogs.add.addCase")}
            </Button>
            <div className="flex gap-2">
                <DialogClose>
                  {t("dialogs.cancel")}
                </DialogClose>
                <DialogConfirm
                  onConfirm={async () => {
                    try {
                      await handleSubmit();
                      return true;
                    } catch {
                      return false;
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("dialogs.add.saving") : t("dialogs.add.save")}
                </DialogConfirm>
              </div>
          </div>
          {errors && (
            <p className="text-sm text-red-600">{errors}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTestCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  testCase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    title: string;
    stepsText?: string;
    expectedResult?: string;
    archived?: boolean;
  }) => Promise<void>;
  testCase: QaTestCase | null;
}) {
  const t = useTranslations("app.qa.cases");
  const [formValues, setFormValues] = useState<{
    title: string;
    stepsText?: string;
    expectedResult?: string;
    archived: boolean;
  }>({
    title: "",
    stepsText: "",
    expectedResult: "",
    archived: false,
  });
  const [errors, setErrors] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && testCase) {
      setFormValues({
        title: testCase.title ?? "",
        stepsText: (testCase.steps ?? []).join("\n"),
        expectedResult: testCase.expectedResult ?? "",
        archived: Boolean(testCase.archived),
      });
      setErrors(null);
      setTimeout(() => firstFieldRef.current?.focus(), 10);
    }
  }, [open, testCase]);

  const handleChange = useCallback(
    (field: "title" | "stepsText" | "expectedResult" | "archived", value: string | boolean) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!testCase) return;
    const parsed = UPDATE_TEST_CASE_SCHEMA.safeParse({
      title: formValues.title,
      stepsText: formValues.stepsText,
      expectedResult: formValues.expectedResult,
      archived: formValues.archived,
    });
    if (!parsed.success) {
      setErrors(t("errors.validation"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: formValues.title,
        stepsText: formValues.stepsText,
        expectedResult: formValues.expectedResult,
        archived: formValues.archived,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, onSubmit, t, testCase]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="m-4 max-w-xl rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-xl font-semibold">
          {t("dialogs.edit.title")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("dialogs.edit.description")}
        </DialogDescription>
        <form
          className="mt-4 space-y-4"
          onKeyDown={handleKeyDown}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.title")}
            </label>
            <input
              ref={firstFieldRef}
              type="text"
              value={formValues.title}
              onChange={(event) =>
                handleChange("title", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.steps")}
            </label>
            <textarea
              rows={3}
              value={formValues.stepsText}
              onChange={(event) =>
                handleChange("stepsText", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.expectedResult")}
            </label>
            <textarea
              rows={2}
              value={formValues.expectedResult}
              onChange={(event) =>
                handleChange("expectedResult", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={formValues.archived}
              onChange={(event) =>
                handleChange("archived", event.target.checked)
              }
              className="rounded border-muted-foreground text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {t("dialogs.edit.archiveToggle")}
          </label>

          {errors && (
            <p className="text-sm text-red-600">{errors}</p>
          )}

          <DialogActions
            closeLabel={t("dialogs.cancel")}
            confirmLabel={
              isSubmitting
                ? t("dialogs.edit.saving")
                : t("dialogs.edit.save")
            }
            onConfirm={() => {
              if (!isSubmitting) {
                void handleSubmit();
              }
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestRunsTab({
  token,
  featureId,
  runsLimit,
}: {
  token: string;
  featureId: string;
  runsLimit: number;
}) {
  const t = useTranslations("app.qa.runs");
  const formatter = useFormatter();

  const [runs, setRuns] = useState<QaTestRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    null,
  );
  const [selectedRun, setSelectedRun] = useState<QaTestRun | null>(
    null,
  );
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listTestRuns(token, featureId, runsLimit);
      setRuns(data);
    } catch (error) {
      toast.error(t("errors.load"), {
        description:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [featureId, runsLimit, t, token]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const handleCreateRun = useCallback(
    async (dto: CreateTestRunDto) => {
      try {
        const created = await createTestRun(token, featureId, dto);
        setRuns((prev) => [created, ...prev]);
        setSelectedRunId(created.id);
        setSelectedRun(created);
        toast.success(t("alerts.created"));
      } catch (error) {
        toast.error(t("errors.create"), {
          description:
            error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [featureId, t, token],
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
          description:
            error instanceof Error ? error.message : undefined,
        });
      } finally {
        setIsRunLoading(false);
      }
    },
    [t, token],
  );

  const handleRunUpdated = useCallback(
    (run: QaTestRun) => {
      setRuns((prev) =>
        prev.map((item) => (item.id === run.id ? { ...item, summary: run.summary } : item)),
      );
      setSelectedRun(run);
    },
    [],
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
          const summary = run.summary;
          const total = summary?.total ?? summaryTotalFromRun(run);
          const passed = summary?.passed ?? summaryCountFromRun(run, "PASS");
          const createdAt = formatter.dateTime(new Date(run.createdAt), {
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
                    {run.name || t("list.runFallback", { id: run.id })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {createdAt}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SummaryBadge
                    label={t("summary.total", { count: total })}
                  />
                  <SummaryBadge
                    label={t("summary.passed", { count: passed })}
                    tone="success"
                  />
                  <Button
                    size="sm"
                    variant={
                      selectedRunId === run.id ? "default" : "outline"
                    }
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          {t("actions.newRun")}
        </Button>
      </div>

      {runListContent}

      <NewTestRunDialog
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
      </div>
    </div>
  );
}

function summaryCountFromRun(
  run: QaTestRun,
  status: QaResultStatus,
): number {
  return run.results.filter(
    (result) => result.status === status,
  ).length;
}

function summaryTotalFromRun(run: QaTestRun): number {
  if (run.summary?.total) return run.summary.total;
  if (run.testCases) return run.testCases.length;
  const uniqueCases = new Set(run.results.map((item) => item.testCaseId));
  return uniqueCases.size;
}

function SummaryBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        tone === "success"
          ? "border-emerald-200 bg-emerald-100 text-emerald-900"
          : "border-border bg-muted",
      )}
    >
      {label}
    </span>
  );
}

function NewTestRunDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateTestRunDto) => Promise<void>;
}) {
  const t = useTranslations("app.qa.runs");
  const [formValues, setFormValues] = useState<CreateTestRunDto>({
    name: "",
    notes: "",
    environment: "",
  });
  const [errors, setErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setErrors(null);
      setTimeout(() => firstInputRef.current?.focus(), 10);
    } else {
      setFormValues({
        name: "",
        notes: "",
        environment: "",
      });
      setIsSubmitting(false);
    }
  }, [open]);

  const handleChange = useCallback(
    (field: keyof CreateTestRunDto, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const parsed = NEW_TEST_RUN_SCHEMA.safeParse({
      name: formValues.name,
      notes: formValues.notes,
      environment: formValues.environment,
    });
    if (!parsed.success) {
      setErrors(t("errors.validation"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, onSubmit, t]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="m-4 max-w-xl rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-xl font-semibold">
          {t("dialogs.newRun.title")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("dialogs.newRun.description")}
        </DialogDescription>
        <form
          className="mt-4 space-y-4"
          onKeyDown={handleKeyDown}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.name")}
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={formValues.name ?? ""}
              onChange={(event) =>
                handleChange("name", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.name")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.environment")}
            </label>
            <input
              type="text"
              value={formValues.environment ?? ""}
              onChange={(event) =>
                handleChange("environment", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.environment")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.notes")}
            </label>
            <textarea
              rows={3}
              value={formValues.notes ?? ""}
              onChange={(event) =>
                handleChange("notes", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.notes")}
            />
          </div>

          {errors && (
            <p className="text-sm text-red-600">{errors}</p>
          )}

          <DialogActions
            closeLabel={t("dialogs.cancel")}
            confirmLabel={
              isSubmitting
                ? t("dialogs.newRun.creating")
                : t("dialogs.newRun.create")
            }
            onConfirm={() => {
              if (!isSubmitting) {
                void handleSubmit();
              }
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestRunPanel({
  token,
  run,
  onRunUpdated,
}: {
  token: string;
  run: QaTestRun;
  onRunUpdated: (run: QaTestRun) => void;
}) {
  const t = useTranslations("app.qa.runs");
  const formatter = useFormatter();
  const [runState, setRunState] = useState<QaTestRun>(run);
  const [resultState, setResultState] = useState<
    Record<string, RunResultState>
  >(resultsToState(run));
  const stableResultsRef = useRef<Record<string, RunResultState>>(
    resultsToState(run),
  );
  const pendingRef = useRef<Record<string, RunResultState>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setRunState(run);
    const state = resultsToState(run);
    setResultState(state);
    stableResultsRef.current = state;
  }, [run]);

  const persistUpdates = useCallback(async () => {
    const pendingEntries = Object.entries(pendingRef.current);
    const payloadResults = pendingEntries
      .filter(([, value]) => Boolean(value.status))
      .map(([testCaseId, value]) => ({
        testCaseId,
        status: value.status as QaResultStatus,
        note: value.note?.trim() || undefined,
      }));

    if (!payloadResults.length) {
      pendingRef.current = {};
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    const dto: UpsertResultsDto = { results: payloadResults };

    try {
      const updatedRun = await upsertResults(token, run.id, dto);
      const nextState = resultsToState(updatedRun);
      setResultState(nextState);
      stableResultsRef.current = nextState;
      pendingRef.current = {};
      setRunState(updatedRun);
      onRunUpdated(updatedRun);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (error) {
      setResultState(stableResultsRef.current);
      pendingRef.current = {};
      setSaveStatus("error");
      toast.error(t("errors.updateResults"), {
        description:
          error instanceof Error ? error.message : undefined,
      });
    }
  }, [onRunUpdated, run.id, t, token]);

  const debouncedPersist = useDebouncedCallback(() => {
    void persistUpdates();
  }, 800);

  const handleResultChange = useCallback(
    (testCaseId: string, changes: RunResultState) => {
      setResultState((prev) => {
        const next = { ...prev };
        const current = next[testCaseId] ?? {};
        const merged = { ...current, ...changes };
        if (!merged.status && !merged.note) {
          delete next[testCaseId];
          delete pendingRef.current[testCaseId];
        } else {
          next[testCaseId] = merged;
          pendingRef.current = {
            ...pendingRef.current,
            [testCaseId]: merged,
          };
        }
        return next;
      });
      setSaveStatus("idle");
      debouncedPersist();
    },
    [debouncedPersist],
  );

  const summary = useMemo(() => {
    const total =
      runState.testCases?.length ??
      runState.summary?.total ??
      Object.keys(resultState).length;
    const counts = RESULT_STATUSES.reduce<Record<QaResultStatus, number>>(
      (acc, status) => {
        acc[status] = Object.values(resultState).filter(
          (value) => value.status === status,
        ).length;
        return acc;
      },
      {
        PASS: 0,
        FAIL: 0,
        BLOCKED: 0,
        SKIPPED: 0,
      },
    );
    const passRate = total > 0 ? Math.round((counts.PASS / total) * 100) : 0;
    return {
      total,
      counts,
      passRate,
    };
  }, [resultState, runState.testCases, runState.summary]);

  const runMeta = useMemo(() => {
    return {
      name: runState.name || t("panel.untitled"),
      createdAt: formatter.dateTime(new Date(runState.createdAt), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    };
  }, [formatter, runState.createdAt, runState.name, t]);

  const statusLabels = useTranslations("app.qa.runs.resultStatus");

  return (
    <div className="mt-8 rounded-2xl border bg-muted/40 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{runMeta.name}</h3>
          <p className="text-xs text-muted-foreground">
            {t("panel.createdAt", { date: runMeta.createdAt })}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <SummaryBadge
            label={t("panel.summary.total", {
              count: summary.total,
            })}
          />
          <SummaryBadge
            label={t("panel.summary.passed", {
              count: summary.counts.PASS,
            })}
            tone="success"
          />
          <SummaryBadge
            label={t("panel.summary.passRate", {
              rate: summary.passRate,
            })}
          />
          <SavingIndicator status={saveStatus} />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {(runState.testCases ?? []).map((testCase) => {
          const state = resultState[testCase.id] ?? {};
          return (
            <div
              key={testCase.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-sm font-semibold">
                    {testCase.title}
                  </h4>
                  {testCase.expectedResult && (
                    <p className="text-xs text-muted-foreground">
                      {testCase.expectedResult}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("panel.fields.status")}
                  </label>
                  <select
                    value={state.status ?? ""}
                    onChange={(event) =>
                      handleResultChange(testCase.id, {
                        status: event.target.value
                          ? (event.target.value as QaResultStatus)
                          : undefined,
                      })
                    }
                    className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">
                      {t("panel.statusPlaceholder")}
                    </option>
                    {RESULT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("panel.fields.note")}
                </label>
                <textarea
                  value={state.note ?? ""}
                  onChange={(event) =>
                    handleResultChange(testCase.id, {
                      note: event.target.value,
                    })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("panel.notePlaceholder")}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function resultsToState(run: QaTestRun): Record<string, RunResultState> {
  return run.results.reduce<Record<string, RunResultState>>(
    (acc, item) => {
      acc[item.testCaseId] = {
        status: item.status,
        note: item.note,
      };
      return acc;
    },
    {},
  );
}

function SavingIndicator({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  const t = useTranslations("app.qa.runs");
  if (status === "idle") return null;
  const text =
    status === "saving"
      ? t("panel.saving")
      : status === "saved"
      ? t("panel.saved")
      : t("panel.saveError");
  return (
    <span
      className={cn(
        "text-xs font-medium",
        status === "saving" && "text-amber-600",
        status === "saved" && "text-emerald-600",
        status === "error" && "text-red-600",
      )}
    >
      {text}
    </span>
  );
}

function HealthTab({
  token,
  featureId,
}: {
  token: string;
  featureId: string;
}) {
  const t = useTranslations("app.qa.health");
  const formatter = useFormatter();
  const [health, setHealth] = useState<QaHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getTestHealth(token, featureId)
      .then((payload) => {
        if (isMounted) {
          setHealth(payload);
        }
      })
      .catch((error) => {
        if (isMounted) {
          toast.error(t("errors.load"), {
            description:
              error instanceof Error ? error.message : undefined,
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [featureId, t, token]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!health) {
    return (
      <EmptyState
        title={t("empty.title")}
        description={t("empty.description")}
      />
    );
  }

  const normalizedPassRate =
    health.passRate !== undefined
      ? normalizePassRate(health.passRate)
      : null;
  const lastRun = health.lastRunAt
    ? formatter.dateTime(new Date(health.lastRunAt), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("metrics.passRate")}
          value={
            normalizedPassRate !== null
              ? `${normalizedPassRate}%`
              : t("metrics.notAvailable")
          }
        />
        <MetricCard
          label={t("metrics.lastRun")}
          value={lastRun ?? t("metrics.notAvailable")}
        />
        <MetricCard
          label={t("metrics.flaky")}
          value={
            health.flakyCount !== undefined
              ? t("metrics.flakyValue", { count: health.flakyCount })
              : t("metrics.notAvailable")
          }
        />
      </div>

      {health.trend && health.trend.length > 0 && (
        <div className="rounded-2xl border bg-muted/40 p-6">
          <h3 className="text-sm font-semibold">
            {t("trend.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("trend.subtitle")}
          </p>
          <TrendChart data={health.trend} />
        </div>
      )}
    </div>
  );
}

function normalizePassRate(value: number): number {
  if (value <= 1) {
    return Math.round(value * 100);
  }
  return Math.round(value);
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function TrendChart({
  data,
}: {
  data: NonNullable<QaHealth["trend"]>;
}) {
  const passRates = data.map((point) => normalizePassRate(point.passRate));
  const maxRate = Math.max(...passRates, 100);
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-6">
      {data.map((point, index) => {
        const rate = passRates[index];
        const height = Math.max(8, Math.round((rate / maxRate) * 100));
        return (
          <div key={point.runId} className="flex flex-col items-center gap-2 text-xs">
            <div className="flex h-32 w-full items-end justify-center rounded-lg bg-muted">
              <div
                style={{ height: `${height}%` }}
                className={cn(
                  "w-full max-w-[28px] rounded-lg bg-primary transition-all",
                )}
                aria-label={`${rate}%`}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              {new Date(point.date).toLocaleDateString()}
            </div>
            <div className="text-[10px] font-semibold">{rate}%</div>
          </div>
        );
      })}
    </div>
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
      <p className="max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className,
      )}
    />
  );
}
