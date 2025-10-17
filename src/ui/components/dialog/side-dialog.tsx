'use client';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogConfirm
} from '@/ui/components/dialog/dialog';
import React from 'react';

export default function SideDialog({
  trigger,
  closeTrigger,
  content,
  confirmLabel = 'Eliminar',
  onConfirm
}: Readonly<{
  trigger: React.ReactNode;
  content: React.ReactNode;
  closeTrigger?: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<boolean>;
}>) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="bg-background rounded-xl p-6 space-y-2 min-w-[300px] h-full overflow-y-auto flex flex-col justify-between"
        layoutClassName="bg-black/60 grid place-items-end h-full backdrop-blur-sm"
        type="side"
      >
        <div className="flex flex-col items-end">
          <DialogClose asChild>{closeTrigger}</DialogClose>
          {content}
        </div>
        <div className="flex justify-end">
          <DialogConfirm onConfirm={onConfirm}>{confirmLabel}</DialogConfirm>
        </div>
      </DialogContent>
    </Dialog>
  );
}
