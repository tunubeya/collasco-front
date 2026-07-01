"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/ui/components/form/input";
import { actionButtonClass } from "@/ui/styles/action-button";

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

export default function SettingsProfileClient({
  defaultName,
  defaultEmail,
}: Props) {
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
      setName(profileState.user?.name?.trim() ?? name.trim());
      setEmail(profileState.user?.email?.trim() ?? email.trim());
    }
  }, [email, name, profileState?.success, profileState.user]);

  useEffect(() => {
    if (passwordState?.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [passwordState?.success]);

  return (
    <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData();
          formData.set("name", name);
          formData.set("email", email);
          startTransition(() => {
            triggerProfile(formData);
          });
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      >
        <h2 className="mb-1 text-lg font-semibold">{t("title")}</h2>
        <p className="mb-5 text-sm text-[color:var(--color-muted-fg)]">
          {t("hint")}
        </p>

        <div className="grid gap-4">
          <Input
            name="name"
            label={t("name.title")}
            placeholder="John Doe"
            value={name}
            className="border border-gray-300 bg-white focus-visible:border-gray-500 focus-visible:ring-gray-200"
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
            className="border border-gray-300 bg-white focus-visible:border-gray-500 focus-visible:ring-gray-200"
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className={actionButtonClass({
              className: "border-primary bg-primary text-primary-foreground hover:bg-primary/85",
            })}
          >
            {t("save")}
          </button>
        </div>
      </form>

      <form
        action={(formData) => {
          formData.set("currentPassword", currentPassword);
          formData.set("newPassword", newPassword);
          formData.set("confirmPassword", confirmPassword);
          return triggerPassword(formData);
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      >
        <h2 className="mb-1 text-lg font-semibold">{t("password.title")}</h2>
        <p className="mb-5 text-sm text-[color:var(--color-muted-fg)]">
          {t("password.hint")}
        </p>

        <div className="grid gap-4">
          <Input
            name="currentPassword"
            type="password"
            label={t("password.current")}
            placeholder="********"
            value={currentPassword}
            className="border border-gray-300 bg-white focus-visible:border-gray-500 focus-visible:ring-gray-200"
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
            className="border border-gray-300 bg-white focus-visible:border-gray-500 focus-visible:ring-gray-200"
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
            className="border border-gray-300 bg-white focus-visible:border-gray-500 focus-visible:ring-gray-200"
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className={actionButtonClass({
              className: "border-primary bg-primary text-primary-foreground hover:bg-primary/85",
            })}
          >
            {t("password.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
