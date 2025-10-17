import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textareaVariants = cva(
  'bg-background text-foreground flex px-3 py-2 text-sm border-0 read-only:bg-gray-200',
  {
    variants: {
      variant: {
        default:
          'rounded-md border-2 border-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-dark/50 disabled:cursor-not-allowed disabled:opacity-50',
        outline: '',
        subtle: '',
        error:
          'bg-red-50 text-red-600 border border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500'
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto'
      }
    },
    defaultVariants: {
      variant: 'default',
      fullWidth: true
    }
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  asChild?: boolean;
  label?: string;
  description?: string;
  errorMessage?: string[];
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      label,
      description,
      fullWidth,
      errorMessage,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn('flex flex-col space-y-2', fullWidth ? ' w-full' : '')}
      >
        {label && <label className="text-base">{label}</label>}
        {description && (
          <label className="text-base text-text-secondary">{description}</label>
        )}
        <textarea
          className={cn(
            textareaVariants({ variant, fullWidth, className }),
            'min-h-[80px]'
          )}
          ref={ref}
          {...props}
        />
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
Textarea.displayName = 'Textarea';

export { Textarea };
