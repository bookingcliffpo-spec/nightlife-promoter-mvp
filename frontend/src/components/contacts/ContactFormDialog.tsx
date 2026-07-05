'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiSend } from '@/lib/api';

export interface ContactRecord {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  vipLevel: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  notes: string | null;
  optedInEmail: boolean;
  optedInSms: boolean;
}

export function ContactFormDialog({ contact, onSaved }: { contact?: ContactRecord; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    vipLevel: contact?.vipLevel ?? 'NONE',
    notes: contact?.notes ?? '',
    optedInEmail: contact?.optedInEmail ?? true,
    optedInSms: contact?.optedInSms ?? true
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (contact) {
        await apiSend(`/api/contacts/${contact.id}`, 'PATCH', form);
        toast.success('Contact updated');
      } else {
        await apiSend('/api/contacts', 'POST', form);
        toast.success('Contact added');
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
        <Button variant={contact ? 'ghost' : 'gradient'} size={contact ? 'sm' : 'default'}>
          {!contact && <Plus className="h-4 w-4" />} {contact ? 'Edit' : 'Add contact'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit contact' : 'Add contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
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
            <Label>VIP level</Label>
            <Select value={form.vipLevel} onValueChange={(v) => setForm((f) => ({ ...f, vipLevel: v as ContactRecord['vipLevel'] }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="optedInEmail" className="cursor-pointer">
              Opted in to email marketing
            </Label>
            <Switch id="optedInEmail" checked={form.optedInEmail} onCheckedChange={(v) => setForm((f) => ({ ...f, optedInEmail: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="optedInSms" className="cursor-pointer">
              Opted in to SMS marketing
            </Label>
            <Switch id="optedInSms" checked={form.optedInSms} onCheckedChange={(v) => setForm((f) => ({ ...f, optedInSms: v }))} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
