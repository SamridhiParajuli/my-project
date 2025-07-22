// Path: src/components/ui/Button.tsx
import React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'link' | 'gold' | 'destructive' | 'muted';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const getVariantClasses = (variant: ButtonVariant): string => {
      switch (variant) {
        case 'default':
          return 'bg-primary text-secondary hover:bg-primary-light';
        case 'secondary':
          return 'bg-secondary text-primary hover:bg-secondary-dark';
        case 'outline':
          return 'border border-primary text-primary hover:bg-secondary/30';
        case 'ghost':
          return 'hover:bg-secondary/30 text-primary-light';
        case 'accent':
          return 'bg-accent text-white hover:bg-accent-dark';
        case 'link':
          return 'underline-offset-4 hover:underline text-accent';
        case 'gold':
          return 'bg-gradient-to-r from-accent-light to-accent border border-accent-dark text-primary-dark hover:shadow-md hover:from-accent hover:to-accent-light';
        case 'destructive':
          return 'bg-red-600 text-white hover:bg-red-700';
        case 'muted':
          return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        default:
          return 'bg-primary text-secondary hover:bg-primary-light';
      }
    };

    const getSizeClasses = (size: ButtonSize): string => {
      switch (size) {
        case 'default':
          return 'h-10 py-2 px-4';
        case 'sm':
          return 'h-9 px-3 rounded-sm';
        case 'lg':
          return 'h-11 px-8 rounded-sm';
        case 'icon':
          return 'h-10 w-10';
        default:
          return 'h-10 py-2 px-4';
      }
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none tracking-wide',
          getVariantClasses(variant),
          getSizeClasses(size),
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };

// For backwards compatibility with components using default import
export default Button;