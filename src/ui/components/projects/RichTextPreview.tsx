"use client";

import { useEffect, useState, useMemo} from "react";

import {
  normalizeRichTextInput,
  sanitizeRichTextClient,
} from "@/lib/rich-text";

type RichTextPreviewProps = {
  value?: string | null;
  emptyLabel: string;
  className?: string;
};

export function RichTextPreview({
  value,
  emptyLabel,
  className,
}: RichTextPreviewProps) {
  const [sanitized, setSanitized] = useState<string | null>(null);
  const hasContent = Boolean(value && value.trim().length);
  const normalized = useMemo(
    () => (hasContent ? normalizeRichTextInput(value) : null),
    [hasContent, value]
  );

  useEffect(() => {
    if (!normalized) {
      setSanitized(null);
      return;
    }
    const clean = sanitizeRichTextClient(normalized);
    setSanitized(clean.trim().length ? clean : null);
  }, [normalized]);

  const htmlToRender = sanitized ?? normalized;
  const fallbackText = hasContent ? stripTags(value ?? "") : emptyLabel;

  return (
    <div className={cn("rich-text-preview space-y-2", className)}>
      {htmlToRender ? (
        <div
          className="text-sm leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: htmlToRender }}
        />
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {fallbackText}
        </p>
      )}
      <style jsx>{`
        .rich-text-preview :global(p) {
          margin: 0 0 0.5rem;
          white-space: pre-wrap;
        }
        .rich-text-preview :global(ul) {
          list-style: disc;
          margin: 0 0 0.5rem;
          padding-left: 1.25rem;
        }
        .rich-text-preview :global(ol) {
          list-style: decimal;
          margin: 0 0 0.5rem;
          padding-left: 1.25rem;
        }
        .rich-text-preview :global(li) {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}
