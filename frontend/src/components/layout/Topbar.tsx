'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, PartyPopper, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/hooks/useMe';
import { MobileNav } from './MobileNav';

export function Topbar() {
  const router = useRouter();
  const { me } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = (me?.name || me?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2 font-black lg:hidden">
            <PartyPopper className="h-5 w-5 text-primary" /> NIGHTLIFE
          </Link>
          <div className="hidden w-full max-w-xl items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm lg:flex">
            <Search className="h-4 w-4 shrink-0" />
            <input
              aria-label="Search workspace"
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search events, guests, campaigns"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {me && (
            <div className="hidden items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm lg:flex">
              <span className="max-w-[180px] truncate font-semibold">{me.organization.name}</span>
              <Badge variant={me.organization.planTier === 'FREE' ? 'secondary' : 'success'}>{me.organization.planTier}</Badge>
            </div>
          )}
          <Button variant="gradient" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/events">
              <Plus className="h-4 w-4" /> Create event
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="hidden sm:inline-flex">
            <Bell className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{me?.name || me?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
