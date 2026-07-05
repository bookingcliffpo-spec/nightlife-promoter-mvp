import { Router } from 'express';
import type Stripe from 'stripe';
import type { SubscriptionStatus } from '@prisma/client';
import { requireStripe } from '../lib/stripe.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../env.js';

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post('/', async (req, res) => {
  const stripe = requireStripe();
  const signature = req.headers['stripe-signature'];

  if (!env.STRIPE_WEBHOOK_SECRET || !signature) {
    return res.status(400).json({ error: 'Missing Stripe webhook signature or secret.' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;
        const tier = session.metadata?.tier as 'PRO' | 'ELITE' | undefined;
        if (organizationId && tier) {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              planTier: tier,
              subscriptionStatus: 'ACTIVE',
              stripeSubscriptionId: session.subscription as string
            }
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const org = await prisma.organization.findFirst({ where: { stripeCustomerId: subscription.customer as string } });
        if (org) {
          const statusMap: Record<string, SubscriptionStatus> = {
            active: 'ACTIVE',
            trialing: 'TRIALING',
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'CANCELED',
            unpaid: 'PAST_DUE'
          };
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              subscriptionStatus: statusMap[subscription.status] ?? 'ACTIVE',
              planTier: subscription.status === 'canceled' ? 'FREE' : undefined
            }
          });
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe webhook event:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});
