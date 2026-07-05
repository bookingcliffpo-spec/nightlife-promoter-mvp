'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, MessageSquare, Send, Trash2 } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/api';
import { CampaignFormDialog } from '@/components/campaigns/CampaignFormDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Campaign {
  id: string;
  name: string;
  channel: 'EMAIL' | 'SMS';
  status: string;
  createdAt: string;
  _count: { recipients: number };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiGet('/api/campaigns')
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSend(id: string) {
    if (!confirm('Send this campaign now? This cannot be undone.')) return;
    setSendingId(id);
    try {
      const res = await apiSend(`/api/campaigns/${id}/send`, 'POST');
      toast.success(`Sent to ${res.sentCount} of ${res.total} recipients`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSendingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft campaign?')) return;
    try {
      await apiSend(`/api/campaigns/${id}`, 'DELETE');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Send targeted email and SMS campaigns to your contacts.</p>
        </div>
        <CampaignFormDialog onSaved={load} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No campaigns yet. Create your first one above.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    {c.channel === 'EMAIL' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    <Link href={`/campaigns/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </div>
                  <Badge variant={c.status === 'SENT' ? 'success' : c.status === 'FAILED' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c._count.recipients} recipients</p>
                <div className="flex gap-2">
                  {c.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="gradient" onClick={() => handleSend(c.id)} disabled={sendingId === c.id}>
                        <Send className="h-4 w-4" /> {sendingId === c.id ? 'Sending…' : 'Send now'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
