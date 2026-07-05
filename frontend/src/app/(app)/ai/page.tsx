'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiSend } from '@/lib/api';

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
      }}
    >
      <Copy className="h-3.5 w-3.5" /> Copy
    </Button>
  );
}

function CaptionGenerator() {
  const [eventTitle, setEventTitle] = useState('');
  const [vibe, setVibe] = useState('');
  const [offer, setOffer] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await apiSend('/api/ai/caption', 'POST', { eventTitle, vibe, offer });
      setResult(res.result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={generate} className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Event title</Label>
          <Input required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Neon Saturdays" />
        </div>
        <div className="space-y-1.5">
          <Label>Vibe</Label>
          <Input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="High-energy EDM, upscale rooftop" />
        </div>
        <div className="space-y-1.5">
          <Label>Offer</Label>
          <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Ladies free before 11pm" />
        </div>
        <Button type="submit" variant="gradient" disabled={loading}>
          <Sparkles className="h-4 w-4" /> {loading ? 'Generating…' : 'Generate captions'}
        </Button>
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        {result ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <CopyButton text={result} />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm">{result}</pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Captions will appear here.</p>
        )}
      </div>
    </form>
  );
}

function HashtagGenerator() {
  const [eventTitle, setEventTitle] = useState('');
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setHashtags([]);
    try {
      const res = await apiSend('/api/ai/hashtags', 'POST', { eventTitle, city, genre });
      setHashtags(res.hashtags);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={generate} className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Event title</Label>
          <Input required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Miami" />
        </div>
        <div className="space-y-1.5">
          <Label>Genre / vibe</Label>
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="House, techno" />
        </div>
        <Button type="submit" variant="gradient" disabled={loading}>
          <Sparkles className="h-4 w-4" /> {loading ? 'Generating…' : 'Generate hashtags'}
        </Button>
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        {hashtags.length > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <CopyButton text={hashtags.join(' ')} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((h) => (
                <Badge key={h} variant="secondary">
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Hashtags will appear here.</p>
        )}
      </div>
    </form>
  );
}

function AdCopyGenerator() {
  const [eventTitle, setEventTitle] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('ticket_sales');
  const [offer, setOffer] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await apiSend('/api/ai/ad-copy', 'POST', { eventTitle, audience, goal, offer });
      setResult(res.result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={generate} className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Event title</Label>
          <Input required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Target audience</Label>
          <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Young professionals 21-35" />
        </div>
        <div className="space-y-1.5">
          <Label>Goal</Label>
          <select
            className="flex h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            <option value="ticket_sales">Ticket sales</option>
            <option value="rsvp">RSVPs</option>
            <option value="table_bookings">Table bookings</option>
            <option value="brand_awareness">Brand awareness</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Offer</Label>
          <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Buy 1 table get 1 bottle free" />
        </div>
        <Button type="submit" variant="gradient" disabled={loading}>
          <Sparkles className="h-4 w-4" /> {loading ? 'Generating…' : 'Generate ad copy'}
        </Button>
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        {result ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <CopyButton text={result} />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm">{result}</pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ad copy will appear here.</p>
        )}
      </div>
    </form>
  );
}

function DescriptionGenerator() {
  const [eventTitle, setEventTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await apiSend('/api/ai/description', 'POST', { eventTitle, venue, details });
      setResult(res.result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={generate} className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Event title</Label>
          <Input required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Details</Label>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Lineup, theme, dress code, special guests…" />
        </div>
        <Button type="submit" variant="gradient" disabled={loading}>
          <Sparkles className="h-4 w-4" /> {loading ? 'Generating…' : 'Generate description'}
        </Button>
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        {result ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <CopyButton text={result} />
            </div>
            <p className="whitespace-pre-wrap text-sm">{result}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Description will appear here.</p>
        )}
      </div>
    </form>
  );
}

export default function AiStudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Studio</h1>
        <p className="text-sm text-muted-foreground">Generate on-brand marketing copy in seconds, powered by OpenAI.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generators</CardTitle>
          <CardDescription>Requires OPENAI_API_KEY to be configured on the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="caption">
            <TabsList>
              <TabsTrigger value="caption">Captions</TabsTrigger>
              <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
              <TabsTrigger value="ad-copy">Ad copy</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
            </TabsList>
            <TabsContent value="caption">
              <CaptionGenerator />
            </TabsContent>
            <TabsContent value="hashtags">
              <HashtagGenerator />
            </TabsContent>
            <TabsContent value="ad-copy">
              <AdCopyGenerator />
            </TabsContent>
            <TabsContent value="description">
              <DescriptionGenerator />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
