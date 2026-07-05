'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Megaphone,
  Sparkles,
  QrCode,
  BarChart3,
  CreditCard,
  Settings,
  PartyPopper
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events & Flyers', icon: CalendarDays },
  { href: '/contacts', label: 'Contacts / CRM', icon: Users },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/ai', label: 'AI Studio', icon: Sparkles },
  { href: '/checkin', label: 'Door / Check-in', icon: QrCode },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-0 hidden h-screen w-64 flex-col gap-6 rounded-none border-y-0 border-l-0 p-6 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2 text-xl font-black tracking-tight">
        <PartyPopper className="h-6 w-6 text-primary" />
        <span>
          NIGHT<span className="gradient-text">LIFE AI</span>
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground',
                active && 'bg-primary/10 text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/15 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Nightlife Promoter AI</p>
        <p className="mt-1">Plan, promote, and sell out every night.</p>
      </div>
    </aside>
  );
}
