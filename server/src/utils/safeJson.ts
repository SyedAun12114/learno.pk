// Safe JSON parser that handles:
// 1. mysql2 auto-parsed JSON columns (already arrays/objects)
// 2. Invalid JSON stored as comma-separated strings
// 3. Valid JSON strings

export function safeJsonArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'object') return [];
  if (typeof value !== 'string') return [];
  const str = (value as string).trim();
  if (!str) return [];
  // Try JSON parse first
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // fall through
    }
  }
  // Fall back to comma-separated
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export function safeJsonObject<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return fallback;
  }
}
