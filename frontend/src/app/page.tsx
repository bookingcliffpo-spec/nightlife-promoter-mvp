'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, QrCode, Sparkles, Megaphone, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  { icon: CalendarDays, title: 'Events & Flyers', description: 'Create events, manage venues, and store flyers in the cloud.' },
  { icon: Users, title: 'Guest CRM', description: 'Unlimited contacts, CSV import/export, tags, VIP levels, and notes.' },
  { icon: Megaphone, title: 'Email & SMS', description: 'Send targeted campaigns through Resend and Twilio with opt-out handling.' },
  { icon: Sparkles, title: 'AI Studio', description: 'Generate captions, hashtags, ad copy, and event descriptions in seconds.' },
  { icon: QrCode, title: 'QR Check-in', description: 'RSVP pages, digital guest lists, and a live door-scanning workflow.' },
  { icon: BarChart3, title: 'Analytics', description: 'Track revenue, attendance, and campaign performance in real time.' }
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-xl font-black">
          NIGHT<span className="gradient-text">LIFE AI</span>
        </span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/signup">Start free trial</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-bold text-primary">
          THE AI NIGHTLIFE OPERATING SYSTEM
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-5xl font-black leading-tight sm:text-6xl"
        >
          Promote events, manage guests, and grow revenue in one platform.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Built for promoters, lounges, DJs, hospitality groups, and event brands who need real tools — not spreadsheets.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex justify-center gap-3">
          <Button size="lg" variant="gradient" asChild>
            <Link href="/signup">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">View dashboard</Link>
          </Button>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
