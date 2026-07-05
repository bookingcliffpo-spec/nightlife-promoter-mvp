'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/api';
import { useMe } from '@/lib/hooks/useMe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  _count: { contacts: number };
}

function OrganizationSettings() {
  const { me } = useMe();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me) setName(me.organization.name);
  }, [me]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiSend('/api/me/organization', 'PATCH', { name });
      toast.success('Organization updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>Your business name as shown across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex max-w-md gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="gradient" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function VenueSettings() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState({ name: '', address: '', city: '', capacity: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    apiGet('/api/venues').then(setVenues);
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiSend('/api/venues', 'POST', {
        name: form.name,
        address: form.address || undefined,
        city: form.city || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined
      });
      setForm({ name: '', address: '', city: '', capacity: '' });
      load();
      toast.success('Venue added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add venue');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this venue?')) return;
    try {
      await apiSend(`/api/venues/${id}`, 'DELETE');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venues</CardTitle>
        <CardDescription>Manage the venues you host events at.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Venue name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Capacity"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
            <Button type="submit" variant="outline" disabled={saving}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {venues.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>
                    {v.address} {v.city}
                  </TableCell>
                  <TableCell>{v.capacity ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)} aria-label="Delete venue">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TagSettings() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    apiGet('/api/tags').then(setTags);
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiSend('/api/tags', 'POST', { name });
      setName('');
      load();
      toast.success('Tag created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag?')) return;
    try {
      await apiSend(`/api/tags/${id}`, 'DELETE');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact tags</CardTitle>
        <CardDescription>Used to segment contacts and target campaigns.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex max-w-md gap-2">
          <Input placeholder="Tag name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="outline" disabled={saving}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-2">
              {tag.name} ({tag._count.contacts})
              <button onClick={() => handleDelete(tag.id)} aria-label={`Delete ${tag.name}`}>
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization, venues, and tags.</p>
      </div>
      <OrganizationSettings />
      <VenueSettings />
      <TagSettings />
    </div>
  );
}
