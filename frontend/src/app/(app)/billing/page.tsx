'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, CreditCard } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Plan {
  tier: 'FREE' | 'PRO' | 'ELITE';
  name: string;
  price: number;
  features: string[];
}

interface Subscription {
  planTier: 'FREE' | 'PRO' | 'ELITE';
  subscriptionStatus: string;
  trialEndsAt: string | null;
  hasStripeCustomer: boolean;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiGet('/api/billing/plans'), apiGet('/api/billing/subscription')])
      .then(([p, s]) => {
        setPlans(p);
        setSubscription(s);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(tier: 'PRO' | 'ELITE') {
    setActionLoading(tier);
    try {
      const res = await apiSend('/api/billing/checkout', 'POST', { tier });
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout is not available yet — configure Stripe on the server.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManage() {
    setActionLoading('portal');
    try {
      const res = await apiSend('/api/billing/portal', 'POST');
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Billing portal is not available yet.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your subscription and plan.</p>
        </div>
        {subscription?.hasStripeCustomer && (
          <Button variant="outline" onClick={handleManage} disabled={actionLoading === 'portal'}>
            <CreditCard className="h-4 w-4" /> Manage billing
          </Button>
        )}
      </div>

      {subscription && (
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-xl font-bold">{subscription.planTier}</p>
            </div>
            <Badge variant={subscription.subscriptionStatus === 'ACTIVE' ? 'success' : 'secondary'}>{subscription.subscriptionStatus}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.planTier === plan.tier;
          return (
            <Card key={plan.tier} className={cn(plan.tier === 'PRO' && 'ring-2 ring-primary')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.tier === 'PRO' && <Badge variant="default">Most popular</Badge>}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">${plan.price}</span> / month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button className="w-full" variant="secondary" disabled>
                    Current plan
                  </Button>
                ) : plan.tier === 'FREE' ? (
                  <Button className="w-full" variant="outline" disabled>
                    Free tier
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="gradient"
                    onClick={() => handleUpgrade(plan.tier as 'PRO' | 'ELITE')}
                    disabled={actionLoading === plan.tier}
                  >
                    {actionLoading === plan.tier ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
