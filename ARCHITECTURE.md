# Learno Architecture

## Structure

client/   - React frontend (Vite)
server/   - Express backend (Node.js)
shared/   - Shared TypeScript types

## Build

Development: Vite dev server (5173) + Express (3001), proxied.
Production:  Express serves Vite build from dist/public/.

## Authentication

express-session with custom MySQL session store.
HttpOnly cookies. Secure flag in production.
Sessions stored in user_sessions table.

## AI Provider

Provider pattern. Swap via AI_PROVIDER env var.
Default: AnthropicProvider (claude-3-5-haiku-20241022).
Daily request limits via AI_DAILY_LIMIT env var.

## Database

Plain mysql2 with parameterized queries.
SQL migrations in server/src/db/migrations/.
No ORM for maximum transparency and control.
