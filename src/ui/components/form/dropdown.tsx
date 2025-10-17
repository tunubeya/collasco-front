import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const dropdownVariants = cva(
  'block w-full rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-background text-black border border-gray-300 hover:border-gray-400 focus:border-primary-orange focus:ring-2 focus:ring-primary-orange',
        outline:
          'bg-transparent text-black border border-gray-300 hover:border-gray-400 focus:border-primary-orange focus:ring-2 focus:ring-primary-orange',
        error:
          'bg-red-50 text-red-600 border border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500'
      },
      sizeElement: {
        default: 'h-10 px-4',
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

export interface DropdownProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof dropdownVariants> {
  label?: string;
  errorMessage?: string[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}

const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>(
  (
    {
      className,
      variant,
      sizeElement,
      fullWidth,
      label,
      errorMessage,
      options,
      onChange,
      ...props
    },
    ref
  ) => {
    return (
      <div className="flex flex-col space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <select
          className={cn(
            dropdownVariants({ variant, sizeElement, fullWidth, className })
          )}
          ref={ref}
          onChange={onChange}
          {...props}
        >
          {options?.map((option) => (
            <option key={`${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Dropdown.displayName = 'Dropdown';

export { Dropdown, dropdownVariants };
