import Stripe from 'stripe';
import { env } from '../env.js';

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) throw new Error('STRIPE_SECRET_KEY is not configured on the server.');
  return stripe;
}

export const PRICE_BY_TIER: Record<'PRO' | 'ELITE', string | undefined> = {
  PRO: env.STRIPE_PRICE_PRO,
  ELITE: env.STRIPE_PRICE_ELITE
};
