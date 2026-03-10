"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/components/button";
import { useRouter } from "next/navigation";

interface UnauthorizedViewProps {
  title?: string;
  description?: string;
}

export function UnauthorizedView({ title, description }: UnauthorizedViewProps) {
  const t = useTranslations("error-pages.error-unauthorized");
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 rounded-xl border border-dashed border-border min-h-[400px]">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <ShieldAlert className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">{title || t("title")}</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        {description || t("description")}
      </p>
      <Button variant="outline" onClick={() => router.back()}>
        {t("button", { default: "Volver atrás" })}
      </Button>
    </div>
  );
}
