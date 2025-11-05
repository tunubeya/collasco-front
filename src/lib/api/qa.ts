import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type QaResultStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED";

export type QaTestCase = {
  id: string;
  title: string;
  steps?: string[];
  expectedResult?: string;
  archived?: boolean;
  updatedAt: string;
};

export type CreateTestCasesDto = {
  cases: Array<{
    title: string;
    steps?: string[];
    expectedResult?: string;
  }>;
};

export type UpdateTestCaseDto = Partial<{
  title: string;
  steps: string[];
  expectedResult: string;
  archived: boolean;
}>;

export type QaTestRunResult = {
  testCaseId: string;
  status: QaResultStatus;
  note?: string;
};

export type QaTestRunSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
};

export type QaTestRun = {
  id: string;
  featureId: string;
  createdAt: string;
  name?: string;
  notes?: string;
  environment?: string;
  testCases?: QaTestCase[];
  results: QaTestRunResult[];
  summary?: QaTestRunSummary;
};

export type CreateTestRunDto = {
  name?: string;
  notes?: string;
  environment?: string;
};

export type UpsertResultsDto = {
  results: QaTestRunResult[];
};

export type QaHealthTrendPoint = {
  runId: string;
  date: string;
  passRate: number;
};

export type QaHealth = {
  passRate?: number;
  lastRunAt?: string;
  trend?: QaHealthTrendPoint[];
  flakyCount?: number;
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
): Promise<QaTestRun> {
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
    return await parseJsonResponse<QaTestRun>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function getTestRun(
  token: string,
  runId: string
): Promise<QaTestRun> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/qa/test-runs/${runId}`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return await parseJsonResponse<QaTestRun>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function upsertResults(
  token: string,
  runId: string,
  dto: UpsertResultsDto
): Promise<QaTestRun> {
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
    return await parseJsonResponse<QaTestRun>(res);
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function listTestRuns(
  token: string,
  featureId: string,
  limit = 10
): Promise<QaTestRun[]> {
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
    const payload = await parseJsonResponse<QaTestRun[] | { items?: QaTestRun[] }>(res);
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
