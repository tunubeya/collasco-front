"use client";

export function normalizeRichTextInput(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) {
    return trimmed;
  }
  return wrapPlainText(trimmed);
}

export function looksLikeHtml(value: string): boolean {
  return /<[^>]+>/.test(value);
}

export function wrapPlainText(value: string): string {
  const escaped = escapeHtml(value);
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
}

export function escapeHtml(value: string): string {
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

export function sanitizeRichTextClient(value: string): string {
  if (typeof window === "undefined") return value;
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  const body = doc.body ?? document.createElement("body");
  if (!doc.body) {
    body.innerHTML = value;
  }
  const allowedTags = new Set([
    "p",
    "br",
    "strong",
    "em",
    "u",
    "ul",
    "ol",
    "li",
  ]);

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (!allowedTags.has(element.tagName.toLowerCase())) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        return;
      }
      while (element.attributes.length > 0) {
        element.removeAttribute(element.attributes[0].name);
      }
    } else if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    let child = node.firstChild;
    while (child) {
      const next = child.nextSibling;
      walk(child);
      child = next;
    }
  };

  walk(body);
  const paragraphs = Array.from(body.querySelectorAll("p"));
  paragraphs.forEach((paragraph) => {
    normalizeParagraph(paragraph);
  });
  return body.innerHTML ?? "";
}

function normalizeParagraph(paragraph: HTMLElement) {
  if (!paragraph.textContent || !paragraph.textContent.trim()) {
    paragraph.textContent = "";
    return;
  }
  preserveLeadingIndentation(paragraph);
}

function preserveLeadingIndentation(paragraph: HTMLElement) {
  let atLineStart = true;
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? "";
      if (atLineStart) {
        node.textContent = convertLeadingWhitespace(value);
      }
      if (/\S/.test(value)) {
        atLineStart = false;
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName.toLowerCase() === "br") {
        atLineStart = true;
        return;
      }
      Array.from(element.childNodes).forEach((child) => visit(child));
    }
  };

  Array.from(paragraph.childNodes).forEach((node) => visit(node));
}

function convertLeadingWhitespace(value: string): string {
  if (!value) return value;
  const match = value.match(/^([\r\n]*)([ \t]+)/);
  if (!match) {
    return value;
  }
  const [, breaks = "", spaces = ""] = match;
  const nbsp = spaces
    .split("")
    .map((char) => (char === "\t" ? "\u00a0".repeat(4) : "\u00a0"))
    .join("");
  return `${breaks}${nbsp}${value.slice(match[0].length)}`;
}
