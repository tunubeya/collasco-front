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
  QaFeatureRunListItem,
  QaHealth,
  QaEvaluation,
  QaRunCoverage,
  QaTestCase,
  QaTestRunDetail,
  UpsertResultsDto,
  createTestCases,
  createTestRun,
  getTestHealth,
  getTestRun,
  listTestCases,
  listTestRuns,
  updateTestCase,
  updateTestRun,
  upsertResults,
} from "@/lib/api/qa";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogTrigger,
} from "@/ui/components/dialog/dialog";
import { actionButtonClass } from "@/ui/styles/action-button";
import { Plus } from "lucide-react";

type FeatureQAProps = {
  token: string;
  featureId: string;
  runsLimit?: number;
  currentUserId?: string;
  canManageQa?: boolean;
};

type QaTabValue = "cases" | "runs" | "health";

type DraftTestCase = {
  name: string;
  stepsText: string;
  expected: string;
};

type RunResultState = {
  evaluation?: QaEvaluation;
  comment?: string;
};

type RunCaseRow = {
  testCaseId: string;
  name: string;
  expected?: string | null;
  featureName?: string | null;
};

export const RESULT_STATUSES: QaEvaluation[] = [
  "NOT_WORKING",
  "MINOR_ISSUE",
  "PASSED",
];

const TAB_VALUES: QaTabValue[] = ["cases", "runs", "health"];

const EMPTY_TEST_CASE: DraftTestCase = {
  name: "",
  stepsText: "",
  expected: "",
};

const CREATE_TEST_CASES_SCHEMA = z.object({
  cases: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        stepsText: z.string().optional(),
        expected: z.string().optional(),
      }),
    )
    .min(1),
});

const UPDATE_TEST_CASE_SCHEMA = z.object({
  name: z.string().trim().min(1),
  stepsText: z.string().optional(),
  expected: z.string().optional(),
  isArchived: z.boolean().optional(),
});

const NEW_TEST_RUN_SCHEMA = z.object({
  name: z.string().trim().min(1),
  environment: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

export function FeatureQA({
  token,
  featureId,
  runsLimit = 10,
  currentUserId,
  canManageQa = false,
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
          <TestCasesTab
            token={token}
            featureId={featureId}
            canManageQa={canManageQa}
          />
        )}
        {activeTab === "runs" && (
          <TestRunsTab
            token={token}
            featureId={featureId}
            runsLimit={runsLimit}
            currentUserId={currentUserId}
            canManageQa={canManageQa}
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
  canManageQa = false,
}: {
  token: string;
  featureId: string;
  canManageQa?: boolean;
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
    async (
      testCaseId: string,
      dto: {
        name?: string;
        steps?: string;
        expected?: string;
        isArchived?: boolean;
      },
    ) => {
      const previous = [...testCases];
      setTestCases((current) =>
        current.map((item) =>
          item.id === testCaseId ? { ...item, ...dto } : item,
        ),
      );
      try {
        const updated = await updateTestCase(token, testCaseId, dto);
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
    async (testCase: QaTestCase, isArchived: boolean) => {
      const previous = [...testCases];
      setTestCases((current) =>
        current.map((item) =>
          item.id === testCase.id ? { ...item, isArchived } : item,
        ),
      );
      try {
        const updated = await updateTestCase(token, testCase.id, {
          isArchived,
        });
        setTestCases((current) =>
          current.map((item) =>
            item.id === testCase.id ? updated : item,
          ),
        );
        toast.success(
          isArchived ? t("alerts.archived") : t("alerts.restored"),
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
          actionLabel={canManageQa ? t("empty.cta") : undefined}
          onAction={canManageQa ? () => setAddDialogOpen(true) : undefined}
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
                    <p className="font-medium">{testCase.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formattedDate}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge archived={Boolean(testCase.isArchived)} />
                  </td>
                  <td className="px-4 py-3">
                    {canManageQa ? (
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
                            toggleArchive(testCase, !testCase.isArchived)
                          }
                        >
                          {testCase.isArchived
                            ? t("table.unarchive")
                            : t("table.archive")}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
    canManageQa,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {canManageQa && (
            <button
              type="button"
              className={actionButtonClass()}
              onClick={() => setAddDialogOpen(true)}
            >
              {t("actions.add")}
            </button>
          )}
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

      {canManageQa && (
        <>
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
              const stepsArray =
                values.stepsText
                  ?.split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean) ?? (Array.isArray(editingCase.steps) ? editingCase.steps : (editingCase.steps ? [editingCase.steps] : []));
              const steps = stepsArray.length ? stepsArray.join("\n") : undefined;
              await handleEditCase(editingCase.id, {
                name: values.name,
                expected: values.expected ?? "",
                steps,
                isArchived: values.isArchived ?? editingCase.isArchived,
              });
              handleCloseEdit();
              void loadCases();
            }}
          />
        </>
      )}
    </div>
  );
}

function transformCreateDraft(
  draft: DraftTestCase[],
): CreateTestCasesDto {
  return {
    cases: draft.map((item) => ({
      name: item.name.trim(),
      expected: item.expected.trim() || undefined,
      steps:
        item.stepsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n") || undefined,
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
  const [formValues, setFormValues] = useState<DraftTestCase>(EMPTY_TEST_CASE);
  const [errors, setErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setErrors(null);
      setTimeout(() => firstInputRef.current?.focus(), 10);
    } else {
      setFormValues(EMPTY_TEST_CASE);
      setErrors(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleChange = useCallback(
    (field: keyof DraftTestCase, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setErrors(null);
    const parsed = CREATE_TEST_CASES_SCHEMA.safeParse({
      cases: [
        {
          name: formValues.name,
          stepsText: formValues.stepsText,
          expected: formValues.expected,
        },
      ],
    });

    if (!parsed.success || !formValues.name.trim()) {
      setErrors(t("errors.validation"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit([{ ...formValues }]);
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
      <DialogContent className="m-4 max-w-2xl rounded-2xl bg-background p-6 shadow-lg">
        <DialogHeading className="text-xl font-semibold">
          {t("dialogs.add.title")}
        </DialogHeading>
        <DialogDescription className="text-sm text-muted-foreground">
          {t("dialogs.add.description")}
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
              ref={firstInputRef}
              type="text"
              value={formValues.name}
              onChange={(event) => handleChange("name", event.target.value)}
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
              value={formValues.stepsText}
              onChange={(event) => handleChange("stepsText", event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.steps")}
            />
            <p className="text-xs text-muted-foreground">{t("hints.steps")}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("fields.expectedResult")}
            </label>
            <textarea
              rows={2}
              value={formValues.expected}
              onChange={(event) => handleChange("expected", event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("placeholders.expectedResult")}
            />
          </div>

          {errors && <p className="text-sm text-red-600">{errors}</p>}

          <DialogActions
            closeLabel={t("dialogs.cancel")}
            confirmLabel={
              isSubmitting ? t("dialogs.add.saving") : t("dialogs.add.save")
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

function EditTestCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  testCase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    stepsText?: string;
    expected?: string;
    isArchived?: boolean;
  }) => Promise<void>;
  testCase: QaTestCase | null;
}) {
  const t = useTranslations("app.qa.cases");
  const [formValues, setFormValues] = useState<{
    name: string;
    stepsText?: string;
    expected?: string;
    isArchived: boolean;
  }>({
    name: "",
    stepsText: "",
    expected: "",
    isArchived: false,
  });
  const [errors, setErrors] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && testCase) {
      setFormValues({
        name: testCase.name ?? "",
        stepsText: testCase.steps ?? "",
        expected: testCase.expected ?? "",
        isArchived: Boolean(testCase.isArchived),
      });
      setErrors(null);
      setTimeout(() => firstFieldRef.current?.focus(), 10);
    }
  }, [open, testCase]);

  const handleChange = useCallback(
    (field: "name" | "stepsText" | "expected" | "isArchived", value: string | boolean) => {
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
      name: formValues.name,
      stepsText: formValues.stepsText,
      expected: formValues.expected,
      isArchived: formValues.isArchived,
    });
    if (!parsed.success) {
      setErrors(t("errors.validation"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formValues.name,
        stepsText: formValues.stepsText,
        expected: formValues.expected,
        isArchived: formValues.isArchived,
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
              value={formValues.name}
              onChange={(event) =>
                handleChange("name", event.target.value)
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
              value={formValues.expected}
              onChange={(event) =>
                handleChange("expected", event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={formValues.isArchived}
              onChange={(event) =>
                handleChange("isArchived", event.target.checked)
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
  currentUserId,
  canManageQa = false,
}: {
  token: string;
  featureId: string;
  runsLimit: number;
  currentUserId?: string;
  canManageQa?: boolean;
}) {
  const t = useTranslations("app.qa.runs");
  const formatter = useFormatter();

  const [runs, setRuns] = useState<QaFeatureRunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<QaTestRunDetail | null>(null);
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const summarizeResults = useCallback((results: QaTestRunDetail["results"]) => {
    return RESULT_STATUSES.reduce<Record<QaEvaluation, number>>(
      (acc, evaluation) => {
        acc[evaluation] = results.filter((result) => result.evaluation === evaluation).length;
        return acc;
      },
      {
        NOT_WORKING: 0,
        MINOR_ISSUE: 0,
        PASSED: 0,
      },
    );
  }, []);

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listTestRuns(token, featureId, runsLimit);
      setRuns(data);
    } catch (error) {
      toast.error(t("errors.load"), {
        description: error instanceof Error ? error.message : undefined,
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
        const cases = await listTestCases(token, featureId);
        const targetTestCaseIds = Array.from(
          new Set(
            cases
              .filter((testCase) => !testCase.isArchived)
              .map((testCase) => testCase.id),
          ),
        );
        const payload: CreateTestRunDto = {
          ...dto,
          runById: currentUserId ?? dto.runById,
          status: "OPEN",
          targetTestCaseIds,
        };
        const created = await createTestRun(token, featureId, payload);
        const summary = summarizeResults(created.results);
        setRuns((prev) => [
          {
            id: created.id,
            runDate: created.runDate,
            name: created.name ?? null,
            environment: created.environment ?? null,
            by: created.runBy?.name ?? null,
            status: created.status,
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
    [currentUserId, featureId, summarizeResults, t, token],
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
      const summary = summarizeResults(run.results);
      setRuns((prev) =>
        prev.map((item) =>
          item.id === run.id
            ? {
                ...item,
                summary,
                by: run.runBy?.name ?? item.by,
                name: run.name ?? item.name,
                environment: run.environment ?? item.environment,
                status: run.status,
              }
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
          actionLabel={canManageQa ? t("empty.cta") : undefined}
          onAction={canManageQa ? () => setDialogOpen(true) : undefined}
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
          const title = run.name?.trim() || t("list.runFallback", { id: run.id });
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
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="text-xs text-muted-foreground">{runDate}</p>
                  {run.environment && (
                    <p className="text-xs text-muted-foreground">
                      {run.environment}
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
                  <SummaryBadge label={t("summary.passed", { count: passed })} tone="success" />
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
  }, [formatter, isLoading, openRun, runs, selectedRunId, t, canManageQa]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManageQa && (
          <button
            type="button"
            className={actionButtonClass()}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("actions.newRun")}
          </button>
        )}
      </div>

        {runListContent}

        {canManageQa && (
          <NewTestRunDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSubmit={async (values) => {
              await handleCreateRun(values);
              setDialogOpen(false);
              void loadRuns();
            }}
          />
        )}

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

      </div>
    </div>
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
    environment: "",
    notes: "",
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
        environment: "",
        notes: "",
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
      environment: formValues.environment,
      notes: formValues.notes,
    });
    if (!parsed.success) {
      setErrors(t("errors.validation"));
      return false;
    }
    setErrors(null);
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setErrors(error.message);
      } else {
        setErrors(t("errors.create"));
      }
      return false;
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
              value={formValues.name}
              onChange={(event) => handleChange("name", event.target.value)}
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
              value={formValues.environment}
              onChange={(event) => handleChange("environment", event.target.value)}
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
              onChange={(event) => handleChange("notes", event.target.value)}
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
                return handleSubmit();
              }
              return false;
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}


export function TestRunPanel({
  token,
  run,
  onRunUpdated,
}: {
  token: string;
  run: QaTestRunDetail;
  onRunUpdated: (run: QaTestRunDetail) => void;
}) {
  const t = useTranslations("app.qa.runs");
  const formatter = useFormatter();
  const statusLabels = useTranslations("app.qa.runs.resultStatus");
  const [runState, setRunState] = useState<QaTestRunDetail>(run);
  const [caseRows, setCaseRows] = useState<RunCaseRow[]>(() => buildCaseRows(run));
  const [resultState, setResultState] = useState<Record<string, RunResultState>>(resultsToState(run));
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isClosingRun, setIsClosingRun] = useState(false);
  const runStateRef = useRef<QaTestRunDetail>(run);
  const stableResultsRef = useRef<Record<string, RunResultState>>(resultsToState(run));
  const resultStateRef = useRef<Record<string, RunResultState>>(resultsToState(run));
  const pendingRef = useRef<Record<string, RunResultState>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    runStateRef.current = run;
    setRunState(run);
    const state = resultsToState(run);
    setResultState(state);
    stableResultsRef.current = state;
    resultStateRef.current = state;
    pendingRef.current = {};
    setCaseRows(buildCaseRows(run));
    setCommentDrafts({});
  }, [run]);

  useEffect(() => {
    resultStateRef.current = resultState;
  }, [resultState]);

  const persistUpdates = useCallback(async () => {
    const pendingEntries = Object.entries(pendingRef.current);
    const payloadResults = pendingEntries
      .filter(([, value]) => Boolean(value.evaluation))
      .map(([testCaseId, value]) => ({
        testCaseId,
        evaluation: value.evaluation as QaEvaluation,
        comment: value.comment?.trim() || undefined,
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
      resultStateRef.current = nextState;
      pendingRef.current = {};
      setRunState(updatedRun);
      runStateRef.current = updatedRun;
      setCaseRows(buildCaseRows(updatedRun));
      onRunUpdated(updatedRun);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (error) {
      setResultState(stableResultsRef.current);
      resultStateRef.current = stableResultsRef.current;
      pendingRef.current = {};
      setSaveStatus("error");
      toast.error(t("errors.updateResults"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [onRunUpdated, run.id, t, token]);

  const debouncedPersist = useDebouncedCallback(() => {
    void persistUpdates();
  }, 800);

  const handleResultChange = useCallback(
    (testCaseId: string, changes: RunResultState) => {
      if (runState.status === "CLOSED") {
        return;
      }
      setResultState((prev) => {
        const next = { ...prev };
        const current = next[testCaseId] ?? {};
        const merged = { ...current, ...changes };
        if (!merged.evaluation && !merged.comment) {
          delete next[testCaseId];
          delete pendingRef.current[testCaseId];
        } else {
          next[testCaseId] = merged;
          pendingRef.current = {
            ...pendingRef.current,
            [testCaseId]: merged,
          };
        }
        resultStateRef.current = next;
        return next;
      });
      setSaveStatus("idle");
      debouncedPersist();
    },
    [debouncedPersist, runState.status],
  );

  const handleDraftChange = useCallback((testCaseId: string, value: string) => {
    if (runState.status === "CLOSED") {
      return;
    }
    setCommentDrafts((prev) => {
      const baseValue = resultStateRef.current[testCaseId]?.comment ?? "";
      if (value === baseValue) {
        if (!(testCaseId in prev)) {
          return prev;
        }
        const nextDrafts = { ...prev };
        delete nextDrafts[testCaseId];
        return nextDrafts;
      }
      return {
        ...prev,
        [testCaseId]: value,
      };
    });
  }, [runState.status]);

  const commitComment = useCallback(
    (testCaseId: string) => {
      setCommentDrafts((prev) => {
        if (!(testCaseId in prev)) {
          return prev;
        }
        const draftValue = prev[testCaseId];
        const currentValue = resultStateRef.current[testCaseId]?.comment ?? "";
        if (draftValue !== currentValue) {
          handleResultChange(testCaseId, { comment: draftValue });
        }
        const nextDrafts = { ...prev };
        delete nextDrafts[testCaseId];
        return nextDrafts;
      });
    },
    [handleResultChange],
  );

  const flushDrafts = useCallback(() => {
    Object.keys(commentDrafts).forEach((testCaseId) => {
      commitComment(testCaseId);
    });
  }, [commentDrafts, commitComment]);

  const summary = useMemo(() => {
    const total = runState.coverage?.totalCases ?? runState.results.length;
    const counts = RESULT_STATUSES.reduce<Record<QaEvaluation, number>>(
      (acc, evaluation) => {
        acc[evaluation] = Object.values(resultState).filter((value) => value.evaluation === evaluation).length;
        return acc;
      },
      {
        NOT_WORKING: 0,
        MINOR_ISSUE: 0,
        PASSED: 0,
      },
    );
    const passRate = total > 0 ? Math.round(((counts.PASSED ?? 0) / total) * 100) : 0;
    return {
      total,
      counts,
      passRate,
    };
  }, [resultState, runState.coverage, runState.results]);

  const runMeta = useMemo(() => {
    return {
      title: runState.name?.trim() || t("panel.untitled"),
      environment: runState.environment ?? null,
      createdAt: formatter.dateTime(new Date(runState.runDate), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      runner: runState.runBy?.name ?? null,
      featureName: runState.feature?.name ?? null,
      scope: runState.coverage?.scope ?? "FEATURE",
      notes: runState.notes?.trim() ?? "",
    };
  }, [formatter, runState.coverage?.scope, runState.environment, runState.feature?.name, runState.name, runState.notes, runState.runBy?.name, runState.runDate, t]);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    return caseRows.filter((row) => {
      if (seen.has(row.testCaseId)) return false;
      seen.add(row.testCaseId);
      return true;
    });
  }, [caseRows]);

  const handleAddMissingCase = useCallback(
    async (testCaseId: string) => {
      if (caseRows.some((row) => row.testCaseId === testCaseId)) {
        return;
      }
      const missing = runState.coverage?.missingTestCases.find((item) => item.id === testCaseId);
      if (!missing) {
        return;
      }
      try {
        const updatedRun = await updateTestRun(token, runState.id, {
          results: [
            {
              testCaseId,
              evaluation: "NOT_WORKING",
            },
          ],
        });
        const nextState = resultsToState(updatedRun);
        setRunState(updatedRun);
        runStateRef.current = updatedRun;
        setCaseRows(buildCaseRows(updatedRun));
        setResultState(nextState);
        stableResultsRef.current = nextState;
        resultStateRef.current = nextState;
        pendingRef.current = {};
        onRunUpdated(updatedRun);
      } catch (error) {
        toast.error(t("errors.updateResults"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [caseRows, onRunUpdated, runState.coverage?.missingTestCases, runState.id, t, token],
  );

  const handleRemoveCase = useCallback(
    async (testCaseId: string) => {
      try {
        const updatedRun = await updateTestRun(token, runState.id, {
          removeTestCaseIds: [testCaseId],
        });
        const nextState = resultsToState(updatedRun);
        setRunState(updatedRun);
        runStateRef.current = updatedRun;
        setCaseRows(buildCaseRows(updatedRun));
        setResultState(nextState);
        stableResultsRef.current = nextState;
        resultStateRef.current = nextState;
        pendingRef.current = {};
        onRunUpdated(updatedRun);
      } catch (error) {
        toast.error(t("errors.updateResults"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [onRunUpdated, runState.id, t, token],
  );

  const handleCloseRun = useCallback(async () => {
    if (runState.status === "CLOSED") {
      return;
    }
    flushDrafts();
    await persistUpdates();
    const targetTestCaseIds = Array.from(
      new Set((runStateRef.current?.results ?? []).map((result) => result.testCaseId)),
    );
    setIsClosingRun(true);
    try {
      const updatedRun = await updateTestRun(token, runState.id, {
        status: "CLOSED",
        ...(targetTestCaseIds.length ? { targetTestCaseIds } : {}),
      });
      const nextState = resultsToState(updatedRun);
      setRunState(updatedRun);
      runStateRef.current = updatedRun;
      setCaseRows(buildCaseRows(updatedRun));
      setResultState(nextState);
      stableResultsRef.current = nextState;
      resultStateRef.current = nextState;
      pendingRef.current = {};
      setCommentDrafts({});
      onRunUpdated(updatedRun);
      toast.success(t("panel.actions.closed"));
    } catch (error) {
      toast.error(t("errors.updateResults"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsClosingRun(false);
    }
  }, [flushDrafts, onRunUpdated, persistUpdates, runState.id, runState.status, t, token]);

  const isCoverageComplete =
    summary.total > 0 &&
    summary.counts.PASSED === summary.total &&
    (runState.coverage?.missingCases ?? 0) === 0;
  const isRunClosed = runState.status === "CLOSED";
  const showClosedTag = isRunClosed || isCoverageComplete;

  return (
    <div className="mt-8 space-y-6 rounded-2xl border bg-muted/40 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{runMeta.title}</h3>
          <p className="text-xs text-muted-foreground">
            {t("panel.createdAt", { date: runMeta.createdAt })}
          </p>
          {runMeta.environment && (
            <p className="text-xs text-muted-foreground">
              {runMeta.environment}
            </p>
          )}
          {runMeta.runner && (
            <p className="text-xs text-muted-foreground">
              {t("panel.runBy", { name: runMeta.runner })}
            </p>
          )}
          {runMeta.featureName && (
            <p className="text-xs text-muted-foreground">
              {runMeta.featureName}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("panel.scope", { scope: runMeta.scope })}
          </p>
          {runMeta.notes && (
            <p className="mt-2 text-sm text-muted-foreground">
              {runMeta.notes}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <SummaryBadge
            label={t(`panel.statusBadge.${runState.status ?? "OPEN"}`)}
            tone={isRunClosed ? "success" : "default"}
          />
          <SummaryBadge label={t("panel.summary.total", { count: summary.total })} />
          <SummaryBadge label={t("panel.summary.passed", { count: summary.counts.PASSED })} tone="success" />
          <SummaryBadge label={t("panel.summary.passRate", { rate: summary.passRate })} />
          <SavingIndicator status={saveStatus} />
          {!isRunClosed && (
            <Button size="sm" variant="outline" onClick={() => void handleCloseRun()} disabled={isClosingRun}>
              {isClosingRun ? t("panel.actions.closing") : t("panel.actions.close")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <EmptyState
            title={t("panel.empty.title")}
            description={t("panel.empty.description")}
          />
        )}
        {rows.map((testCase) => {
          const state = resultState[testCase.testCaseId] ?? {};
          const draftComment = commentDrafts[testCase.testCaseId];
          const noteValue = draftComment ?? state.comment ?? "";
          const isPassed = state.evaluation === "PASSED";
          const isReadOnlyNote = isRunClosed || isPassed;
          const noteClasses = cn(
            "mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
            isReadOnlyNote && "bg-muted text-muted-foreground cursor-not-allowed",
          );
          return (
            <div key={testCase.testCaseId} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-sm font-semibold">{testCase.name}</h4>
                  {testCase.featureName && (
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {testCase.featureName}
                    </p>
                  )}
                  {testCase.expected && (
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">{testCase.expected}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("panel.fields.status")}
                  </label>
                  <select
                    value={state.evaluation ?? ""}
                    onChange={(event) => {
                      const nextValue = event.target.value
                        ? (event.target.value as QaEvaluation)
                        : undefined;
                      if (nextValue === "PASSED") {
                        commitComment(testCase.testCaseId);
                      }
                      handleResultChange(testCase.testCaseId, {
                        evaluation: nextValue,
                      });
                    }}
                    disabled={isRunClosed}
                    className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
                  >
                    <option value="">{t("panel.statusPlaceholder")}</option>
                    {RESULT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels(status)}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCase(testCase.testCaseId)}
                    disabled={isRunClosed}
                  >
                    {t("panel.removeCase")}
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("panel.fields.note")}
                </label>
                <textarea
                  rows={2}
                  value={noteValue}
                  onChange={(event) => handleDraftChange(testCase.testCaseId, event.target.value)}
                  onBlur={() => commitComment(testCase.testCaseId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      commitComment(testCase.testCaseId);
                    }
                  }}
                  readOnly={isReadOnlyNote}
                  className={noteClasses}
                  placeholder={t("panel.notePlaceholder")}
                />
              </div>
            </div>
          );
        })}
      </div>

      {runState.coverage && (
        <CoverageSummary
          coverage={runState.coverage}
          onAddCase={handleAddMissingCase}
          isClosed={showClosedTag}
        />
      )}
    </div>
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

function CoverageSummary({
  coverage,
  onAddCase,
  isClosed = false,
}: {
  coverage: QaRunCoverage;
  onAddCase?: (testCaseId: string) => void;
  isClosed?: boolean;
}) {
  const t = useTranslations("app.qa.runs");
  const hasMissing = coverage.missingCases > 0;
  const [showPending, setShowPending] = useState(false);

  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {t("panel.coverage.title", {
                executed: coverage.executedCases,
                total: coverage.totalCases,
              })}
            </p>
            {isClosed && <SummaryBadge label={t("panel.closedTag")} tone="success" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {hasMissing
              ? t("panel.coverage.pending", { count: coverage.missingCases })
              : t("panel.coverage.complete")}
          </p>
        </div>
        {hasMissing && (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setShowPending((prev) => !prev)}
          >
            {showPending ? t("panel.coverage.hidePending") : t("panel.coverage.showPending")}
          </button>
        )}
      </div>
      {hasMissing && showPending && (
        <ul className="mt-3 space-y-2">
          {coverage.missingTestCases.map((testCase) => (
            <li
              key={testCase.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{testCase.name}</p>
                <p className="text-xs text-muted-foreground">
                  {testCase.featureName}
                </p>
              </div>
              {onAddCase && (
                <Button size="sm" variant="outline" onClick={() => onAddCase(testCase.id)}>
                  {t("panel.coverage.addResult")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function resultsToState(run: QaTestRunDetail): Record<string, RunResultState> {
  const next: Record<string, RunResultState> = {};
  for (const result of run.results) {
    next[result.testCaseId] = {
      evaluation: result.evaluation,
      comment: result.comment ?? "",
    };
  }
  return next;
}

function buildCaseRows(run: QaTestRunDetail): RunCaseRow[] {
  const rows: RunCaseRow[] = run.results.map((result) => ({
    testCaseId: result.testCaseId,
    name: result.testCase?.name ?? result.testCaseId,
    expected: result.testCase?.expected ?? null,
    featureName: result.testCase?.feature?.name ?? null,
  }));
  const existingIds = new Set(rows.map((row) => row.testCaseId));
  const missing = run.coverage?.missingTestCases ?? [];
  for (const testCase of missing) {
    if (existingIds.has(testCase.id)) continue;
    rows.push({
      testCaseId: testCase.id,
      name: testCase.name,
      expected: null,
      featureName: testCase.featureName,
    });
  }
  return rows;
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
    health.passRate !== undefined && health.passRate !== null
      ? normalizePassRate(health.passRate)
      : null;
  const lastRun = health.lastRun
    ? formatter.dateTime(new Date(health.lastRun.runDate), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
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
      <p className="max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          className={actionButtonClass()}
          onClick={onAction}
        >
          {actionLabel}
        </button>
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
