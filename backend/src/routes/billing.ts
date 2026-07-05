import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireStripe, PRICE_BY_TIER } from '../lib/stripe.js';
import { env } from '../env.js';

export const billingRouter = Router();
billingRouter.use(requireAuth);

export const PLAN_CATALOG = [
  {
    tier: 'FREE',
    name: 'Starter',
    price: 0,
    features: ['1 venue', 'Up to 500 contacts', 'Email campaigns', 'AI caption generator', 'QR check-in']
  },
  {
    tier: 'PRO',
    name: 'Pro',
    price: 79,
    features: [
      'Unlimited venues',
      'Up to 10,000 contacts',
      'Email + SMS campaigns',
      'Full AI generator suite',
      'Advanced analytics',
      'Priority support'
    ]
  },
  {
    tier: 'ELITE',
    name: 'Elite',
    price: 199,
    features: [
      'Everything in Pro',
      'Unlimited contacts',
      'Multi-venue reporting',
      'Dedicated onboarding',
      'Custom integrations'
    ]
  }
] as const;

billingRouter.get('/plans', (_req, res) => {
  res.json(PLAN_CATALOG);
});

billingRouter.get(
  '/subscription',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.auth!.organizationId } });
    res.json({
      planTier: org.planTier,
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      hasStripeCustomer: Boolean(org.stripeCustomerId)
    });
  })
);

const CheckoutSchema = z.object({ tier: z.enum(['PRO', 'ELITE']) });

billingRouter.post(
  '/checkout',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { tier } = CheckoutSchema.parse(req.body);
    const stripe = requireStripe();
    const priceId = PRICE_BY_TIER[tier];
    if (!priceId) throw new HttpError(503, `Stripe price for ${tier} is not configured.`);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.auth!.organizationId } });

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.auth!.email,
        name: org.name,
        metadata: { organizationId: org.id }
      });
      customerId = customer.id;
      await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/billing?checkout=success`,
      cancel_url: `${env.FRONTEND_URL}/billing?checkout=cancelled`,
      metadata: { organizationId: org.id, tier }
    });

    res.json({ url: session.url });
  })
);

billingRouter.post(
  '/portal',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const stripe = requireStripe();
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.auth!.organizationId } });
    if (!org.stripeCustomerId) throw new HttpError(400, 'No billing account found for this organization yet.');

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/billing`
    });

    res.json({ url: session.url });
  })
);
