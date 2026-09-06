const isDev = process.env.NODE_ENV !== 'production';
export const logger = {
  info: (...a: unknown[]): void => {
    if (isDev) {
      console.log('[INFO]', ...a);
    }
  },
  warn: (...a: unknown[]): void => {
    console.warn('[WARN]', ...a);
  },
  error: (...a: unknown[]): void => {
    console.error('[ERROR]', ...a);
  },
  debug: (...a: unknown[]): void => {
    if (isDev) {
      console.log('[DEBUG]', ...a);
    }
  },
};
