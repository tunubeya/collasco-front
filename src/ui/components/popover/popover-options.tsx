'use client';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/ui/components/popover/popover';

export default function PopoverOptions({
  children,
  trigger
}: Readonly<{
  children: React.ReactNode;
  trigger: React.ReactNode;
}>) {
  return (
      <Popover placement="bottom-end">
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="bg-background shadow-lg rounded flex flex-col gap-1 p-2 text-sm">
          {children}
        </PopoverContent>
      </Popover>
  );
}
