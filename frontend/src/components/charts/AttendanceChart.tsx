'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface AttendancePoint {
  title: string;
  rsvpCount: number;
  checkedIn: number;
}

export function AttendanceChart({ data }: { data: AttendancePoint[] }) {
  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No attendance data yet.</div>;
  }

  const truncated = data.map((d) => ({ ...d, label: d.title.length > 14 ? `${d.title.slice(0, 14)}…` : d.title }));

  return (
    <ResponsiveContainer width="100%" height={288}>
      <BarChart data={truncated} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--chart-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} />
        <YAxis tick={{ fill: 'var(--chart-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="rsvpCount" name="RSVP'd" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="checkedIn" name="Checked in" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
