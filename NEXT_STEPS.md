# Getting Started with Learno

## Local Setup

1. Install dependencies:
   npm install

2. Copy environment file:
   cp .env.example .env

3. Edit .env - add MySQL credentials and Anthropic API key.

4. Create MySQL database:
   CREATE DATABASE learno_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

5. Run migrations:
   npm run migrate

6. Seed demo data (optional):
   npm run seed

7. Start development:
   npm run dev

   Frontend: http://localhost:5173
   API:      http://localhost:3001

## Hostinger Deployment

1. Create MySQL database in Hostinger hPanel.
2. Push project to GitHub.
3. Create Node.js app in Hostinger hPanel.
4. Build command:  npm install && npm run build
5. Start command:  node dist/server/index.js
6. Add all variables from .env.example.
7. Run via terminal: npm run migrate && npm run seed
8. Enable SSL in hPanel.

## Generate Session Secret

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
