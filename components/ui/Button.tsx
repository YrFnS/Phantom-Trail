import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary:
        'bg-hud text-terminal border border-plasma/30 hover:border-plasma hover:shadow-[0_0_15px_rgba(188,19,254,0.4)] focus-visible:ring-plasma transition-all',
      secondary:
        'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600 focus-visible:ring-accent-cyan',
      ghost:
        'text-gray-400 hover:bg-dark-700 hover:text-gray-200 focus-visible:ring-primary-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-6 text-base',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
