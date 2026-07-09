'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Search, Ticket, Users } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

const filters = [
  { value: 'ALL', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'THIS_WEEK', label: 'This week' }
];

function getCoverStyle(event: EventListItem) {
  const url = event.flyers[0]?.url;
  return url ? { backgroundImage: `url(${url})` } : undefined;
}

function formatEventDay(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function isThisWeek(value: string) {
  const now = new Date();
  const date = new Date(value);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  return date >= now && date <= nextWeek;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  function load() {
    setLoading(true);
    apiGet('/api/events')
      .then(setEvents)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesQuery =
        !normalizedQuery ||
        event.title.toLowerCase().includes(normalizedQuery) ||
        event.venue?.name.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'PUBLISHED' && event.status === 'PUBLISHED') ||
        (filter === 'DRAFT' && event.status !== 'PUBLISHED') ||
        (filter === 'THIS_WEEK' && isThisWeek(event.startsAt));

      return matchesQuery && matchesFilter;
    });
  }, [events, filter, query]);

  const spotlight = filteredEvents.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Events marketplace</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Discover and manage nights</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Build event pages, attach flyers, track demand, and move guests from RSVP to check-in.</p>
          </div>
          <EventFormDialog onSaved={load} />
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full max-w-xl items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" />
            <input
              aria-label="Search events"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search by event or venue"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {filters.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : spotlight.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {spotlight.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="group overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
              <div className="event-image-fallback relative min-h-52 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.01]" style={getCoverStyle(event)}>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                  <p className="text-xs font-bold uppercase text-orange-200">Featured</p>
                  <p className="mt-1 line-clamp-1 text-lg font-black">{event.title}</p>
                  <p className="mt-1 text-sm text-white/85">{formatDate(event.startsAt)}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">No matching events</p>
            <p className="max-w-sm text-sm text-muted-foreground">Create a new event or adjust your search and filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="group">
              <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/50">
                <div className="event-image-fallback relative aspect-[4/3] bg-cover bg-center" style={getCoverStyle(event)}>
                  <Badge className="absolute right-3 top-3" variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                    {event.status}
                  </Badge>
                  <div className="absolute left-3 top-3 rounded-lg bg-background/95 px-3 py-2 text-center shadow-sm">
                    <p className="text-xs font-bold uppercase text-primary">{formatEventDay(event.startsAt).split(' ')[0]}</p>
                    <p className="text-xl font-black leading-none">{formatEventDay(event.startsAt).split(' ')[1]}</p>
                  </div>
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="line-clamp-2 font-black leading-tight">{event.title}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.startsAt)}
                    </p>
                    {event.venue && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {event.venue.name}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-secondary p-2">
                      <p className="text-muted-foreground">Guest list</p>
                      <p className="text-sm font-bold">{event._count.guestListEntries}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-2">
                      <p className="text-muted-foreground">Checked in</p>
                      <p className="text-sm font-bold">{event._count.checkIns}</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Ticket className="h-4 w-4" /> Manage page
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
