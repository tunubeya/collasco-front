"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import type { TicketImage, TicketSectionType } from "@/lib/model-definitions/ticket";
import {
  addPublicTicketSection,
  fetchPublicTicketFollow,
  PublicTicketError,
  uploadPublicTicketImage,
  type PublicTicketFollowResponse,
} from "@/lib/api/public-tickets";
import { cn } from "@/lib/utils";
import { RichTextPreview } from "@/ui/components/projects/RichTextPreview";

type Props = {
  followUpToken: string;
};

const SECTION_TYPES: TicketSectionType[] = ["RESPONSE", "COMMENT"];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function PublicTicketFollowClient({ followUpToken }: Props) {
  const t = useTranslations("app.tickets.public");
  const tDetail = useTranslations("app.tickets.detail");
  const format = useFormatter();
  const [data, setData] = useState<PublicTicketFollowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionType, setSectionType] = useState<TicketSectionType>("RESPONSE");
  const [sectionContent, setSectionContent] = useState("");
  const [email, setEmail] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchPublicTicketFollow(followUpToken);
      setData(payload);
    } catch (err) {
      if (err instanceof PublicTicketError) {
        if (err.status === 404) {
          setError(t("follow.notFound"));
          return;
        }
        if (err.status === 410) {
          setError(t("follow.revoked"));
          return;
        }
      }
      setError(t("follow.error"));
    } finally {
      setLoading(false);
    }
  }, [followUpToken, t]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const ticket = data?.ticket;
  const sections = useMemo(() => {
    const list = data?.sections ?? ticket?.sections ?? [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [data?.sections, ticket?.sections]);

  const images = useMemo<TicketImage[]>(
    () => data?.images ?? [],
    [data?.images]
  );

  const handleAddSection = useCallback(async () => {
    if (sectionSaving) return;
    if (!sectionContent.trim() || !email.trim()) {
      toast.error(t("follow.missing"));
      return;
    }
    setSectionSaving(true);
    try {
      await addPublicTicketSection(followUpToken, {
        type: sectionType,
        content: sectionContent.trim(),
        email: email.trim(),
      });
      setSectionContent("");
      toast.success(t("follow.sectionAdded"));
      await loadTicket();
    } catch (err) {
      console.error("Failed to add public section", err);
      toast.error(t("follow.sectionError"));
    } finally {
      setSectionSaving(false);
    }
  }, [
    email,
    followUpToken,
    loadTicket,
    sectionContent,
    sectionSaving,
    sectionType,
    t,
  ]);

  const handleUpload = useCallback(async () => {
    if (uploading || !imageFile) return;
    if (imageFile.size > MAX_ATTACHMENT_BYTES) {
      toast.error(t("follow.imageTooLarge"));
      return;
    }
    setUploading(true);
    try {
      await uploadPublicTicketImage(followUpToken, {
        file: imageFile,
        name: imageFile.name,
      });
      setImageFile(null);
      toast.success(t("follow.imageUploaded"));
      await loadTicket();
    } catch (err) {
      console.error("Failed to upload public image", err);
      toast.error(t("follow.imageError"));
    } finally {
      setUploading(false);
    }
  }, [followUpToken, imageFile, loadTicket, t, uploading]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("follow.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("follow.subtitle")}</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t("follow.loading")}</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-background p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                {ticket?.title ?? t("follow.ticketFallback")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("follow.projectLabel", {
                  name: data?.projectName ?? ticket?.project?.name ?? t("follow.projectFallback"),
                })}
              </p>
              {ticket?.createdAt ? (
                <p className="text-xs text-muted-foreground">
                  {t("follow.createdAt", {
                    date: format.dateTime(new Date(ticket.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </p>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold">{t("follow.activity")}</h3>
              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("follow.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-lg border px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{tDetail(`sectionTypes.${section.type}`, { default: section.type })}</span>
                        <span>
                          {format.dateTime(new Date(section.createdAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <RichTextPreview
                        value={section.content}
                        emptyLabel={t("follow.emptyContent")}
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {images.length > 0 ? (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold">{t("follow.images")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {images.map((image) => (
                    <a
                      key={image.id}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-lg border bg-muted/20 p-2"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-40 w-full rounded-md object-cover"
                      />
                      <p className="mt-2 text-xs text-muted-foreground group-hover:text-foreground">
                        {image.name}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-background p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold">{t("follow.addResponse")}</h3>

            <div className="grid gap-4">
              <label className="space-y-2 text-sm">
                <span className="font-medium">{t("follow.fields.type")}</span>
                <select
                  value={sectionType}
                  onChange={(event) => setSectionType(event.target.value as TicketSectionType)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {tDetail(`sectionTypes.${type}`, { default: type })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">{t("follow.fields.content")}</span>
                <textarea
                  value={sectionContent}
                  onChange={(event) => setSectionContent(event.target.value)}
                  rows={4}
                  placeholder={t("follow.placeholders.content")}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">{t("follow.fields.email")}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("follow.placeholders.email")}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium",
                  sectionSaving
                    ? "cursor-not-allowed opacity-70"
                    : "hover:bg-muted"
                )}
                onClick={() => void handleAddSection()}
                disabled={sectionSaving}
              >
                {sectionSaving ? t("follow.saving") : t("follow.submit")}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border bg-background p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold">{t("follow.addImage")}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <ImagePlus className="h-4 w-4" aria-hidden />
                <span>{t("follow.selectImage")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setImageFile(file);
                  }}
                />
              </label>
              <span className="text-xs text-muted-foreground">
                {imageFile ? imageFile.name : t("follow.noImage")}
              </span>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-2 text-xs font-medium",
                  uploading ? "cursor-not-allowed opacity-70" : "hover:bg-muted"
                )}
                onClick={() => void handleUpload()}
                disabled={uploading || !imageFile}
              >
                {uploading ? t("follow.uploading") : t("follow.upload")}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
