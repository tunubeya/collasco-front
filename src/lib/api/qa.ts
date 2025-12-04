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
