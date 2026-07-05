'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

interface EventListItem {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  expectedGuests: number;
  venue: { name: string } | null;
  flyers: { url: string }[];
  _count: { guestListEntries: number; checkIns: number };
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiGet('/api/events')
      .then(setEvents)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">Manage every event, flyer, and guest list in one place.</p>
        </div>
        <EventFormDialog onSaved={load} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No events yet</p>
            <p className="text-sm text-muted-foreground">Create your first event to start building guest lists and campaigns.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="h-full overflow-hidden transition-transform hover:-translate-y-1">
                <div className="relative h-36 w-full bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30">
                  {event.flyers[0] && (
                    <Image src={event.flyers[0].url} alt={event.title} fill className="object-cover" unoptimized />
                  )}
                  <Badge className="absolute right-3 top-3" variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                    {event.status}
                  </Badge>
                </div>
                <CardContent className="space-y-2 p-4">
                  <p className="font-semibold">{event.title}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.startsAt)}
                  </p>
                  {event.venue && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {event.venue.name}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {event._count.guestListEntries} on list · {event._count.checkIns} checked in
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
