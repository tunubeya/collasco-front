//src/app/app/projects/[projectId]/edit/page.tsx
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import {
  deleteProject,
  updateProject,
} from "@/app/app/projects/actions";
import { fetchProjectById } from "@/lib/data";
import { getSession } from "@/lib/session";
import type { Project } from "@/lib/model-definitions/project";
import { RoutesEnum } from "@/lib/utils";
import { ProjectForm } from "@/ui/components/projects/ProjectForm.client";
import { handlePageError } from "@/lib/handle-page-error";

type Params = { projectId: string };

export default async function EditProjectPage({
  params,
}: {
  params: Params;
}) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const t = await getTranslations("app.projects.edit");
  const formatter = await getFormatter();

  const { projectId } = params;

  let project: Project | null = null;
  try {
    project = await fetchProjectById(session.token, projectId);
  }  catch (error) {
  await handlePageError(error);
}

  if (!project) notFound();

  const formattedUpdatedAt = formatter.dateTime(
    new Date(project.updatedAt),
    { dateStyle: "medium" }
  );

  return (
    <div className="max-w-3xl space-y-6 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("updated", { date: formattedUpdatedAt })}
        </p>
      </header>

      <ProjectForm
        mode="edit"
        action={updateProject.bind(null, projectId)}
        defaultValues={{
          name: project.name,
          description: project.description,
          repositoryUrl: project.repositoryUrl,
          status: project.status,
          visibility: project.visibility,
        }}
      />

      <form
        action={deleteProject.bind(null, projectId)}
        className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-destructive">
              {t("dangerZone.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("dangerZone.description")}
            </p>
          </div>
          <DeleteButton label={t("dangerZone.delete")} />
        </div>
      </form>
    </div>
  );
}

function DeleteButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex items-center rounded-lg border border-destructive bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors"
    >
      {label}
    </button>
  );
}
