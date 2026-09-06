import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'success';
  showLabel?: boolean;
  className?: string;
}

export function Progress({ value, max = 100, size = 'md', variant = 'default', showLabel, className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const sizes = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  const variants = { default: 'bg-primary', accent: 'bg-accent', success: 'bg-green-500' };
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted">
          <span>Progress</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-surface rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', variants[variant])}
          style={{ width: pct + '%' }}
        />
      </div>
    </div>
  );
}
