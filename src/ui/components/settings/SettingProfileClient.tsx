"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "@/ui/components/form/input";
import { Button } from "@/ui/components/button";
import { useTranslations } from "next-intl";

import {
  type PasswordFormState,
  type ProfileFormState,
  updatePasswordAction,
  updateProfileAction,
} from "@/app/app/settings/profile/actions";

type Props = {
  defaultName: string;
  defaultEmail: string;
};

export default function SettingsProfileClient({ defaultName, defaultEmail }: Props) {
  const t = useTranslations("app.settings.profile");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const INITIAL_PROFILE_STATE: ProfileFormState = { fieldErrors: {} };
  const INITIAL_PASSWORD_STATE: PasswordFormState = { fieldErrors: {} };

  const [profileState, triggerProfile] = useActionState(
    updateProfileAction,
    INITIAL_PROFILE_STATE
  );
  const [passwordState, triggerPassword] = useActionState(
    updatePasswordAction,
    INITIAL_PASSWORD_STATE
  );

  useEffect(() => {
    if (profileState?.success) {
      setName((prev) => prev.trim());
      setEmail((prev) => prev.trim());
    }
  }, [profileState?.success]);

  useEffect(() => {
    if (passwordState?.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [passwordState?.success]);

  return (
    <div className="grid gap-8">
      {/* Bloque Perfil */}
      <form
        action={(formData) => {
          formData.set("name", name);
          formData.set("email", email);
          return triggerProfile(formData);
        }}
        className="bg-surface border border-[color:var(--color-border)] rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold mb-4">{t("title")}</h2>

        <div className="grid gap-4">
          <Input
            name="name"
            label={t("name.title")}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            errorMessage={
              profileState.fieldErrors?.name
                ? [t("errors.nameRequired")]
                : undefined
            }
          />
          <Input
            name="email"
            type="email"
            label={t("email.title")}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errorMessage={
              profileState.fieldErrors?.email
                ? [t("errors.emailInvalid")]
                : undefined
            }
          />
        </div>

        {profileState.success && (
          <p className="mt-4 text-sm text-green-700" role="status">
            {t("alerts.success")}
          </p>
        )}
        {!profileState.success && profileState.message === "serverError" && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {t("alerts.error")}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit">
            {t("save")}
          </Button>
          <span className="text-xs text-[color:var(--color-muted-fg)]">
            {t("hint")}
          </span>
        </div>
      </form>

      {/* Bloque Contraseña */}
      <form
        action={(formData) => {
          formData.set("currentPassword", currentPassword);
          formData.set("newPassword", newPassword);
          formData.set("confirmPassword", confirmPassword);
          return triggerPassword(formData);
        }}
        className="bg-surface border border-[color:var(--color-border)] rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold mb-4">{t("password.title")}</h2>

        <div className="grid gap-4">
          <Input
            name="currentPassword"
            type="password"
            label={t("password.current")}
            placeholder="********"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            errorMessage={
              passwordState.fieldErrors?.currentPassword
                ? [t("password.errors.current")]
                : undefined
            }
          />
          <Input
            name="newPassword"
            type="password"
            label={t("password.new")}
            placeholder="********"
            description={t("password.rules")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            errorMessage={
              passwordState.fieldErrors?.newPassword
                ? [t("password.errors.new")]
                : undefined
            }
          />
          <Input
            name="confirmPassword"
            type="password"
            label={t("password.confirm")}
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            errorMessage={
              passwordState.fieldErrors?.confirmPassword
                ? [t("password.errors.confirm")]
                : undefined
            }
          />
        </div>

        {passwordState.success && (
          <p className="mt-4 text-sm text-green-700" role="status">
            {t("password.alerts.success")}
          </p>
        )}
        {!passwordState.success && passwordState.message && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {t(`password.alerts.${passwordState.message}`, {
              default: t("password.alerts.error"),
            })}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit">
            {t("password.save")}
          </Button>
          <span className="text-xs text-[color:var(--color-muted-fg)]">
            {t("password.hint")}
          </span>
        </div>
      </form>
    </div>
  );
}
