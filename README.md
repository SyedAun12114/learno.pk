# Learno

AI-powered path from learning to earning.

## Quick Start

    npm install
    cp .env.example .env
    # Edit .env with your credentials
    npm run migrate
    npm run seed
    npm run dev

## Scripts

| Command           | Description          |
|-------------------|----------------------|
| npm run dev       | Start development    |
| npm run build     | Build for production |
| npm start         | Start prod server    |
| npm run migrate   | Run DB migrations    |
| npm run seed      | Seed demo data       |

## Demo Credentials

After running npm run seed:
- Admin:   admin@learno.pk  /  Admin@12345
- Student: demo@learno.pk   /  Student@12345

## Switching AI Model

Change ANTHROPIC_MODEL in .env:
- Fast:    claude-3-5-haiku-20241022
- Better:  claude-3-5-sonnet-20241022
