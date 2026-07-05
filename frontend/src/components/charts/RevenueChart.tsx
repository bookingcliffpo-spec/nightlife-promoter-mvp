'use client';

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export interface RevenuePoint {
  month: string;
  actual: number;
  projected: number;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No revenue data yet — add events to see trends.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="month" tick={{ fill: 'var(--chart-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} />
        <YAxis
          tick={{ fill: 'var(--chart-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={70}
        />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 13 }}
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Area type="monotone" dataKey="actual" name="Actual revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#actualFill)" />
        <Area type="monotone" dataKey="projected" name="Projected (bar + cover)" stroke="var(--chart-2)" strokeWidth={2} fill="url(#projectedFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
