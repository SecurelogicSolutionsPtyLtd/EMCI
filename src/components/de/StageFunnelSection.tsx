import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import type { Student } from '../../data/studentsData';
import { ALL_COHORTS, buildStageFunnel, formatCohortLabel, type Cohort } from '../../lib/deAnalyticsMetrics';
import { SearchableDropdown } from '../ui/SearchableDropdown';

interface StageFunnelSectionProps {
  students: Student[];
}

const STAGE_COLORS = ['#94A3B8', '#64748B', '#ec5b13', '#22C55E'];

export function StageFunnelSection({ students }: StageFunnelSectionProps) {
  const [cohort, setCohort] = useState<Cohort | 'All'>('All');

  const funnel = useMemo(() => buildStageFunnel(students, cohort), [students, cohort]);
  const top = funnel[0]?.count ?? 0;

  const data = funnel.map((step, i) => ({
    stage: step.stage,
    count: step.count,
    retained: top > 0 ? Math.round((step.count / top) * 100) : 0,
    fill: STAGE_COLORS[i],
  }));

  const options = useMemo(
    () => [
      { value: 'All', label: 'All cohorts' },
      ...ALL_COHORTS.map(c => ({ value: c, label: formatCohortLabel(c) })),
    ],
    [],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">Stage Progress Funnel</h2>
          <p className="text-xs text-slate-400">
            Referral to Complete. Each step counts students who reached at least that stage.
          </p>
        </div>
        <SearchableDropdown
          value={cohort}
          onChange={v => setCohort(v as Cohort | 'All')}
          options={options}
          placeholder="All cohorts"
          allValue="All"
          searchable={false}
          panelWidthClass="w-48"
          className="shrink-0 w-44"
        />
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="stage"
              tick={{ fontSize: 11, fill: '#64748B' }}
              width={100}
            />
            <Tooltip
              formatter={(value: number, _name, item) => [
                `${value} students (${item?.payload?.retained ?? 0}% retained)`,
                'Reached',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #E2E8F0' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
