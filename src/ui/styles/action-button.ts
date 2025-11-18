import { cn } from "@/lib/utils";

type Variant = "primary" | "neutral" | "destructive";
type Size = "sm" | "xs";

const BASE =
  "inline-flex items-center rounded-lg border font-medium shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:ring-offset-background hover:-translate-y-0.5 disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-primary bg-primary text-primary-foreground hover:bg-primary/85 hover:shadow-md",
  neutral:
    "border-border bg-background text-foreground hover:bg-muted hover:border-border/80 hover:shadow-md",
  destructive:
    "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:border-destructive/80 hover:shadow-md",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  xs: "px-3 py-1 text-xs",
};

export function actionButtonClass(options?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { variant = "primary", size = "sm", className } = options ?? {};
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}
