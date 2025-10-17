'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Paragraph from '@tiptap/extension-paragraph';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { cn } from '@/lib/utils';

interface RichTextContentProps {
  content: string;
  className?: string;
}

export function RichTextContent({
  content,
  className
}: Readonly<RichTextContentProps>) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Paragraph,
      BulletList,
      OrderedList,
      ListItem
    ],
    content,
    editable: false
  });

  if (!editor) return null;

  const listEditorStyles = ` **:[ul]:list-disc **:[ul]:list-inside  **:[ol]:list-decimal **:[ol]:list-inside **:[ol]:**:[p]:inline **:[ul]:**:[p]:inline`;
  const titlesEditorStyles = ` **:[h1]:text-2xl **:[h2]:text-xl`;

  return (
    <EditorContent
      editor={editor}
      className={cn(listEditorStyles, titlesEditorStyles, className ?? '')}
    />
  );
}
