'use client';
import { Button } from '@/ui/components/button';
import { cn } from '@/lib/utils';

export default function ButtonGroup({
  buttons,
  selected
}: Readonly<{
  buttons: { name: string; label: string; onClick: () => void }[];
  selected: string;
}>) {
  return (
    <div className="hidden md:flex items-center border border-gray-300 rounded-lg overflow-hidden">
      {buttons.map((button) => (
        <Button
          key={button.name}
          onClick={button.onClick}
          variant="option"
          className={cn(
            'px-4 py-2 text-sm',
            button.name === selected
              ? 'bg-purple/20 hover:bg-purple/20 text-purple-dark font-bold'
              : 'bg-background text-gray-700'
          )}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
