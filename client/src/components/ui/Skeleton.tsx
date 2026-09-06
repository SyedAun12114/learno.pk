import React from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className, count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('animate-pulse bg-surface rounded-xl', className)} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
