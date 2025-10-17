'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const radioVariants = cva(
  'h-5 w-5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-background checked:bg-primary-orange text-primary-orange border-gray-300 hover:border-gray-400 focus:ring-primary-orange',
        error:
          'bg-red-50 text-red-600 border-red-300 focus:ring-red-500',
      }
    },
    defaultVariants: {
      variant: 'default',
    }
  }
);

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps extends VariantProps<typeof radioVariants> {
  name: string;
  options: RadioOption[];
  label?: string;
  errorMessage?: string;
  horizontal?: boolean;
  onChange?: (value: string) => void;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  label,
  errorMessage,
  variant,
  horizontal,
  onChange
}) => {
  return (
    <div className="flex flex-col space-y-4">
      {label && <label className="text-base">{label}</label>}
      <div className={cn("flex", {
        "flex-row space-x-8": horizontal,
        "flex-col space-y-2": !horizontal
      })}>
        {options.map((option, index) => (
          <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              className={cn(radioVariants({ variant }))}
              onChange={(e) => onChange?.(e.target.value)}
              defaultChecked={index === 0} // Select the first option by default
            />
            <span className="text-sm text-gray-800">{option.label}</span>
          </label>
        ))}
      </div>
      {errorMessage && <p className="text-xs text-red-600 mt-1">{errorMessage}</p>}
    </div>
  );
};

export { RadioGroup, radioVariants };
