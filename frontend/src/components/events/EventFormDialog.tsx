'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiGet, apiSend } from '@/lib/api';

interface Venue {
  id: string;
  name: string;
}

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  ticketUrl: string | null;
  coverCharge: number;
  expectedGuests: number;
  projectedBarRevenue: number;
  venueId: string | null;
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormDialog({ event, onSaved }: { event?: EventRecord; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    venueId: event?.venueId ?? '',
    status: event?.status ?? 'DRAFT',
    startsAt: toLocalInputValue(event?.startsAt),
    endsAt: toLocalInputValue(event?.endsAt),
    capacity: event?.capacity?.toString() ?? '',
    ticketUrl: event?.ticketUrl ?? '',
    coverCharge: event?.coverCharge?.toString() ?? '0',
    expectedGuests: event?.expectedGuests?.toString() ?? '0',
    projectedBarRevenue: event?.projectedBarRevenue?.toString() ?? '0'
  });

  useEffect(() => {
    if (open) {
      apiGet('/api/venues')
        .then(setVenues)
        .catch(() => setVenues([]));
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        venueId: form.venueId || null,
        status: form.status,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        ticketUrl: form.ticketUrl || null,
        coverCharge: Number(form.coverCharge || 0),
        expectedGuests: Number(form.expectedGuests || 0),
        projectedBarRevenue: Number(form.projectedBarRevenue || 0)
      };
      if (event) {
        await apiSend(`/api/events/${event.id}`, 'PATCH', payload);
        toast.success('Event updated');
      } else {
        await apiSend('/api/events', 'POST', payload);
        toast.success('Event created');
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={event ? 'outline' : 'gradient'} size={event ? 'sm' : 'default'}>
          {!event && <Plus className="h-4 w-4" />} {event ? 'Edit' : 'New event'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'Create event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Venue</Label>
              <Select value={form.venueId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, venueId: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No venue</SelectItem>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Starts at</Label>
              <Input id="startsAt" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endsAt">Ends at</Label>
              <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coverCharge">Cover charge</Label>
              <Input id="coverCharge" type="number" min={0} step="0.01" value={form.coverCharge} onChange={(e) => setForm((f) => ({ ...f, coverCharge: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedGuests">Expected guests</Label>
              <Input id="expectedGuests" type="number" min={0} value={form.expectedGuests} onChange={(e) => setForm((f) => ({ ...f, expectedGuests: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ticketUrl">Ticket URL</Label>
              <Input id="ticketUrl" type="url" placeholder="https://" value={form.ticketUrl} onChange={(e) => setForm((f) => ({ ...f, ticketUrl: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projectedBarRevenue">Projected bar revenue</Label>
              <Input
                id="projectedBarRevenue"
                type="number"
                min={0}
                step="0.01"
                value={form.projectedBarRevenue}
                onChange={(e) => setForm((f) => ({ ...f, projectedBarRevenue: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
