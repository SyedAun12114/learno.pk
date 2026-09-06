import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, variant = 'default', padding = 'md', className, ...props }: CardProps) {
  const variants = { default: 'bg-card border border-border', surface: 'bg-surface border border-border' };
  const pads = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div className={cn('rounded-2xl', variants[variant], pads[padding], className)} {...props}>
      {children}
    </div>
  );
}
