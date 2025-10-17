// src/app/app/projects/new/page.tsx
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { createProject } from "@/app/app/projects/actions";
import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";
import { ProjectForm } from "@/ui/components/projects/ProjectForm.client";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const t = await getTranslations("app.projects.new");

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        {t("title")}
      </h1>
      <ProjectForm mode="create" action={createProject} />
    </div>
  );
}
