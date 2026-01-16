import React from 'react';
import { cn } from '../../lib/utils/cn';
import type { RiskLevel } from '../../lib/types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: RiskLevel | 'default';
  children: React.ReactNode;
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-dark-700 text-gray-300 border-dark-600',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
