'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Scan, Users, XCircle } from 'lucide-react';
import { apiGet, apiSend, ApiError } from '@/lib/api';
import { QrScanner } from '@/components/checkin/QrScanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EventOption {
  id: string;
  title: string;
}

interface CheckInSummary {
  checkIns: { id: string; scannedAt: string; guestListEntry: { name: string; partySize: number } }[];
  totalGuestListEntries: number;
  checkedIn: number;
}

interface ScanResult {
  ok: boolean;
  message: string;
  name?: string;
}

export default function CheckinPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    apiGet('/api/events').then((data) => {
      setEvents(data);
      if (data[0]) setEventId(data[0].id);
    });
  }, []);

  function loadSummary(id: string) {
    apiGet(`/api/checkin/event/${id}`).then(setSummary);
  }

  useEffect(() => {
    if (eventId) loadSummary(eventId);
  }, [eventId]);

  async function handleScan(code: string) {
    try {
      const res = await apiSend('/api/checkin/scan', 'POST', { code, method: 'QR' });
      setLastResult({ ok: true, message: 'Checked in', name: res.entry.name });
      toast.success(`${res.entry.name} checked in`);
      loadSummary(eventId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Scan failed';
      setLastResult({ ok: false, message });
      toast.error(message);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode) return;
    await handleScan(manualCode);
    setManualCode('');
  }

  const progress = summary && summary.totalGuestListEntries > 0 ? Math.round((summary.checkedIn / summary.totalGuestListEntries) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Door / Check-in</h1>
        <p className="text-sm text-muted-foreground">Scan guest QR codes or enter codes manually at the door.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={scanning ? 'destructive' : 'gradient'} onClick={() => setScanning((s) => !s)}>
            <Scan className="h-4 w-4" /> {scanning ? 'Stop scanner' : 'Start camera scanner'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scanner</CardTitle>
            <CardDescription>Point the camera at a guest&apos;s QR code, or type it manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QrScanner active={scanning && Boolean(eventId)} onScan={handleScan} />
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input placeholder="Enter guest code manually" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
              <Button type="submit" variant="outline">
                Check in
              </Button>
            </form>
            {lastResult && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${lastResult.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                {lastResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {lastResult.name ? `${lastResult.name} — ${lastResult.message}` : lastResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live count</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {summary?.checkedIn ?? 0} of {summary?.totalGuestListEntries ?? 0} checked in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summary?.checkIns ?? []).slice(0, 10).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.guestListEntry.name}</TableCell>
                    <TableCell>{c.guestListEntry.partySize}</TableCell>
                    <TableCell>{new Date(c.scannedAt).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
