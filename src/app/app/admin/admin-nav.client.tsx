"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppSecondaryTabButton } from "@/ui/components/tabs/app-tabs";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ICON_BY_PATH = {
  "/app/admin/notifications": Bell,
} as const;

export default function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {items.map((item) => {
        const isActive = pathname?.startsWith(item.href);

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
