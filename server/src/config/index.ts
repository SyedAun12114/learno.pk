import 'dotenv/config';

function opt(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  env: opt('NODE_ENV', 'development'),
  port: parseInt(opt('PORT', '3001'), 10),
  appUrl: opt('APP_URL', 'http://localhost:3001'),
  isProduction: process.env.NODE_ENV === 'production',
  db: {
    host: opt('DATABASE_HOST', 'localhost'),
    port: parseInt(opt('DATABASE_PORT', '3306'), 10),
    name: opt('DATABASE_NAME', 'learno_db'),
    user: opt('DATABASE_USER', 'root'),
    password: opt('DATABASE_PASSWORD', ''),
  },
  session: {
    secret: opt('SESSION_SECRET', 'learno-dev-secret-change-in-production'),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  ai: {
    provider: opt('AI_PROVIDER', 'anthropic'),
    anthropicKey: opt('ANTHROPIC_API_KEY', ''),
    anthropicModel: opt('ANTHROPIC_MODEL', 'claude-3-5-haiku-20241022'),
    dailyLimit: parseInt(opt('AI_DAILY_LIMIT', '50'), 10),
    maxTokens: parseInt(opt('AI_MAX_TOKENS', '1024'), 10),
  },
} as const;
