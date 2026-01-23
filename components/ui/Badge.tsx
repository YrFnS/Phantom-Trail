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
    default:
      'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
    low: 'bg-[var(--success-light)] text-[var(--success)] border-[var(--success)]/30',
    medium:
      'bg-[var(--warning-light)] text-[var(--warning)] border-[var(--warning)]/30',
    high: 'bg-[var(--warning-light)] text-[var(--warning)] border-[var(--warning)]/30',
    critical:
      'bg-[var(--error-light)] text-[var(--error)] border-[var(--error)]/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-[var(--shadow-sm)]',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
