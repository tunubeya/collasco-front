"use client";

import { useEffect, useState, useMemo } from "react";

import {
  normalizeRichTextInput,
  sanitizeRichTextClient,
} from "@/lib/rich-text";

type RichTextPreviewProps = {
  value?: string | null;
  emptyLabel: string;
  className?: string;
  imageMap?: Record<string, string> | null;
};

export function RichTextPreview({
  value,
  emptyLabel,
  className,
  imageMap,
}: RichTextPreviewProps) {
  const [sanitized, setSanitized] = useState<string | null>(null);
  const hasContent = Boolean(value && value.trim().length);
  const normalized = useMemo(() => {
    if (!hasContent) return null;
    const base = normalizeRichTextInput(value);
    return imageMap ? injectImages(base, imageMap) : base;
  }, [hasContent, imageMap, value]);

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
          margin: 0;
        }
        .rich-text-preview :global(p:empty) {
          min-height: 1em;
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
        .rich-text-preview :global(img) {
          display: block;
          max-width: 100%;
          object-fit: contain;
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

function injectImages(value: string, imageMap: Record<string, string>): string {
  const hasPlaceholders = value.includes("[") && value.includes("]");
  if (!hasPlaceholders) return value;
  return value.replace(/\[([^\]]+)\]/g, (match, rawName: string) => {
    const parsed = parseImageToken(rawName);
    if (!parsed) return match;
    const url = imageMap[parsed.name] ?? imageMap[parsed.name.toLowerCase()];
    if (!url) return match;
    const escapedAlt = escapeAttribute(parsed.name);
    const widthStyle =
      typeof parsed.width === "number"
        ? `width:${Math.round(parsed.width)}px;`
        : "";
    const heightStyle =
      typeof parsed.height === "number"
        ? `height:${Math.round(parsed.height)}px;`
        : "";
    const style = `${widthStyle}${heightStyle}object-fit:cover;`;
    return `<img src="${escapeAttribute(url)}" alt="${escapedAlt}" style="${escapeAttribute(
      style
    )}" />`;
  });
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

type ImageTokenSize = {
  name: string;
  width?: number;
  height?: number;
};

function parseImageToken(raw: string): ImageTokenSize | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const [namePart, sizePart] = splitOnce(trimmed, ":");
  const name = namePart.trim();
  if (!name) return null;
  if (!sizePart) return { name };

  const size = sizePart.trim().toLowerCase();
  if (!size) return { name };

  if (size === "small" || size === "medium" || size === "big") {
    const width =
      size === "small" ? 240 : size === "medium" ? 480 : 720;
    return { name, width };
  }

  const match = size.match(/^(\d+|auto)x(\d+|auto)$/i);
  if (!match) {
    return { name };
  }
  const [, rawW, rawH] = match;
  const width = rawW.toLowerCase() === "auto" ? undefined : Number(rawW);
  const height = rawH.toLowerCase() === "auto" ? undefined : Number(rawH);
  return { name, width, height };
}

function splitOnce(value: string, delimiter: string): [string, string | null] {
  const idx = value.indexOf(delimiter);
  if (idx === -1) return [value, null];
  return [value.slice(0, idx), value.slice(idx + delimiter.length)];
}
