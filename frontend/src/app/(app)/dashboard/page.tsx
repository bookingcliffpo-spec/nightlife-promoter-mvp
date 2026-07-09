'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Camera,
  DollarSign,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Ticket,
  TrendingUp,
  Users
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart, type RevenuePoint } from '@/components/charts/RevenueChart';
import { AttendanceChart, type AttendancePoint } from '@/components/charts/AttendanceChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Overview {
  totalEvents: number;
  upcomingEvents: number;
  totalContacts: number;
  vipContacts: number;
  totalRevenue: number;
  projectedRevenue: number;
  totalCheckIns: number;
  expectedGuests: number;
  attendanceRate: number;
}

interface EventSummary {
  id: string;
  title: string;
  startsAt: string;
  status: string;
  expectedGuests: number;
  venue?: { name: string } | null;
  flyers?: { url: string }[];
  _count?: { guestListEntries: number; checkIns: number };
}

function formatEventDay(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function getCoverStyle(event: EventSummary) {
  const url = event.flyers?.[0]?.url;
  return url ? { backgroundImage: `url(${url})` } : undefined;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [attendance, setAttendance] = useState<AttendancePoint[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGet('/api/analytics/overview'), apiGet('/api/analytics/revenue'), apiGet('/api/analytics/attendance'), apiGet('/api/events')])
      .then(([overviewData, revenueData, attendanceData, eventsData]) => {
        setOverview(overviewData);
        setRevenue(revenueData);
        setAttendance(attendanceData);
        setEvents(eventsData);
      })
      .finally(() => setLoading(false));
  }, []);

  const upcoming = events
    .filter((event) => new Date(event.startsAt) >= new Date())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 8);
  const feedEvents = upcoming.length > 0 ? upcoming : events.slice(0, 4);
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{today}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">Your event feed</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Social content, ticket demand, guest lists, and campaign performance in one workspace.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/ai">
                    <Camera className="h-4 w-4" /> Create post
                  </Link>
                </Button>
                <Button variant="gradient" asChild>
                  <Link href="/events">
                    <Plus className="h-4 w-4" /> New event
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="flex gap-3 overflow-x-auto pb-1">
            <Link href="/events" className="flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs font-semibold">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-card text-primary">
                <Plus className="h-6 w-6" />
              </span>
              Add event
            </Link>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-20 shrink-0 rounded-lg" />)
              : feedEvents.slice(0, 7).map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs font-semibold">
                    <span className="rounded-full bg-gradient-to-tr from-orange-500 via-pink-500 to-fuchsia-600 p-[2px]">
                      <span
                        className="event-image-fallback block h-16 w-16 rounded-full border-2 border-background bg-cover bg-center"
                        style={getCoverStyle(event)}
                      />
                    </span>
                    <span className="line-clamp-1 w-full">{event.title}</span>
                  </Link>
                ))}
          </section>

          {loading || !overview ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Upcoming events" value={String(overview.upcomingEvents)} icon={CalendarClock} accent="primary" />
              <StatCard label="Audience" value={String(overview.totalContacts)} icon={Users} accent="accent" />
              <StatCard label="Revenue" value={formatCurrency(overview.totalRevenue)} icon={DollarSign} accent="good" />
              <StatCard label="Attendance" value={`${overview.attendanceRate}%`} icon={TrendingUp} accent="primary" />
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Promoter posts</h2>
                <p className="text-sm text-muted-foreground">Events shown like a social feed, with business controls attached.</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/events">
                  View events <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-lg" />)
            ) : feedEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                  <Ticket className="h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold">No events yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">Create your first event to start building your public RSVP page, guest list, and campaign flow.</p>
                  <Button asChild>
                    <Link href="/events">Create event</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              feedEvents.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="event-image-fallback h-10 w-10 rounded-full bg-cover bg-center" style={getCoverStyle(event)} />
                      <div>
                        <p className="font-semibold leading-none">{event.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {event.venue?.name ?? 'Venue TBA'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>{event.status}</Badge>
                  </div>

                  <div className="event-image-fallback relative min-h-[280px] bg-cover bg-center" style={getCoverStyle(event)}>
                    <div className="absolute left-4 top-4 rounded-lg bg-background/95 px-3 py-2 text-center shadow-sm">
                      <p className="text-xs font-bold uppercase text-primary">{formatEventDay(event.startsAt).split(' ')[0]}</p>
                      <p className="text-xl font-black leading-none">{formatEventDay(event.startsAt).split(' ')[1]}</p>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <Heart className="h-5 w-5" />
                        <MessageCircle className="h-5 w-5" />
                        <Send className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatEventTime(event.startsAt)}</p>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-lg bg-secondary p-3">
                        <p className="text-muted-foreground">Guest list</p>
                        <p className="font-bold">{event._count?.guestListEntries ?? event.expectedGuests}</p>
                      </div>
                      <div className="rounded-lg bg-secondary p-3">
                        <p className="text-muted-foreground">Checked in</p>
                        <p className="font-bold">{event._count?.checkIns ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-secondary p-3">
                        <p className="text-muted-foreground">Expected</p>
                        <p className="font-bold">{event.expectedGuests}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${event.id}`}>Manage event</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/campaigns">Promote</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Event marketplace</CardTitle>
              <CardDescription>Upcoming nights, ticket links, RSVPs, and door counts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
              ) : upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events to merchandise yet.</p>
              ) : (
                upcoming.slice(0, 4).map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-secondary">
                    <div className="event-image-fallback h-16 w-16 shrink-0 rounded-md bg-cover bg-center" style={getCoverStyle(event)} />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatEventTime(event.startsAt)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{event._count?.guestListEntries ?? event.expectedGuests} guests interested</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue trend</CardTitle>
              <CardDescription>Actual vs. projected monthly revenue.</CardDescription>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-64 w-full rounded-lg" /> : <RevenueChart data={revenue} />}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
              <CardDescription>RSVP demand against real check-ins.</CardDescription>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-64 w-full rounded-lg" /> : <AttendanceChart data={attendance} />}</CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
