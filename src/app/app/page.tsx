import { redirect } from "next/navigation";

import { RoutesEnum } from "@/lib/utils";
import { getSession } from "@/lib/session";

export default async function AppHome() {
  const session = await getSession();

  if (!session) {
    redirect(RoutesEnum.LOGIN);
  }

  redirect(RoutesEnum.APP_PROJECTS);
}
