'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const checkboxVariants = cva(
  'h-5 w-5 rounded-sm border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-background checked:bg-primary-orange border-gray-300 hover:border-gray-400 focus:ring-primary-orange',
        error: 'bg-red-50 text-red-600 border-red-300 focus:ring-red-500'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  errorMessage?: string[];
  setIsChecked: React.Dispatch<React.SetStateAction<boolean>>;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, variant, label, errorMessage, setIsChecked, ...props },
    ref
  ) => {
    const handleCheckboxChange = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      setIsChecked(event.target.checked);
    };
    return (
      <div className="flex items-start space-x-2">
        <input
          id={label}
          type="checkbox"
          checked={props.checked}
          onChange={handleCheckboxChange}
          className={cn(checkboxVariants({ variant, className }))}
          ref={ref}
          {...props}
        />
        {label && (
          <label
            htmlFor={label}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
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

Checkbox.displayName = 'Checkbox';

export { Checkbox, checkboxVariants };
