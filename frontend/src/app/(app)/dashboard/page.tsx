'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, DollarSign, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart, type RevenuePoint } from '@/components/charts/RevenueChart';
import { AttendanceChart, type AttendancePoint } from '@/components/charts/AttendanceChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

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

  const upcoming = events.filter((e) => new Date(e.startsAt) >= new Date()).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your nightlife business at a glance.</p>
      </div>

      {loading || !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Upcoming events" value={String(overview.upcomingEvents)} icon={CalendarClock} accent="primary" />
          <StatCard label="Total contacts" value={String(overview.totalContacts)} icon={Users} accent="accent" />
          <StatCard label="Total revenue" value={formatCurrency(overview.totalRevenue)} icon={DollarSign} accent="good" />
          <StatCard label="Attendance rate" value={`${overview.attendanceRate}%`} icon={TrendingUp} accent="primary" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>Actual vs. projected revenue by month</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-72 w-full" /> : <RevenueChart data={revenue} />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>RSVPs vs. check-ins for recent events</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-72 w-full" /> : <AttendanceChart data={attendance} />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming events</CardTitle>
            <CardDescription>Your next scheduled nights</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/events">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No upcoming events yet. Create your first event to get started.</p>
          ) : (
            upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-colors hover:bg-accent/10"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.startsAt)} {event.venue ? `· ${event.venue.name}` : ''}
                  </p>
                </div>
                <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>{event.status}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
