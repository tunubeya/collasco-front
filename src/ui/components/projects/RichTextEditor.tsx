"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, List, ListOrdered, UnderlineIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeRichTextInput } from "@/lib/rich-text";

type ToolbarLabels = {
  bold: string;
  italic: string;
  underline: string;
  bulletList: string;
  orderedList: string;
  clear: string;
};

type RichTextEditorProps = {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string | null;
  helperText?: string;
  labels: ToolbarLabels;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
};

export function RichTextEditor({
  name,
  label,
  placeholder,
  defaultValue,
  helperText,
  labels,
  onValueChange,
  disabled = false,
  hideLabel = false,
}: RichTextEditorProps) {
  const normalized = useMemo(
    () => normalizeRichTextInput(defaultValue),
    [defaultValue]
  );
  const [currentValue, setCurrentValue] = useState<string>(normalized);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        heading: false,
        hardBreak: {
          keepMarks: true,
        },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
    ],
    content: normalized || "<p></p>",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "editor-content min-h-[160px] cursor-text py-2 text-sm leading-relaxed outline-none",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          view.dispatch(view.state.tr.insertText("    "));
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      const text = editor.getText().trim();
      const html = editor.getHTML();
      setCurrentValue(text.length ? html : "");
    },
  });

  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = currentValue ?? "";
    }
  }, [currentValue]);

  useEffect(() => {
    onValueChange?.(currentValue ?? "");
  }, [currentValue, onValueChange]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(normalized || "<p></p>");
    setCurrentValue(normalized);
  }, [normalized, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const controls = [
    {
      icon: Bold,
      action: () => editor?.chain().focus().toggleBold().run(),
      isActive: () => editor?.isActive("bold"),
      label: labels.bold,
    },
    {
      icon: Italic,
      action: () => editor?.chain().focus().toggleItalic().run(),
      isActive: () => editor?.isActive("italic"),
      label: labels.italic,
    },
    {
      icon: UnderlineIcon,
      action: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: () => editor?.isActive("underline"),
      label: labels.underline,
    },
    {
      icon: List,
      action: () => editor?.chain().focus().toggleBulletList().run(),
      isActive: () => editor?.isActive("bulletList"),
      label: labels.bulletList,
    },
    {
      icon: ListOrdered,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
      isActive: () => editor?.isActive("orderedList"),
      label: labels.orderedList,
    },
  ];

  const clearFormatting = () => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <label htmlFor={`${name}-editor`} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input ref={hiddenInputRef} type="hidden" name={name} defaultValue={currentValue} />
      <div className="rounded-lg border bg-background focus-within:ring-2 focus-within:ring-primary">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          {controls.map(({ icon: Icon, action, isActive, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => action()}
              disabled={!editor || disabled}
              className={cn(
                "rounded border px-2 py-1 text-xs transition",
                isActive?.()
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50"
              )}
              aria-label={label}
              title={label}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFormatting}
            disabled={!editor || disabled}
            aria-label={labels.clear}
            title={labels.clear}
            className="rounded border px-2 py-1 text-xs text-muted-foreground transition hover:border-border hover:bg-muted/50 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="rich-text-content px-3" aria-live="polite">
          <EditorContent
            id={`${name}-editor`}
            editor={editor}
            className="min-h-[160px] py-2 text-sm leading-relaxed focus:outline-none"
            aria-disabled={disabled}
          />
          {!editor && (
            <p className="py-2 text-sm text-muted-foreground">{placeholder}</p>
          )}
        </div>
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      <style jsx>{`
        .rich-text-content :global(ul) {
          list-style: disc;
          margin: 0 0 0.5rem;
          padding-left: 1.25rem;
        }
        .rich-text-content :global(ol) {
          list-style: decimal;
          margin: 0 0 0.5rem;
          padding-left: 1.25rem;
        }
        .rich-text-content :global(li) {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
