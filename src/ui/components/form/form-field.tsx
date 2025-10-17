'use client';
import * as React from 'react';
import { Input, InputProps } from '@/ui/components/form/input';
import { Checkbox, CheckboxProps } from '@/ui/components/form/checkbox';
import { Dropdown, DropdownProps } from '@/ui/components/form/dropdown';
import { PriceInput, PriceInputProps } from '@/ui/components/form/input-price';
import { Switch, SwitchProps } from '@/ui/components/form/switch';

interface BaseFieldProps {
  label?: string;
  errorMessage?: string[];
}

type FormFieldProps = BaseFieldProps &
  (
    | ({ type: string } & InputProps)
    | ({ type: string } & PriceInputProps)
    | ({ type: string } & CheckboxProps)
    | ({ type: string } & DropdownProps)
    | ({ type: 'switch' } & SwitchProps)
  );

const FormField: React.FC<FormFieldProps> = ({
  type,
  label,
  errorMessage,
  ...props
}) => {
  const commonProps = { label, errorMessage };

  switch (type) {
    case 'checkbox':
      return <Checkbox {...commonProps} {...(props as CheckboxProps)} />;
    case 'dropdown':
      return <Dropdown {...commonProps} {...(props as DropdownProps)} />;
    case 'price':
      return <PriceInput {...commonProps} {...(props as PriceInputProps)} />;
    case 'switch':
      return <Switch {...commonProps} checked={props.defaultValue === 'true'} {...(props as SwitchProps)} />;
    default:
      return <Input type={type} {...commonProps} {...(props as InputProps)} />;
  }
};

export { FormField };
