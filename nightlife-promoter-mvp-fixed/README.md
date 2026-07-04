# Nightlife Promoter MVP

All-in-one promotional platform MVP for nightlife, hospitality, promoters, DJs, venues, and event brands.

## Features

- Dashboard for events, campaigns, contacts, revenue estimates
- Event creation and management
- Contact/guest CRM
- Campaign builder for Instagram/Facebook/Eventbrite/Posh.vip workflows
- Integration connection screen
- Backend REST API
- Supabase/Postgres-ready Prisma schema
- OAuth-ready integration placeholders
- Safe marketing architecture with opt-in contacts, unsubscribe fields, and rate-limit hooks

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Express, TypeScript, Prisma
- Database: PostgreSQL / Supabase
- Deployment: Vercel frontend, Render/Railway backend, Supabase database

## Quick Start

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs on http://localhost:3000
Backend runs on http://localhost:4000

## Deployment

1. Push this folder to GitHub.
2. Create Supabase project and copy the database URL.
3. Deploy backend to Render or Railway.
4. Deploy frontend to Vercel.
5. Add env vars from `.env.example` files.
6. Set `NEXT_PUBLIC_API_URL` to your backend URL.

## Integration Notes

- Facebook/Instagram: use Meta Graph API OAuth and approved permissions.
- Eventbrite: use OAuth/token API for events/orders.
- Posh.vip: use available official API/webhooks if provided by account access. If no public API is available, use CSV import/export or webhook middleware instead.

