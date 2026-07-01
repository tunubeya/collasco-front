"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/form/input";
import { authenticate } from "@/lib/actions";
import { toast } from "sonner";
import { RoutesEnum } from "@/lib/utils";
import { AuthSplitLayout } from "@/ui/components/auth/auth-split-layout";

export default function LoginPageClient() {
  const t = useTranslations("auth.login");
  const [state, action, pending] = useActionState(authenticate, undefined);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(t("toast.success"), {
        onAutoClose: () => router.push(RoutesEnum.APP_ROOT),
        onDismiss: () => router.push(RoutesEnum.APP_ROOT),
        duration: 900,
      });
    } else {
      toast.error(state.error);
    }
  }, [state, router, t]);

  // (Opcional) si ya no hay subdominios tipo Tunubeya, podemos quitar esto.
  // Lo dejo comentado por si luego lo necesitas.
  // useEffect(() => {
  //   const host = window.location.hostname;
  //   if (host !== 'Collasco.com' && host.endsWith('.Collasco.com')) {
  //     localStorage.setItem('returnToSubdomain', window.location.origin);
  //   }
  // }, []);

  const fields = [
    {
      name: "email",
      label: t("emailLabel"),
      placeholder: t("emailPlaceholder"),
      type: "email",
    },
    {
      name: "password",
      label: t("passwordLabel"),
      placeholder: t("passwordPlaceholder"),
      type: "password",
    },
  ] as const;

  return (
    <AuthSplitLayout
      footer={
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted-fg)]">
          © {new Date().getFullYear()} Collasco. All rights reserved.
        </p>
      }
    >
      <div className="mb-7 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-foreground)]">
          {t("title_01")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">
          {t("description_01")}
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        {fields.map((f) => (
          <Input
            key={f.name}
            name={f.name}
            label={f.label}
            type={f.type}
            className="border border-gray-300 bg-white focus-visible:border-gray-500 focus-visible:ring-gray-200"
            placeholder={f.placeholder}
          />
        ))}

        <div className="flex items-center justify-between text-sm">
          <Link
            href={RoutesEnum.FORGOT_PASSWORD}
            className="underline text-primary hover:opacity-90"
          >
            {t("recover")}
          </Link>
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-slate-950 text-white hover:bg-slate-800"
        >
          {pending ? t("loading") ?? "Signing in…" : t("loginButton")}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-[color:var(--color-muted-fg)]">
        {t("alreadyAccount")}{" "}
        <Link
          href={RoutesEnum.REGISTER}
          className="font-semibold underline text-slate-950 hover:opacity-90"
        >
          {t("createAccount")}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
