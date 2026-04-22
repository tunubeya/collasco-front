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
import { Switch } from "@/ui/components/form/switch";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import {
  deleteGithubTokenAction,
  type GithubTokenFormState,
  updateTicketPreferenceAction,
  upsertGithubTokenAction,
} from "@/app/app/settings/general/actions";

type Props = {
  initial: {
    apiTokenMasked: string;
    hasGithubToken: boolean;
    notifyAssignedTickets: boolean;
    notifyUnassignedTickets: boolean;
    emailAssignedTickets: boolean;
    emailUnassignedTickets: boolean;
  };
};

export default function SettingsGeneralClient({ initial }: Props) {
  const t = useTranslations("app.settings.general");
  const [githubToken, setGithubToken] = useState("");
  const [hasGithubToken, setHasGithubToken] = useState(initial.hasGithubToken);
  const [ticketPrefs, setTicketPrefs] = useState({
    notifyAssignedTickets: initial.notifyAssignedTickets,
    notifyUnassignedTickets: initial.notifyUnassignedTickets,
    emailAssignedTickets: initial.emailAssignedTickets,
    emailUnassignedTickets: initial.emailUnassignedTickets,
  });
  const [revoking, startRevoke] = useTransition();
  const [savingField, startSavingField] = useTransition();
  const [githubFeedback, setGithubFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [ticketFeedback, setTicketFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const INITIAL_GITHUB_STATE: GithubTokenFormState = { fieldErrors: {} };
  const [githubState, submitGithubToken] = useActionState(
    upsertGithubTokenAction,
    INITIAL_GITHUB_STATE
  );

  useEffect(() => {
    setHasGithubToken(initial.hasGithubToken);
  }, [initial.hasGithubToken]);

  useEffect(() => {
    setTicketPrefs({
      notifyAssignedTickets: initial.notifyAssignedTickets,
      notifyUnassignedTickets: initial.notifyUnassignedTickets,
      emailAssignedTickets: initial.emailAssignedTickets,
      emailUnassignedTickets: initial.emailUnassignedTickets,
    });
  }, [
    initial.emailAssignedTickets,
    initial.emailUnassignedTickets,
    initial.notifyAssignedTickets,
    initial.notifyUnassignedTickets,
  ]);

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

  const handleTogglePreference = useCallback(
    (
      field:
        | "notifyAssignedTickets"
        | "notifyUnassignedTickets"
        | "emailAssignedTickets"
        | "emailUnassignedTickets",
      nextValue: boolean
    ) => {
      setTicketFeedback(null);
      setTicketPrefs((prev) => ({ ...prev, [field]: nextValue }));
      startSavingField(async () => {
        const result = await updateTicketPreferenceAction(field, nextValue);
        if (!result.success) {
          setTicketPrefs((prev) => ({ ...prev, [field]: !nextValue }));
          setTicketFeedback({
            type: "error",
            message: t("ticketPrefs.alerts.error"),
          });
          return;
        }
        setTicketPrefs((prev) => ({ ...prev, [field]: result.value }));
        setTicketFeedback({
          type: "success",
          message: t("ticketPrefs.alerts.success"),
        });
      });
    },
    [t]
  );

  return (
    <div className="grid gap-8 bg-surface border border-[color:var(--color-border)] rounded-2xl p-6">
      <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
        <div>
          <h2 className="text-lg font-semibold">{t("ticketPrefs.title")}</h2>
          <p className="text-sm text-slate-600">{t("ticketPrefs.subtitle")}</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            {
              key: "notifyAssignedTickets" as const,
              label: t("ticketPrefs.notifyAssigned.label"),
              description: t("ticketPrefs.notifyAssigned.description"),
            },
            {
              key: "notifyUnassignedTickets" as const,
              label: t("ticketPrefs.notifyUnassigned.label"),
              description: t("ticketPrefs.notifyUnassigned.description"),
            },
            {
              key: "emailAssignedTickets" as const,
              label: t("ticketPrefs.emailAssigned.label"),
              description: t("ticketPrefs.emailAssigned.description"),
            },
            {
              key: "emailUnassignedTickets" as const,
              label: t("ticketPrefs.emailUnassigned.label"),
              description: t("ticketPrefs.emailUnassigned.description"),
            },
          ].map((item) => (
            <div
              key={item.key}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
                ticketPrefs[item.key]
                  ? "border-sky-300 bg-white"
                  : "border-sky-100 bg-white/70"
              )}
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs leading-5 text-slate-600">
                  {item.description}
                </p>
              </div>
              <Switch
                checked={ticketPrefs[item.key]}
                onChange={(e) =>
                  handleTogglePreference(item.key, e.target.checked)
                }
                aria-label={item.label}
                disabled={savingField}
              />
            </div>
          ))}
        </div>

        {ticketFeedback && (
          <p
            className={cn(
              "mt-4 text-sm",
              ticketFeedback.type === "success" ? "text-green-700" : "text-red-600"
            )}
            role={ticketFeedback.type === "success" ? "status" : "alert"}
          >
            {ticketFeedback.message}
          </p>
        )}
      </section>

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
