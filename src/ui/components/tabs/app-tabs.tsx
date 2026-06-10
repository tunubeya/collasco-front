"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SharedTabProps = {
  label: string;
  icon?: LucideIcon;
  isActive?: boolean;
  onClick?: () => void;
  href?: string;
  badge?: number | string | null;
  role?: "tab";
  ariaSelected?: boolean;
  ariaCurrent?: "page";
};

export function AppPrimaryTabButton({
  label,
  icon: Icon,
  isActive = false,
  onClick,
  href,
}: SharedTabProps) {
  const className = cn(
    "relative -mb-px inline-flex items-center gap-2 rounded-t-lg border border-transparent px-4 py-3 text-sm font-medium transition",
    isActive
      ? "border-blue-100 bg-blue-50 text-blue-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-600"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
  );

  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

export function AppSecondaryTabButton({
  label,
  icon: Icon,
  isActive = false,
  onClick,
  href,
  badge,
  role,
  ariaSelected,
  ariaCurrent,
}: SharedTabProps) {
  const className = cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-blue-100 text-blue-700 shadow-sm"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
  );
  const hasBadge = badge !== null && badge !== undefined && badge !== "";
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {label}
      {hasBadge ? (
        <span
          className={cn(
            "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
            isActive ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-600",
          )}
        >
          {badge}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-current={ariaCurrent}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      role={role}
      aria-selected={ariaSelected}
      aria-current={ariaCurrent}
    >
      {content}
    </button>
  );
}
