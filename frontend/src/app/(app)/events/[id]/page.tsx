'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/api';
import { EventFormDialog, type EventRecord } from '@/components/events/EventFormDialog';
import { FlyerUploader } from '@/components/events/FlyerUploader';
import { GuestListManager } from '@/components/events/GuestListManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

interface EventDetail extends EventRecord {
  venue: { id: string; name: string; address: string | null; city: string | null } | null;
  flyers: { id: string; url: string }[];
  _count: { guestListEntries: number; checkIns: number };
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    apiGet(`/api/events/${params.id}`)
      .then(setEvent)
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.id]);

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await apiSend(`/api/events/${params.id}`, 'DELETE');
      toast.success('Event deleted');
      router.push('/events');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function copyRsvpLink() {
    if (!event) return;
    const url = `${window.location.origin}/rsvp/${event.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('RSVP link copied');
  }

  if (loading || !event) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const address = event.venue?.address ? `${event.venue.address}, ${event.venue.city ?? ''}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>{event.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.startsAt)} {event.venue ? `· ${event.venue.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyRsvpLink}>
            <Copy className="h-4 w-4" /> Copy RSVP link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ai">
              <Sparkles className="h-4 w-4" /> AI Studio
            </Link>
          </Button>
          <EventFormDialog event={event} onSaved={load} />
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Capacity</p>
            <p className="text-2xl font-bold">{event.capacity ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">On guest list</p>
            <p className="text-2xl font-bold">{event._count.guestListEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Checked in</p>
            <p className="text-2xl font-bold">{event._count.checkIns}</p>
          </CardContent>
        </Card>
      </div>

      {event.description && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">{event.description}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Flyers</CardTitle>
            <CardDescription>Upload artwork to Supabase Storage for this event.</CardDescription>
          </CardHeader>
          <CardContent>
            <FlyerUploader eventId={event.id} flyers={event.flyers} onChange={load} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Venue</CardTitle>
            <CardDescription>{event.venue?.name ?? 'No venue assigned yet.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {address && mapsKey ? (
              <iframe
                title="Venue map"
                className="h-64 w-full rounded-xl border border-border/60"
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(address)}`}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {address ?? 'Add a venue with an address to see a map here.'}
                {!mapsKey && ' (Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the embedded map.)'}
              </p>
            )}
            {event.ticketUrl && (
              <a href={event.ticketUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline">
                Ticket page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Cover charge</p>
                <p className="font-semibold">{formatCurrency(event.coverCharge)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Projected bar revenue</p>
                <p className="font-semibold">{formatCurrency(event.projectedBarRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guest list</CardTitle>
          <CardDescription>Add guests manually or share your public RSVP link.</CardDescription>
        </CardHeader>
        <CardContent>
          <GuestListManager eventId={event.id} />
        </CardContent>
      </Card>
    </div>
  );
}
