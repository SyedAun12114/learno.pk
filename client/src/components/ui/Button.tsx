import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children, variant = 'primary', size = 'md', isLoading,
  leftIcon, rightIcon, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants = {
    primary: 'bg-primary text-background hover:bg-primary/90 focus:ring-primary/40',
    secondary: 'bg-surface text-primary border border-border hover:bg-border focus:ring-primary/20',
    ghost: 'text-primary hover:bg-surface focus:ring-primary/20',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus:ring-red-300',
    accent: 'bg-accent text-primary hover:bg-accent/90 focus:ring-accent/40',
  };
  const sizes = { sm: 'text-sm px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-6 py-3' };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
