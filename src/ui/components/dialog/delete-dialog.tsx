'use client';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogClose,
  DialogConfirm
} from '@/ui/components/dialog/dialog';
import { Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function DeleteDialog({
  triggerLabel,
  dialogTitle,
  dialogDescription,
  warningInfo,
  closeLabel,
  confirmLabel,
  onConfirm
}: Readonly<{
  triggerLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  warningInfo?: string;
  closeLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}>) {
  const t = useTranslations('ui.dialog.delete');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full flex items-center text-start p-1 hover:bg-background focus:outline-none cursor-pointer text-red-400 hover:text-red-500">
          <Trash size={14} className="mr-2" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-background rounded-xl p-6 m-4 space-y-8">
        <DialogHeading className="text-xl font-bold">
          {dialogTitle}
        </DialogHeading>
        <DialogDescription>
          <span className="text-sm">{dialogDescription}</span>
          {warningInfo && (
            <>
              <br />
              <span className="text-purple-dark bg-purple/20 font-bold text-sm mt-2">
                {warningInfo}
              </span>
            </>
          )}
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <DialogClose>{closeLabel ?? t('cancel')}</DialogClose>
          <DialogConfirm
            className="bg-red-600 hover:bg-red-600/80"
            onConfirm={onConfirm}
          >
            {confirmLabel ?? t('delete')}
          </DialogConfirm>
        </div>
      </DialogContent>
    </Dialog>
  );
}