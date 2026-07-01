"use client";

import { usePathname } from "next/navigation";
import { Settings, User } from "lucide-react";

import { AppSecondaryTabButton } from "@/ui/components/tabs/app-tabs";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ICON_BY_PATH = {
  "/app/settings/profile": User,
  "/app/settings/general": Settings,
} as const;

export default function SettingsNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {items.map((item) => {
        const isActive =
          item.href === "/app/settings"
            ? pathname === item.href
            : pathname?.startsWith(item.href);

        return (
          <AppSecondaryTabButton
            key={item.href}
            href={item.href}
            label={item.label}
            icon={NAV_ICON_BY_PATH[item.href as keyof typeof NAV_ICON_BY_PATH]}
            isActive={isActive}
            ariaCurrent={isActive ? "page" : undefined}
          />
        );
      })}
    </nav>
  );
}
