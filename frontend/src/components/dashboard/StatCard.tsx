import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'primary'
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: 'primary' | 'accent' | 'good';
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white',
            accent === 'primary' && 'bg-gradient-to-br from-fuchsia-500 to-purple-600',
            accent === 'accent' && 'bg-gradient-to-br from-indigo-500 to-blue-600',
            accent === 'good' && 'bg-gradient-to-br from-emerald-500 to-teal-600'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
