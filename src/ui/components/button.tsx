'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, RoutesEnum } from '@/lib/utils';

const buttonVariants = cva(
  'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary-orange text-sm font-bold rounded-xl hover:bg-primary-orange/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'rounded-xl border border-primary-orange bg-background/50 text-primary-orange font-bold hover:bg-background',
        secondary:
          'bg-secondary-background/80 text-foreground text-sm font-bold rounded-xl hover:bg-secondary-background transition border-solid border border-purple hover:border-purple-dark',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-secondary-dark-blue underline-offset-4 hover:underline transition',
        option: 'bg-background hover:bg-gray-50 border-none rounded-none',
        warning:
          'bg-purple text-white text-sm font-bold rounded-xl hover:bg-purple/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  redirect?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const router = useRouter();
    if (props.redirect) {
      const redirectionPath = props.redirect || RoutesEnum.HOME_LANDING;
      props.onClick = () => router.push(redirectionPath);
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
