'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Home,
  Megaphone,
  PartyPopper,
  QrCode,
  Settings,
  Sparkles,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/contacts', label: 'Audience', icon: Users },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/ai', label: 'Create', icon: Sparkles },
  { href: '/checkin', label: 'Door', icon: QrCode },
  { href: '/analytics', label: 'Insights', icon: BarChart3 },
  { href: '/billing', label: 'Tickets', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/80 bg-card/95 px-4 py-5 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-2 text-xl font-black tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
          <PartyPopper className="h-5 w-5" />
        </span>
        <span>
          NIGHT<span className="gradient-text">LIFE</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                active && 'bg-foreground text-background hover:bg-foreground hover:text-background'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg border border-border/80 bg-background p-4 text-sm">
        <p className="font-semibold text-foreground">Promoter suite</p>
        <p className="mt-1 text-muted-foreground">Feed, tickets, CRM, campaigns, and door tools in one workspace.</p>
      </div>
    </aside>
  );
}
