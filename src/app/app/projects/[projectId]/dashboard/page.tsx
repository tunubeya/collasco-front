import { redirect } from "next/navigation";

type Params = { projectId: string };

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { projectId } = await params;
  redirect(`/app/projects/${projectId}`);
}
