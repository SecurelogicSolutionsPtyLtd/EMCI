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
import { formatCohortLabel, type CohortOutcome } from '../../lib/deAnalyticsMetrics';

interface CohortOutcomesSectionProps {
  rows: CohortOutcome[];
}

const METRICS = [
  { key: 'completionRate', label: 'Completion', color: '#22C55E' },
  { key: 'capRate',        label: 'Career Action Plan', color: '#2563EB' },
  { key: 'wexRate',        label: 'Work Experience', color: '#ec5b13' },
  { key: 'morrisbyRate',   label: 'Morrisby Profile', color: '#8B5CF6' },
] as const;

export function CohortOutcomesSection({ rows }: CohortOutcomesSectionProps) {
  if (rows.length === 0) {
    return (
      <SectionShell>
        <p className="text-sm text-slate-400">No cohort data available.</p>
      </SectionShell>
    );
  }

  const data = rows.map(r => ({
    cohort: formatCohortLabel(r.cohort),
    completionRate: r.completionRate,
    capRate: r.capRate,
    wexRate: r.wexRate,
    morrisbyRate: r.morrisbyRate,
  }));

  return (
    <SectionShell>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="cohort" tick={{ fontSize: 11, fill: '#64748B' }} interval={0} />
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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-200">
              <th className="py-2 pr-4 font-semibold">Cohort</th>
              <th className="py-2 px-3 font-semibold text-right">Students</th>
              <th className="py-2 px-3 font-semibold text-right">Completion</th>
              <th className="py-2 px-3 font-semibold text-right">CAP</th>
              <th className="py-2 px-3 font-semibold text-right">WEX</th>
              <th className="py-2 pl-3 font-semibold text-right">Morrisby</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.cohort} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-slate-700">{formatCohortLabel(r.cohort)}</td>
                <td className="py-2 px-3 text-right text-slate-600">{r.count}</td>
                <td className="py-2 px-3 text-right text-slate-600">{r.completionRate}%</td>
                <td className="py-2 px-3 text-right text-slate-600">{r.capRate}%</td>
                <td className="py-2 px-3 text-right text-slate-600">{r.wexRate}%</td>
                <td className="py-2 pl-3 text-right text-slate-600">{r.morrisbyRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 mb-1">Outcomes by Student Type</h2>
      <p className="text-xs text-slate-400 mb-4">
        Completion and career outcomes across priority cohorts and the standard population.
      </p>
      {children}
    </section>
  );
}
