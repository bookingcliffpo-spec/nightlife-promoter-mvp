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
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tabular-nums tracking-tight">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
            accent === 'primary' && 'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400',
            accent === 'accent' && 'border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-400',
            accent === 'good' && 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
