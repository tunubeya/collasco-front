"use client";

import { LogOut, CircleUserRound } from "lucide-react";
import { Button } from "@/ui/components/button";
import { logoutClient } from "@/lib/actions";
import { Session } from "@/lib/definitions";
import PopoverOptions from "@/ui/components/popover/popover-options";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ProfileMenuClient({ session }: { session: Session | null }) {
  const t = useTranslations('ui.navbar.profile-menu-client');
  const router = useRouter();

  const handleLogout = async () => {
    await logoutClient();
    router.refresh(); // Para actualizar sin perder la ruta
  };

  if (!session?.token) return null;

  return (
    <PopoverOptions
      trigger={
        <Button size="icon" variant="ghost" className="rounded-full bg-gray-200 hover:bg-gray-300 transition">
          <CircleUserRound className="w-8 h-8 text-purple-dark" />
        </Button>
      }
    >
      <button
        onClick={handleLogout}
        className="flex items-center text-red-600 px-3 py-2 hover:bg-gray-100 w-full"
      >
        <LogOut className="w-5 h-5 mr-2" />
        {t('logout')}
      </button>
    </PopoverOptions>
  );
}