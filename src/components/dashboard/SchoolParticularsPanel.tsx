import React from 'react';
import type { School } from '../../data/networkData';
import { DashboardSectionHeading } from './DashboardSectionHeading';

/** Formal definition-list register of school particulars. */
export function SchoolParticularsPanel({ school }: { school: School }) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Morrisby ID', value: <span className="font-mono">{school.morrisbyId}</span> },
    { label: 'Region', value: school.region },
    { label: 'Principal Contact', value: school.principalContact },
    { label: 'Programme Status', value: school.status },
    { label: 'Participating Since', value: school.joinedYear },
  ];

  return (
    <section className="space-y-3">
      <DashboardSectionHeading>School Particulars</DashboardSectionHeading>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
        {rows.map(row => (
          <div key={row.label} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
              {row.label}
            </span>
            <span className="text-sm font-semibold text-slate-800 sm:text-right break-words">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
