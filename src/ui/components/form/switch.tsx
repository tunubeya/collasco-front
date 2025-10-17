// components/Switch.tsx
'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const switchVariants = cva(
  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gray-200 has-checked:bg-primary-orange',
        error: 'bg-red-200 has-checked:bg-red-500'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof switchVariants> {
  label?: string;
  errorMessage?: string[];
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, variant, label, errorMessage, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1">
        <label className="inline-flex items-center space-x-2">
          <div className={cn(switchVariants({ variant, className }))}>
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              ref={ref}
              {...props}
            />
            <span className="pointer-events-none absolute left-0 top-0 h-6 w-11 rounded-full bg-transparent transition-colors" />
            <span className="pointer-events-none absolute left-[2px] top-[2px] block h-5 w-5 rounded-full bg-background shadow-lg transition-transform peer-checked:translate-x-5" />
          </div>
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
        </label>
        {errorMessage?.length &&
          errorMessage.map((error) => (
            <p key={error} className="text-xs text-red-600 mt-1">
              {error}
            </p>
          ))}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
export { Switch, switchVariants };
