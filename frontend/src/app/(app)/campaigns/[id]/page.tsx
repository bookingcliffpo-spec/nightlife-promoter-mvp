'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';

interface Recipient {
  id: string;
  status: string;
  error: string | null;
  contact: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null };
}

interface CampaignDetail {
  id: string;
  name: string;
  channel: string;
  status: string;
  message: string;
  subject: string | null;
  recipients: Recipient[];
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/campaigns/${params.id}`)
      .then(setCampaign)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading || !campaign) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <Badge variant={campaign.status === 'SENT' ? 'success' : 'secondary'}>{campaign.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{campaign.channel} campaign</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
          {campaign.subject && <CardDescription>Subject: {campaign.subject}</CardDescription>}
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">{campaign.message}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients ({campaign.recipients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.contact.firstName} {r.contact.lastName}
                  </TableCell>
                  <TableCell>{campaign.channel === 'EMAIL' ? r.contact.email : r.contact.phone}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'SENT' ? 'success' : r.status === 'FAILED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.error || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
