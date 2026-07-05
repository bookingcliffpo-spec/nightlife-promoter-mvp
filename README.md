# Nightlife Promoter AI

A full-stack SaaS for nightlife promoters, venues, and event brands: events & flyers, guest CRM, email/SMS
campaigns, an AI content studio, QR code check-in, analytics, and Stripe subscription billing.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui-style components, Framer Motion, Recharts |
| Backend | Express.js, Node 20, TypeScript |
| Database | Supabase Postgres via Prisma ORM |
| Auth | Supabase Auth (email/password + Google OAuth), JWT verified server-side |
| Storage | Supabase Storage (event flyers) |
| Email | Resend |
| SMS | Twilio |
| Maps | Google Maps Embed API (venue map on event detail) |
| Billing | Stripe Checkout + Billing Portal + webhooks |
| AI | OpenAI (captions, hashtags, ad copy, event descriptions) |
| Hosting | Vercel (frontend), Render (backend), Supabase (database/storage/auth) |

## Features implemented

- **Auth & multi-tenant orgs** — Supabase email/password + Google login. Every user belongs to an
  `Organization`; a new org is auto-provisioned on first login.
- **Events** — CRUD, venues, capacity, cover charge, ticket URL, status (draft/published/cancelled/completed).
- **Flyers** — image upload straight to Supabase Storage, gallery per event.
- **Guest lists & RSVP** — public RSVP page per event (`/rsvp/[slug]`), manual guest list management, unique
  QR code per guest.
- **Door / check-in** — camera-based QR scanner (or manual code entry) that checks guests in against the
  guest list in real time, with a live attendance counter.
- **Contacts / CRM** — unlimited contacts, CSV import/export, tags, VIP levels, birthday field, notes,
  custom fields (JSON), opt-in/opt-out tracking per channel.
- **Campaigns** — email (Resend) and SMS (Twilio) campaigns targeted by tag, with per-recipient delivery
  status and an unsubscribe flow.
- **AI Studio** — caption, hashtag, ad copy, and event description generators powered by OpenAI, with a
  generation history log.
- **Analytics** — revenue (actual vs. projected), attendance (RSVP vs. checked-in), and campaign delivery
  reports, all backed by real data (no mock numbers).
- **Billing** — Stripe Checkout for Free/Pro/Elite tiers, a Billing Portal link, and a webhook handler that
  keeps each organization's plan/subscription status in sync.
- **Security** — Helmet, CORS restricted to the frontend origin, per-route rate limiting, Zod validation on
  every input, Supabase JWT verification on every authenticated route, and Stripe webhook signature
  verification.

## Roadmap / explicitly out of scope for this build

The initial request also asked for social media OAuth scheduling (Facebook/Instagram/TikTok/X/LinkedIn/
Threads/Eventbrite/Posh.vip), a POS system with bottle inventory, door hardware integrations, a full
staff/shift manager, invoicing, and multi-LLM (Claude/Gemini) support. Building those to real, working
depth was out of scope for this pass — they are not stubbed or faked anywhere in this codebase. If you want
one of them built next, it should be scoped as its own follow-up rather than bolted on as a placeholder.

## Monorepo layout

```
backend/    Express API, Prisma schema, seed script
frontend/   Next.js app (App Router)
render.yaml           Render blueprint for the backend
docker-compose.yml     Local Postgres + backend + frontend
.github/workflows/ci.yml   Lint + build both packages, validate Prisma schema
install.sh             One-command local setup
DEPLOYMENT.md           Step-by-step production deployment guide
```

## Local development

The fastest path is the installer:

```bash
./install.sh
```

It copies the `.env.example` files, installs dependencies for both packages, optionally starts a local
Postgres via Docker Compose, runs Prisma migrations, and optionally seeds demo data.

### Manual setup

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in Supabase/Stripe/Resend/Twilio/OpenAI keys
npm install
npx prisma migrate dev --name init
npm run prisma:seed         # optional demo data
npm run dev                 # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env.local  # fill in NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
npm install
npm run dev                 # http://localhost:3000
```

You need a Supabase project even for local development (Auth + Storage are always cloud-hosted); only
Postgres itself can run locally via Docker Compose if you don't want to point at Supabase's database yet.

Demo login after seeding: `demo@nightlifepromoter.ai` / `NightlifeDemo123!` (override via
`SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD` in `backend/.env`).

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step guide (Supabase → Render → Vercel → Stripe).

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the complete list. At minimum you need:

- A Supabase project (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`) with a public Storage bucket named `flyers` and Google OAuth enabled
  under Authentication → Providers.
- `DATABASE_URL` / `DIRECT_URL` pointing at that Supabase Postgres instance.
- Everything else (OpenAI, Resend, Twilio, Stripe, Google Maps) is optional — the corresponding feature
  returns a clear `503`/error instead of failing silently when its key is missing.

## Docker Compose (local Postgres only)

```bash
docker compose up -d postgres
```

`docker compose up` (all services) also works once `backend/.env` and `frontend/.env.local` exist, but for
day-to-day development `npm run dev` in each package (with hot reload) is faster than rebuilding containers.
