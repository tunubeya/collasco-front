import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'bg-background text-foreground flex h-10 px-3 py-2 text-sm border-0 read-only:bg-gray-200',
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
      sizeElement: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-12 px-5'
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto'
      }
    },
    defaultVariants: {
      variant: 'default',
      sizeElement: 'default',
      fullWidth: true
    }
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean;
  label?: string;
  description?: string;
  errorMessage?: string[];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      sizeElement,
      label,
      description,
      fullWidth,
      errorMessage,
      type,
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
        <input
          type={type}
          className={cn(
            inputVariants({ variant, sizeElement, fullWidth, className })
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
Input.displayName = 'Input';

export { Input };
