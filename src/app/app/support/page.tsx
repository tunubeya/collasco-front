import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { RoutesEnum } from "@/lib/utils";

const MANUAL_URL =
  "https://collasco.com/public/manual/shared/bbcd7836-bcad-4eb8-bf39-ac1199df43c7";

export default async function SupportPage() {
  const session = await getSession();
  if (!session) {
    redirect(RoutesEnum.LOGIN);
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
      <iframe
        title="Support manual"
        src={MANUAL_URL}
        className="h-full w-full rounded-xl border bg-white"
      />
    </div>
  );
}
