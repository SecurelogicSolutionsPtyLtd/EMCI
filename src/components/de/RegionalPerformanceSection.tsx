import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { RegionalPerformanceRow } from '../../lib/deAnalyticsMetrics';

interface RegionalPerformanceSectionProps {
  rows: RegionalPerformanceRow[];
}

const METRICS = [
  { key: 'completionRate', label: 'Completion', color: '#22C55E' },
  { key: 'engagementRate', label: 'Engagement', color: '#2563EB' },
  { key: 'stalledRate',    label: 'Stalled',    color: '#EF4444' },
] as const;

export function RegionalPerformanceSection({ rows }: RegionalPerformanceSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 mb-1">Regional Performance</h2>
      <p className="text-xs text-slate-400 mb-4">
        Completion, engagement and stalled rates by region — highlighting where support may be needed.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No regional data available.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#64748B' }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(value: number) => `${value}%`}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {METRICS.map(m => (
                <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
