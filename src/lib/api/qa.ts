import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type QaEvaluation = "NOT_WORKING" | "MINOR_ISSUE" | "PASSED";

export type QaTestCase = {
  id: string;
  featureId: string;
  name: string;
  steps?: string | null;
  expected?: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
};

export type CreateTestCasesDto = {
  cases: Array<{
    name: string;
    steps?: string;
    expected?: string;
  }>;
};

export type UpdateTestCaseDto = Partial<{
  name: string;
  steps: string;
  expected: string;
  isArchived: boolean;
}>;

export type QaResultInput = {
  testCaseId: string;
  evaluation: QaEvaluation;
  comment?: string;
};

export type QaTestRunResult = {
  id: string;
  testCaseId: string;
  evaluation: QaEvaluation;
  comment?: string | null;
  createdAt: string;
  testCase?: {
    id: string;
    name: string;
    steps?: string | null;
    expected?: string | null;
    featureId: string;
    feature?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

export type QaRunCoverage = {
  scope: "FEATURE" | "PROJECT";
  totalCases: number;
  executedCases: number;
  missingCases: number;
  missingTestCases: Array<{
    id: string;
    name: string;
    featureId: string;
    featureName: string;
  }>;
};

export type QaRunStatus = "OPEN" | "CLOSED";

export type QaTestRunDetail = {
  id: string;
  projectId: string;
  featureId: string | null;
  runDate: string;
  name?: string | null;
  environment?: string | null;
  runById: string | null;
  notes?: string | null;
  status: QaRunStatus;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  } | null;
  feature?: {
    id: string;
    name: string;
    module?: {
      id: string;
      name: string;
      projectId: string;
    } | null;
  } | null;
  runBy?: {
    id: string;
    name: string | null;
    email?: string | null;
  } | null;
  results: QaTestRunResult[];
  coverage: QaRunCoverage;
  targetTestCaseIds?: string[];
  isTargetScopeCustom?: boolean;
};

export type QaEvaluationSummary = Record<QaEvaluation, number>;

export type QaFeatureRunListItem = {
  id: string;
  runDate: string;
  name?: string | null;
  environment?: string | null;
  by: string | null;
  status?: QaRunStatus;
  summary: QaEvaluationSummary;
  totalTestCases : number;
};

export type QaProjectRunListItem = QaFeatureRunListItem & {
  feature: {
    id: string;
    name: string;
  } | null;
  status?: QaRunStatus;
};

export type CreateTestRunDto = {
  name: string;
  environment: string;
  runById?: string;
  notes?: string;
  status?: QaRunStatus;
  targetTestCaseIds?: string[];
  results?: QaResultInput[];
};

export type CreateProjectTestRunDto = {
  name: string;
  environment: string;
  runById?: string;
  notes?: string;
  status?: QaRunStatus;
  targetTestCaseIds?: string[];
  results: QaResultInput[];
};

export type UpsertResultsDto = {
  results: QaResultInput[];
};

export type UpdateTestRunDto = {
  name?: string;
  environment?: string;
  notes?: string;
  status?: QaRunStatus;
  targetTestCaseIds?: string[];
  results?: QaResultInput[];
  removeTestCaseIds?: string[];
};

export type QaHealth = {
  featureId: string;
  passRate: number | null;
  lastRun: {
    id: string;
    runDate: string;
  } | null;
};

export type QaDashboardMetrics = {
  totalFeatures: number;
  featuresMissingDescription: number;
  featuresWithoutTestCases: number;
  featuresWithRuns: number;
  testCoverageRatio: number;
  openRuns: number;
  runsWithFullPass: number;
  averagePassRate: number;
};

export type QaDashboardFeatureMissingDescription = {
  id: string;
  name: string;
};

export type QaDashboardFeatureWithoutTestCases = {
  id: string;
  name: string;
};

export type QaDashboardFeatureCoverage = {
  featureId: string;
  featureName: string;
  hasDescription: boolean;
  hasTestRun: boolean;
  latestRun: {
    id: string;
    runDate: string;
    status: QaRunStatus;
    coverage: QaRunCoverage;
  } | null;
};

export type QaDashboardFeatureHealth = {
  featureId: string;
  featureName: string;
  passRate: number | null;
  latestRun: {
    id: string;
    runDate: string;
    status: QaRunStatus;
  } | null;
};

export type QaDashboardRunSummary = {
  id: string;
  runDate: string;
  environment: string | null;
  status: QaRunStatus;
  feature: {
    id: string;
    name: string;
  } | null;
  runBy: string | null;
  coverage?: QaRunCoverage;
};

export type QaProjectDashboardResponse = {
  projectId: string;
  metrics: QaDashboardMetrics;
  featuresWithoutTestCases?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

export async function listTestCases(
  token: string,
  featureId: string,
  includeArchived = false
): Promise<QaTestCase[]> {
  try {
    const url = new URL(`${apiUrl}/qa/features/${featureId}/test-cases`);
    if (includeArchived) {
      url.searchParams.set("includeArchived", "true");
    }
    const res = await fetchWithAuth(
      url.toString(),
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    const payload = await parseJsonResponse<QaTestCase[] | { items?: QaTestCase[] }>(res);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createTestCases(
  token: string,
  featureId: string,
  dto: CreateTestCasesDto
): Promise<QaTestCase[]> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/features/${featureId}/test-cases`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    const payload = await parseJsonResponse<QaTestCase[] | { items?: QaTestCase[] }>(res);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateTestCase(
  token: string,
  testCaseId: string,
  dto: UpdateTestCaseDto
): Promise<QaTestCase> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/test-cases/${testCaseId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestCase>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createTestRun(
  token: string,
  featureId: string,
  dto: CreateTestRunDto
): Promise<QaTestRunDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/features/${featureId}/test-runs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestRunDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function createProjectTestRun(
  token: string,
  projectId: string,
  dto: CreateProjectTestRunDto
): Promise<QaTestRunDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/projects/${projectId}/test-runs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestRunDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getTestRun(
  token: string,
  runId: string
): Promise<QaTestRunDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/test-runs/${runId}`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestRunDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function upsertResults(
  token: string,
  runId: string,
  dto: UpsertResultsDto
): Promise<QaTestRunDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/test-runs/${runId}/results`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestRunDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateTestRun(
  token: string,
  runId: string,
  dto: UpdateTestRunDto
): Promise<QaTestRunDetail> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/test-runs/${runId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestRunDetail>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listTestRuns(
  token: string,
  featureId: string,
  limit = 10
): Promise<QaFeatureRunListItem[]> {
  try {
    const url = new URL(`${apiUrl}/qa/features/${featureId}/test-runs`);
    if (limit) {
      url.searchParams.set("limit", String(limit));
    }
    const res = await fetchWithAuth(
      url.toString(),
      { method: "GET" },
      token
    );
    console.log(res);
    if (!res.ok) throw res;
    const payload = await parseJsonResponse<QaFeatureRunListItem[] | { items?: QaFeatureRunListItem[] }>(res);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export type QaRunScope = "ALL" | "PROJECT" | "FEATURE";

export async function listProjectTestRuns(
  token: string,
  projectId: string,
  limit = 10,
  scope: QaRunScope = "ALL"
): Promise<QaProjectRunListItem[]> {
  try {
    const url = new URL(`${apiUrl}/qa/projects/${projectId}/test-runs`);
    if (limit) {
      url.searchParams.set("limit", String(limit));
    }
    if (scope && scope !== "ALL") {
      url.searchParams.set("scope", scope);
    }
    const res = await fetchWithAuth(
      url.toString(),
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    const payload = await parseJsonResponse<QaProjectRunListItem[] | { items?: QaProjectRunListItem[] }>(res);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getTestHealth(
  token: string,
  featureId: string
): Promise<QaHealth> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/features/${featureId}/test-health`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaHealth>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getProjectDashboard(
  token: string,
  projectId: string
): Promise<QaProjectDashboardResponse> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/projects/${projectId}/dashboard`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaProjectDashboardResponse>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

function normalizePaginatedResult<T>(
  payload: Partial<PaginatedResult<T>> | null | undefined,
  fallbackPage: number,
  fallbackPageSize: number
): PaginatedResult<T> {
  const items = payload?.items ?? [];
  return {
    items,
    total: payload?.total ?? items.length,
    page: payload?.page ?? fallbackPage,
    pageSize: payload?.pageSize ?? fallbackPageSize,
  };
}

async function fetchProjectDashboardList<T>(
  token: string,
  projectId: string,
  resource: string,
  page: number,
  pageSize: number,
  extraParams?: Record<string, string | undefined>
): Promise<PaginatedResult<T>> {
  try {
    const url = new URL(`${apiUrl}/qa/projects/${projectId}/dashboard/${resource}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      });
    }
    const res = await fetchWithAuth(url.toString(), { method: "GET" }, token);
    if (!res.ok) throw res;
    const payload = await parseJsonResponse<PaginatedResult<T>>(res);
    return normalizePaginatedResult(payload, page, pageSize);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export function getProjectDashboardFeaturesMissingDescription(
  token: string,
  projectId: string,
  page: number,
  pageSize: number
) {
  return fetchProjectDashboardList<QaDashboardFeatureMissingDescription>(
    token,
    projectId,
    "features-missing-description",
    page,
    pageSize
  );
}

export function getProjectDashboardFeaturesWithoutTestCases(
  token: string,
  projectId: string,
  page: number,
  pageSize: number
) {
  return fetchProjectDashboardList<QaDashboardFeatureWithoutTestCases>(
    token,
    projectId,
    "features-without-testcases",
    page,
    pageSize
  );
}

export function getProjectDashboardFeatureCoverage(
  token: string,
  projectId: string,
  page: number,
  pageSize: number,
  sort?: "coverageAsc" | "coverageDesc"
) {
  return fetchProjectDashboardList<QaDashboardFeatureCoverage>(
    token,
    projectId,
    "feature-coverage",
    page,
    pageSize,
    sort ? { sort } : undefined
  );
}

export function getProjectDashboardFeatureHealth(
  token: string,
  projectId: string,
  page: number,
  pageSize: number
) {
  return fetchProjectDashboardList<QaDashboardFeatureHealth>(
    token,
    projectId,
    "feature-health",
    page,
    pageSize
  );
}

export function getProjectDashboardOpenRuns(
  token: string,
  projectId: string,
  page: number,
  pageSize: number
) {
  return fetchProjectDashboardList<QaDashboardRunSummary>(
    token,
    projectId,
    "open-runs",
    page,
    pageSize
  );
}

export function getProjectDashboardRunsWithFullPass(
  token: string,
  projectId: string,
  page: number,
  pageSize: number
) {
  return fetchProjectDashboardList<QaDashboardRunSummary>(
    token,
    projectId,
    "runs-with-full-pass",
    page,
    pageSize
  );
}
