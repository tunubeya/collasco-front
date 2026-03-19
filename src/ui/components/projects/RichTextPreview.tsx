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
  imageMap?: Record<string, string | { url: string; mimeType?: string | null }> | null;
  fileOpenLabel?: string;
};

export function RichTextPreview({
  value,
  emptyLabel,
  className,
  imageMap,
  fileOpenLabel,
}: RichTextPreviewProps) {
  const [sanitized, setSanitized] = useState<string | null>(null);
  const hasContent = Boolean(value && value.trim().length);
  const normalized = useMemo(() => {
    if (!hasContent) return null;
    const base = normalizeRichTextInput(value);
    const withLinks = autolinkUrls(base);
    return imageMap ? injectImages(withLinks, imageMap, fileOpenLabel) : withLinks;
  }, [fileOpenLabel, hasContent, imageMap, value]);

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
          display: inline-block;
          max-width: 100%;
          object-fit: contain;
          vertical-align: middle;
        }
        .rich-text-preview :global(.attachment-chip) {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid hsl(var(--border));
          border-radius: 999px;
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
          color: hsl(var(--foreground));
          background: #d6d6d7;
          text-decoration: none;
          box-shadow: 0 1px 0 hsl(var(--border) / 0.6);
        }
        .rich-text-preview :global(.attachment-chip:hover) {
          background: #d6d6d7;
        }
        .rich-text-preview :global(.attachment-chip svg) {
          width: 14px;
          height: 14px;
          flex: 0 0 auto;
        }
        .rich-text-preview :global(.attachment-chip .attachment-name) {
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rich-text-preview :global(.attachment-chip .attachment-open) {
          font-weight: 600;
          color: hsl(var(--primary));
        }
        .rich-text-preview :global(a) {
          color: inherit;
          text-decoration: underline;
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

function injectImages(
  value: string,
  imageMap: Record<string, string | { url: string; mimeType?: string | null }>,
  fileOpenLabel?: string
): string {
  const hasPlaceholders = value.includes("[") && value.includes("]");
  if (!hasPlaceholders) return value;
  return value.replace(/\[([^\]]+)\]/g, (match, rawName: string) => {
    const parsed = parseImageToken(rawName);
    if (!parsed) return match;
    const resolved =
      imageMap[parsed.name] ?? imageMap[parsed.name.toLowerCase()];
    if (!resolved) return match;
    const resolvedUrl = typeof resolved === "string" ? resolved : resolved.url;
    const resolvedMime =
      typeof resolved === "string" ? "image/*" : resolved.mimeType ?? "";
    const isImage = resolvedMime.toLowerCase().startsWith("image/");

    if (!isImage) {
      return buildAttachmentChip(parsed.name, resolvedUrl, fileOpenLabel);
    }

    const escapedAlt = escapeAttribute(parsed.name);
    const widthStyle =
      typeof parsed.width === "number"
        ? `width:${Math.round(parsed.width)}px;`
        : "";
    const heightStyle =
      typeof parsed.height === "number"
        ? `height:${Math.round(parsed.height)}px;`
        : "";
    const style = `${widthStyle}${heightStyle}object-fit:contain;`;
    return `<img src="${escapeAttribute(resolvedUrl)}" alt="${escapedAlt}" style="${escapeAttribute(
      style
    )}" />`;
  });
}

function buildAttachmentChip(name: string, url: string, openLabel?: string): string {
  const label = openLabel?.trim() ? openLabel.trim() : "";
  const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5L14.5 2Z"/><path d="M14 2v6h6"/></svg>`;
  const openSpan = label
    ? `<span class="attachment-open">${escapeAttribute(label)}</span>`
    : "";
  return `<a class="attachment-chip" href="${escapeAttribute(
    url
  )}" target="_blank" rel="noreferrer">${icon}<span class="attachment-name">${escapeAttribute(
    name
  )}</span>${openSpan}</a>`;
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

function autolinkUrls(value: string): string {
  const urlPattern = /\bhttps?:\/\/[^\s<]+/gi;
  return value.replace(urlPattern, (raw) => {
    const match = raw.match(/^(.*?)([),.;:!?]+)?$/);
    const href = match?.[1] ?? raw;
    const trailing = match?.[2] ?? "";
    return `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeAttribute(
      href
    )}</a>${escapeAttribute(trailing)}`;
  });
}
