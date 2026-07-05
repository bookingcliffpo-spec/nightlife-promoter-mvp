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

interface Tag {
  id: string;
  name: string;
}

export function CampaignFormDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'EMAIL', subject: '', message: '' });

  useEffect(() => {
    if (open) {
      apiGet('/api/tags')
        .then(setTags)
        .catch(() => setTags([]));
    }
  }, [open]);

  function toggleTag(id: string) {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiSend('/api/campaigns', 'POST', {
        name: form.name,
        channel: form.channel,
        subject: form.channel === 'EMAIL' ? form.subject : undefined,
        message: form.message,
        audienceTagIds: selectedTags
      });
      toast.success('Campaign created as draft');
      setOpen(false);
      setForm({ name: '', channel: 'EMAIL', subject: '', message: '' });
      setSelectedTags([]);
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
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.channel === 'EMAIL' && (
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject line</Label>
              <Input id="subject" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Audience (leave empty to target everyone opted in)</Label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags yet — campaign will target all opted-in contacts.</p>}
              {tags.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? 'Creating…' : 'Save as draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
