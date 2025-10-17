// src/app/app/page.tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { RoutesEnum } from "@/lib/utils";

export default async function AppHome() {
  const session = await getSession();

  if (!session) {
    redirect(RoutesEnum.LOGIN); // 🔒 Si no está logueado, afuera
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-4">Welcome back, {session.role} 👋</h1>
      <p className="text-muted-foreground">
        This is your main workspace. From here you can manage your{" "}
        <span className="font-medium">projects</span> and{" "}
        <span className="font-medium">settings</span>.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <a
          href={RoutesEnum.APP_PROJECTS}
          className="rounded-xl border p-6 hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">📂 Projects</h2>
          <p className="text-sm text-muted-foreground">
            View, organize and manage your projects and modules.
          </p>
        </a>

        <a
          href={RoutesEnum.APP_SETTINGS}
          className="rounded-xl border p-6 hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">⚙️ Settings</h2>
          <p className="text-sm text-muted-foreground">
            Update your profile, password and API preferences.
          </p>
        </a>
      </div>
    </div>
  );
}
