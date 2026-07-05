# Deployment guide

This app deploys as three pieces: **Supabase** (database + auth + storage), **Render** (backend API), and
**Vercel** (frontend). Follow these in order — later steps need values produced by earlier ones.

## 1. Supabase (database, auth, storage)

1. Create a project at [supabase.com](https://supabase.com).
2. **Database** → Settings → Database: copy the **connection string** (pooled, "Transaction" mode) as
   `DATABASE_URL`, and the **direct connection** string as `DIRECT_URL`.
3. **Authentication** → Providers: enable **Email** and **Google**. For Google, create an OAuth client in
   the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with an authorized redirect
   URI of `https://<your-project-ref>.supabase.co/auth/v1/callback`, then paste the client ID/secret into
   Supabase.
4. **Authentication** → URL Configuration: set the Site URL to your production frontend URL (e.g.
   `https://your-app.vercel.app`) and add `https://your-app.vercel.app/auth/callback` as a redirect URL.
5. **Storage**: create a bucket named `flyers` and make it **public** (so uploaded flyer URLs are directly
   viewable).
6. **Settings** → API: copy the **Project URL** (`SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`), the
   **anon public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), and the **service_role key**
   (`SUPABASE_SERVICE_ROLE_KEY` — backend only, never expose this to the frontend).

## 2. Backend on Render

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and point it at your repo — it will read `render.yaml`
   automatically and create the `nightlife-promoter-backend` web service.
   (Alternatively: **New → Web Service**, root directory `backend`, build command
   `npm install && npx prisma generate && npm run build`, start command
   `npx prisma migrate deploy && npm run start`.)
3. Set the environment variables Render prompts for (marked `sync: false` in `render.yaml`):
   - `DATABASE_URL`, `DIRECT_URL` (from Supabase step 2)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from Supabase step 6)
   - `FRONTEND_URL` — your Vercel URL, e.g. `https://your-app.vercel.app`
   - `OPENAI_API_KEY` — required for the AI Studio features
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — required for email campaigns
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — required for SMS campaigns
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE` — required for
     billing (see step 4)
4. Deploy. Render runs `prisma migrate deploy` on every start, so schema changes ship automatically on
   subsequent deploys. Confirm `GET https://<your-backend>.onrender.com/health` returns `{"ok": true}`.

## 3. Frontend on Vercel

1. Import the repo in Vercel, with **Root Directory** set to `frontend`. `vercel.json` supplies the rest of
   the build configuration.
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL, e.g. `https://nightlife-promoter-backend.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase step 6)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — optional, enables the embedded venue map
3. Deploy. Then go back to Supabase's Auth URL Configuration (step 1.4) and confirm the Site URL / redirect
   URLs match the real Vercel domain.

## 4. Stripe billing

1. In the [Stripe Dashboard](https://dashboard.stripe.com), create two recurring **Products** — "Pro" and
   "Elite" — each with a monthly Price. Copy the price IDs into `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ELITE` on
   Render.
2. Create a webhook endpoint pointing at `https://<your-backend>.onrender.com/api/webhooks/stripe`,
   subscribed to `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Test with Stripe's test mode keys before switching to live keys.

## 5. Post-deploy checklist

- [ ] `GET /health` on the Render backend returns `200`
- [ ] Sign up on the deployed frontend with email/password and with Google — both should land on `/dashboard`
- [ ] Create an event, upload a flyer, confirm it renders (Supabase Storage bucket must be public)
- [ ] Visit the event's `/rsvp/<slug>` page in an incognito window and submit an RSVP
- [ ] Add a contact, send yourself a test email campaign (requires `RESEND_API_KEY`)
- [ ] Generate an AI caption (requires `OPENAI_API_KEY`)
- [ ] Open `/billing` and confirm the Stripe Checkout redirect works (requires Stripe env vars)

## Local production build check

Before relying on hosted CI, you can verify both packages build in production mode locally:

```bash
cd backend && npm install && npx prisma generate && npm run build
cd ../frontend && npm install && npm run build
```
