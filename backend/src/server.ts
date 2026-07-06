import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './env.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { meRouter } from './routes/me.js';
import { teamRouter } from './routes/team.js';
import { eventsRouter, venuesRouter } from './routes/events.js';
import { flyersRouter } from './routes/flyers.js';
import { contactsRouter, tagsRouter } from './routes/contacts.js';
import { guestlistRouter } from './routes/guestlist.js';
import { rsvpRouter } from './routes/rsvp.js';
import { checkinRouter } from './routes/checkin.js';
import { campaignsRouter } from './routes/campaigns.js';
import { unsubscribeRouter } from './routes/unsubscribe.js';
import { aiRouter } from './routes/ai.js';
import { analyticsRouter } from './routes/analytics.js';
import { billingRouter } from './routes/billing.js';
import { stripeWebhookRouter } from './routes/stripeWebhook.js';

const app = express();
const port = Number(env.PORT);

app.set('trust proxy', 1);
app.use(helmet());

// Vercel gives every deployment (production, git branch, and each preview
// build) its own unique *.vercel.app subdomain, so a single hardcoded
// FRONTEND_URL breaks the moment that subdomain changes. Accept the
// configured FRONTEND_URL plus any *.vercel.app origin for this project.
function isAllowedOrigin(origin: string) {
  if (origin === env.FRONTEND_URL) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Stripe webhooks must receive the raw request body for signature verification,
// so this route is mounted before the global JSON body parser.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json({ limit: '5mb' }));
app.use(apiRateLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'nightlife-promoter-backend' }));

app.use('/api/me', meRouter);
app.use('/api/team', teamRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/flyers', flyersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/guestlist', guestlistRouter);
app.use('/api/rsvp', rsvpRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/unsubscribe', unsubscribeRouter);
app.use('/api/ai', aiRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/billing', billingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
