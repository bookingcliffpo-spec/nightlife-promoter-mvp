'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { RevenueChart, type RevenuePoint } from '@/components/charts/RevenueChart';
import { AttendanceChart, type AttendancePoint } from '@/components/charts/AttendanceChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CampaignStat {
  id: string;
  name: string;
  channel: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
}

export default function AnalyticsPage() {
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [attendance, setAttendance] = useState<AttendancePoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGet('/api/analytics/revenue'), apiGet('/api/analytics/attendance'), apiGet('/api/analytics/campaigns')])
      .then(([r, a, c]) => {
        setRevenue(r);
        setAttendance(a);
        setCampaigns(c);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">Deeper visibility into revenue, attendance, and campaign performance.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by month</CardTitle>
            <CardDescription>Actual vs. projected across all events</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-72 w-full" /> : <RevenueChart data={revenue} />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance by event</CardTitle>
            <CardDescription>RSVPs vs. verified check-ins</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-72 w-full" /> : <AttendanceChart data={attendance} />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign performance</CardTitle>
          <CardDescription>Delivery results for your most recent email & SMS campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : campaigns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No campaigns sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.channel}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'SENT' ? 'success' : c.status === 'FAILED' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.sent}</TableCell>
                    <TableCell>{c.failed}</TableCell>
                    <TableCell>{c.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
