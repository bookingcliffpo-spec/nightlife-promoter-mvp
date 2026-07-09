'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, CreditCard, Home, Megaphone, QrCode, Settings, Sparkles, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-4">
        <DialogTitle>Navigate</DialogTitle>
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground',
                  active && 'bg-foreground text-background hover:bg-foreground hover:text-background'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
