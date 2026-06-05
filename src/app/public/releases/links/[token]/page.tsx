import { PublicReleaseNotesClient } from "./public-release-notes.client";

type PublicReleaseNotesPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicReleaseNotesPage({
  params,
}: PublicReleaseNotesPageProps) {
  const { token } = await params;
  return <PublicReleaseNotesClient token={token} />;
}
