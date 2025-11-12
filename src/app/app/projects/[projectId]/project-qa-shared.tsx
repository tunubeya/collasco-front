"use client";

import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";

export function SummaryBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success";
}) {
  const colors =
    tone === "success"
      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
      : "border-muted bg-muted/60 text-foreground";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", colors)}>
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 px-6 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
