import { PublicManualClient } from "./public-manual.client";

type PublicManualPageProps = {
  params: { linkId: string } | Promise<{ linkId: string }>;
  searchParams?:
    | {
        labels?: string | string[];
      }
    | Promise<{
        labels?: string | string[];
      }>;
};

function parseLabelIds(input?: string | string[]): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(",") : input;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export default async function PublicManualPage(props: PublicManualPageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = await Promise.resolve(props.searchParams);
  const labelIds = parseLabelIds(searchParams?.labels);

  return <PublicManualClient linkId={params.linkId} labelIds={labelIds} />;
}
