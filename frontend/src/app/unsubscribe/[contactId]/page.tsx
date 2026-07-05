'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { publicApiSend } from '@/lib/api';

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeForm />
    </Suspense>
  );
}

function UnsubscribeForm() {
  const params = useParams<{ contactId: string }>();
  const searchParams = useSearchParams();
  const channel = searchParams.get('channel') || 'all';
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUnsubscribe() {
    setLoading(true);
    try {
      await publicApiSend(`/api/unsubscribe/${params.contactId}?channel=${channel}`, 'POST');
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{done ? "You're unsubscribed" : 'Unsubscribe'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <p className="text-sm text-muted-foreground">You won&apos;t receive further marketing messages on this channel.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Confirm you&apos;d like to stop receiving marketing messages.</p>
              <Button variant="destructive" onClick={handleUnsubscribe} disabled={loading}>
                {loading ? 'Processing…' : 'Unsubscribe me'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
