'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Camera, Heart, MapPin, Megaphone, MessageCircle, Search, Sparkles, Ticket, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const heroImage = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1800&q=80';
const eventImages = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80'
];

const features = [
  { icon: Camera, title: 'Social event feed', description: 'Turn every night into a post-ready event page with flyers, captions, and guest activity.' },
  { icon: Ticket, title: 'Event marketplace', description: 'Publish RSVP and ticket links, show dates and venues clearly, and manage demand from one grid.' },
  { icon: Users, title: 'Audience CRM', description: 'Import contacts, segment VIPs, and keep every guest tied to campaigns and events.' },
  { icon: Megaphone, title: 'Campaign engine', description: 'Send email and SMS campaigns for launches, reminders, and last-call pushes.' },
  { icon: Sparkles, title: 'AI creative studio', description: 'Generate captions, event copy, hashtags, and promo angles without leaving the dashboard.' },
  { icon: BarChart3, title: 'Promoter analytics', description: 'Track revenue, check-ins, attendance rate, and guest growth across every event.' }
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <section
        className="relative flex min-h-[84vh] flex-col bg-cover bg-center text-white"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.82), rgba(0,0,0,.46), rgba(0,0,0,.18)), url(${heroImage})` }}
      >
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
          <Link href="/" className="text-xl font-black tracking-tight">
            NIGHT<span className="text-orange-300">LIFE</span> AI
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-16 pt-10 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200">Social feed plus ticketed events</p>
            <h1 className="mt-4 text-5xl font-black leading-none tracking-tight sm:text-7xl">Nightlife Promoter AI</h1>
            <p className="mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
              An all-in-one platform for promoters and venues that combines event discovery, social-style promotion, guest CRM, campaigns, AI content, and door check-in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/signup">
                  Build your event hub <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/login">Open dashboard</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto -mt-12 grid max-w-7xl gap-4 px-5 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-border/80 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-500 via-pink-500 to-fuchsia-600" />
                <div>
                  <p className="font-bold leading-none">Friday Rooftop Sessions</p>
                  <p className="mt-1 text-xs text-muted-foreground">Brooklyn, NY</p>
                </div>
              </div>
            </div>
            <div className="grid min-h-[360px] bg-cover bg-center md:grid-cols-[1fr_260px]" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.1), rgba(0,0,0,.58)), url(${eventImages[0]})` }}>
              <div />
              <div className="flex flex-col justify-end bg-black/40 p-5 text-white backdrop-blur-[1px]">
                <p className="text-sm font-bold text-orange-200">Jun 19, 10:00 PM</p>
                <h2 className="mt-2 text-2xl font-black">Event content that sells the room.</h2>
                <div className="mt-4 flex gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> 1.8k</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> 248</span>
                  <span className="flex items-center gap-1"><Ticket className="h-4 w-4" /> RSVP</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" /> Search events, venues, guests
            </div>
            {eventImages.slice(1).map((image, index) => (
              <div key={image} className="grid grid-cols-[88px_1fr] gap-3 rounded-lg border border-border/80 p-3">
                <div className="h-24 rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-primary">Featured event</p>
                  <p className="mt-1 line-clamp-1 font-black">{index === 0 ? 'Warehouse After Dark' : 'Supper Club Saturdays'}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> New York</p>
                  <p className="mt-2 text-sm font-semibold">{index === 0 ? '946' : '612'} guests interested</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">One operating system</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Instagram-style promotion, Eventbrite-style event operations.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
