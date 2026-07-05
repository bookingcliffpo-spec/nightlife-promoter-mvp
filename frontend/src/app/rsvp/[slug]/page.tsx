'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { publicApiGet, publicApiSend } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';

interface RsvpEvent {
  title: string;
  description: string | null;
  startsAt: string;
  venue: { name: string; address: string | null; city: string | null } | null;
  flyerUrl: string | null;
  capacity: number | null;
  rsvpCount: number;
  soldOut: boolean;
}

export default function RsvpPage() {
  const params = useParams<{ slug: string }>();
  const [event, setEvent] = useState<RsvpEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', partySize: '1' });

  useEffect(() => {
    publicApiGet(`/api/rsvp/${params.slug}`)
      .then(setEvent)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await publicApiSend(`/api/rsvp/${params.slug}`, 'POST', {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        partySize: Number(form.partySize || 1)
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit RSVP');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading event…</div>;
  if (notFound || !event) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Event not found.</div>;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="overflow-hidden">
          {event.flyerUrl && (
            <div className="relative h-56 w-full">
              <Image src={event.flyerUrl} alt={event.title} fill className="object-cover" unoptimized />
            </div>
          )}
          <CardHeader>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
              <PartyPopper className="h-4 w-4" /> You&apos;re invited
            </div>
            <CardTitle className="text-2xl">{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {formatDate(event.startsAt)}
              </p>
              {event.venue && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {event.venue.name}
                  {event.venue.address ? ` — ${event.venue.address}` : ''}
                </p>
              )}
            </div>
            {event.description && <p className="text-sm">{event.description}</p>}

            {submitted ? (
              <p className="rounded-lg bg-emerald-500/10 p-4 text-center text-sm text-emerald-600 dark:text-emerald-400">
                You&apos;re on the list! Check your email for confirmation.
              </p>
            ) : event.soldOut ? (
              <p className="rounded-lg bg-amber-500/10 p-4 text-center text-sm text-amber-600 dark:text-amber-400">
                This event is currently sold out.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="partySize">Party size</Label>
                  <Input
                    id="partySize"
                    type="number"
                    min={1}
                    max={20}
                    value={form.partySize}
                    onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'RSVP now'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
