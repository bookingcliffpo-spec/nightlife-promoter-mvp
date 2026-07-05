#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Nightlife Promoter AI — local installer"
echo "========================================"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install it from https://nodejs.org and re-run this script."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20+ is required (found $(node -v))."
  exit 1
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from .env.example — fill in your Supabase/Stripe/Resend/Twilio/OpenAI keys."
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "Created frontend/.env.local from .env.example — fill in NEXT_PUBLIC_SUPABASE_URL / ANON_KEY."
fi

echo ""
echo "Installing backend dependencies…"
(cd backend && npm install)

echo ""
echo "Installing frontend dependencies…"
(cd frontend && npm install)

echo ""
read -p "Start a local Postgres container with Docker Compose now? [y/N] " start_db
if [[ "$start_db" =~ ^[Yy]$ ]]; then
  docker compose up -d postgres
  echo "Waiting for Postgres to become healthy…"
  until docker compose ps postgres | grep -q "healthy"; do sleep 2; done
fi

echo ""
echo "Running Prisma migrations…"
(cd backend && npx prisma migrate dev --name init)

read -p "Seed the database with demo data (event, contacts, campaign)? [y/N] " run_seed
if [[ "$run_seed" =~ ^[Yy]$ ]]; then
  (cd backend && npm run prisma:seed)
fi

cat <<'EOF'

========================================
Setup complete!

Next steps:
  1. Make sure backend/.env and frontend/.env.local have real values for:
     - Supabase URL/keys, OpenAI, Resend, Twilio, Stripe (as needed per feature)
  2. Start the backend:   cd backend && npm run dev
  3. Start the frontend:  cd frontend && npm run dev
  4. Visit http://localhost:3000

See DEPLOYMENT.md for production deployment instructions (Vercel + Render + Supabase).
========================================
EOF
