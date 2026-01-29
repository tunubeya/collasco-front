import type { ProjectStructureResponse } from "@/lib/definitions";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type PublicManualResponse = ProjectStructureResponse & {
  project?: {
    id: string;
    name: string;
    description?: string | null;
  };
  projectName?: string;
  name?: string;
};

export class PublicManualError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type FetchPublicManualOptions = {
  linkId: string;
  labelIds?: string[];
};

export async function fetchPublicManual({
  linkId,
  labelIds,
}: FetchPublicManualOptions): Promise<PublicManualResponse> {
  const url = new URL(`${apiUrl}/public/manual/shared/${linkId}`);
  if (labelIds && labelIds.length > 0) {
    url.searchParams.set("labels", labelIds.join(","));
  }
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    let message: string | null = null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      message =
        (data && (data.message || data.error || data.detail)) ??
        (typeof data === "string" ? data : null);
    }
    if (!message) {
      message = await res.text().catch(() => null);
    }
    throw new PublicManualError(
      res.status,
      message || "Failed to fetch public manual",
    );
  }
  return (await res.json()) as PublicManualResponse;
}
