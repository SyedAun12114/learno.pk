import React from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center px-4', className)}>
      {icon && (
        <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center mb-4 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-muted max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}
