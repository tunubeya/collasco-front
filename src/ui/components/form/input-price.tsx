import * as React from 'react';
import { Input, InputProps } from '@/ui/components/form/input';
import {
  formatPriceStringToFloatString,
  formatAsCurrency,
  parseCurrencyValue
} from '@/lib/utils';

export interface PriceInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value: string;
  onChange: (value: string, rawValue: number | null) => void;
  currency?: string;
  locale?: string;
  allowNegative?: boolean;
  precision?: number;
  placeholder?: string;
  min?: number;
  max?: number;
}

const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  (
    {
      value,
      onChange,
      currency = 'BOB',
      locale = 'en-US',
      allowNegative = false,
      precision = 2,
      placeholder = '0.00',
      min,
      max,
      ...props
    },
    ref
  ) => {
    // Format a number as currency string
    const _formatAsCurrency = (value: number): string => {
      return formatAsCurrency(value, locale, currency, precision);
    };

    // State to track if input is focused
    const [isFocused, setIsFocused] = React.useState(false);

    // Format displayed value based on focus state
    const displayValue = React.useMemo(() => {
      // When empty or null, show empty string
      if (value === '' || value === null) {
        return '';
      }

      const numValue = typeof value === 'string' ? parseFloat(value) : value;

      // When focused, show the raw number
      if (isFocused) {
        return isNaN(numValue) ? '' : formatPriceStringToFloatString(value);
      }

      // When not focused, show formatted currency
      return isNaN(numValue) ? '' : _formatAsCurrency(numValue);
    }, [value, isFocused, precision, currency, locale, _formatAsCurrency]);

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = formatPriceStringToFloatString(e.target.value);
      const numberValue = parseCurrencyValue(
        inputValue,
        allowNegative,
        min,
        max
      );

      // Pass both string and parsed number to parent
      onChange(inputValue, numberValue);
    };

    // Handle focus events
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        ref={ref}
      />
    );
  }
);

PriceInput.displayName = 'PriceInput';

export { PriceInput };
