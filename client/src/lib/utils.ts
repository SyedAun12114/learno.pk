import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d, yyyy');
  } catch {
    return String(date).split('T')[0];
  }
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true });
  } catch {
    return '';
  }
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return minutes + 'm';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export function truncate(str: string, length = 80): string {
  return str.length <= length ? str : str.slice(0, length) + '...';
}

export const CATEGORY_COLORS: Record<string, string> = {
  study: 'bg-blue-50 text-blue-700 border-blue-200',
  assignment: 'bg-purple-50 text-purple-700 border-purple-200',
  exam: 'bg-red-50 text-red-700 border-red-200',
  skill: 'bg-green-50 text-green-700 border-green-200',
  career: 'bg-orange-50 text-orange-700 border-orange-200',
  personal: 'bg-gray-50 text-gray-700 border-gray-200',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-green-600',
};
