'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, QrCode, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { apiDownload, apiGet, apiSend } from '@/lib/api';

interface GuestEntry {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  partySize: number;
  listType: 'GENERAL' | 'VIP' | 'COMP' | 'PROMOTER';
  rsvpStatus: string;
  checkedInAt: string | null;
}

export function GuestListManager({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', partySize: '1', listType: 'GENERAL' });

  function load() {
    setLoading(true);
    apiGet(`/api/guestlist/event/${eventId}`)
      .then(setEntries)
      .finally(() => setLoading(false));
  }

  useEffect(load, [eventId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiSend(`/api/guestlist/event/${eventId}`, 'POST', {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        partySize: Number(form.partySize || 1),
        listType: form.listType
      });
      toast.success('Guest added');
      setForm({ name: '', email: '', phone: '', partySize: '1', listType: 'GENERAL' });
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add guest');
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiSend(`/api/guestlist/${id}`, 'DELETE');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleShowQr(id: string) {
    try {
      const blob = await apiDownload(`/api/guestlist/${id}/qrcode`);
      setQrUrl(URL.createObjectURL(blob));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load QR code');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{entries.length} on the list</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" /> Add guest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add to guest list</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">Name</Label>
                <Input id="guest-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-email">Email</Label>
                  <Input id="guest-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-phone">Phone</Label>
                  <Input id="guest-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="party-size">Party size</Label>
                  <Input
                    id="party-size"
                    type="number"
                    min={1}
                    value={form.partySize}
                    onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>List type</Label>
                  <Select value={form.listType} onValueChange={(v) => setForm((f) => ({ ...f, listType: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="COMP">Comp</SelectItem>
                      <SelectItem value="PROMOTER">Promoter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" variant="gradient">
                  Add guest
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading guest list…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No guests yet. Add guests manually or share your RSVP link.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.email || entry.phone || '—'}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{entry.listType}</Badge>
                </TableCell>
                <TableCell>{entry.partySize}</TableCell>
                <TableCell>
                  {entry.checkedInAt ? (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Checked in
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not arrived</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleShowQr(entry.id)} aria-label="Show QR code">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(entry.id)} aria-label="Remove guest">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={Boolean(qrUrl)} onOpenChange={(o) => !o && setQrUrl(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>Guest QR code</DialogTitle>
          </DialogHeader>
          {qrUrl && <img src={qrUrl} alt="Guest QR code" className="mx-auto rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
