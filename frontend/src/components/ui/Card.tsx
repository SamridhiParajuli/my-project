// Path: src/components/ui/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised' | 'floating';
  variant?: 'default' | 'bordered' | 'accent';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = 'flat', variant = 'default', ...props }, ref) => {
    const elevationClasses = {
      flat: '',
      raised: 'shadow-md',
      floating: 'shadow-lg',
    };

    const variantClasses = {
      default: 'bg-white',
      bordered: 'border border-gray-200 bg-white',
      accent: 'border-l-4 border-l-accent bg-white',
    };

    return (
      <div
        className={cn(
          'rounded-md p-6 transition-all duration-200',
          elevationClasses[elevation],
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-sans text-xl font-semibold tracking-tight leading-none text-primary',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-gray-200', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// This is for backwards compatibility
const CardBody = CardContent;

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardBody };