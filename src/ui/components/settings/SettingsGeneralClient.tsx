"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/form/input";
import { useTranslations } from "next-intl";

import {
  deleteGithubTokenAction,
  type GeneralFormState,
  type GithubTokenFormState,
  updateGeneralPreferencesAction,
  upsertGithubTokenAction,
} from "@/app/app/settings/general/actions";

type Props = {
  initial: {
    apiTokenMasked: string;
    hasGithubToken: boolean;
  };
};

export default function SettingsGeneralClient({ initial }: Props) {
  const t = useTranslations("app.settings.general");
  const [githubToken, setGithubToken] = useState("");
  const [hasGithubToken, setHasGithubToken] = useState(initial.hasGithubToken);
  const [revoking, startRevoke] = useTransition();
  const [githubFeedback, setGithubFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const INITIAL_PREFERENCES_STATE: GeneralFormState = {};
  const [state, dispatch] = useActionState(
    updateGeneralPreferencesAction,
    INITIAL_PREFERENCES_STATE
  );

  const INITIAL_GITHUB_STATE: GithubTokenFormState = { fieldErrors: {} };
  const [githubState, submitGithubToken] = useActionState(
    upsertGithubTokenAction,
    INITIAL_GITHUB_STATE
  );

  useEffect(() => {
    setHasGithubToken(initial.hasGithubToken);
  }, [initial.hasGithubToken]);

  useEffect(() => {
    if (!githubState) return;
    if (githubState.success) {
      setGithubToken("");
      setHasGithubToken(true);
      setGithubFeedback({
        type: "success",
        message: t("github.alerts.saved"),
      });
    } else if (githubState.message === "error") {
      setGithubFeedback({
        type: "error",
        message: t("github.alerts.error"),
      });
    } else if (githubState.message === "validation") {
      setGithubFeedback(null);
    }
  }, [githubState, t]);

  const handleDisconnect = useCallback(() => {
    startRevoke(async () => {
      const result = await deleteGithubTokenAction();
      if (result.success) {
        setGithubFeedback({
          type: "success",
          message: t("github.alerts.removed"),
        });
        setHasGithubToken(false);
        setGithubToken("");
      } else {
        setGithubFeedback({
          type: "error",
          message: t("github.alerts.error"),
        });
      }
    });
  }, [t]);

  return (
    <div className="grid gap-8 bg-surface border border-[color:var(--color-border)] rounded-2xl p-6">
      <section>
        <h2 className="text-lg font-semibold">{t("github.title")}</h2>
        <p className="text-sm text-[color:var(--color-muted-fg)] mb-3">
          {t("github.subtitle")}
        </p>

        {hasGithubToken ? (
          <div className="mb-4 space-y-3">
            <Input
              type="password"
              label={t("github.maskedLabel")}
              value={initial.apiTokenMasked}
              readOnly
              autoComplete="off"
            />
            <p className="text-sm text-[color:var(--color-muted-fg)]">
              {t("github.maskedHint")}
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-[color:var(--color-muted-fg)]">
            {t("github.noToken")}
          </p>
        )}

        <form
          action={(formData) => {
            formData.set("githubToken", githubToken.trim());
            return submitGithubToken(formData);
          }}
          className="flex flex-col gap-4"
        >
          <Input
            name="githubToken"
            type="password"
            label={t("github.inputLabel")}
            placeholder={t("github.placeholder")}
            value={githubToken}
            onChange={(e) => {
              setGithubToken(e.target.value);
              if (githubFeedback) setGithubFeedback(null);
            }}
            errorMessage={
              githubState.message === "validation" &&
              githubState.fieldErrors?.githubToken
                ? [t("github.errors.required")]
                : undefined
            }
            autoComplete="off"
          />

          {githubFeedback && (
            <p
              className={`text-sm ${
                githubFeedback.type === "success"
                  ? "text-green-700"
                  : "text-red-600"
              }`}
              role={githubFeedback.type === "success" ? "status" : "alert"}
            >
              {githubFeedback.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!githubToken.trim()}>
              {t("github.save")}
            </Button>
            {hasGithubToken && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleDisconnect}
                disabled={revoking}
              >
                {t("github.disconnect")}
              </Button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
