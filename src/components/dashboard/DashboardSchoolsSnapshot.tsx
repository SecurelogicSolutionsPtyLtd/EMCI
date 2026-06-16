import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { School } from '../../data/networkData';
import type { Student } from '../../data/studentsData';
import { DashboardSectionHeading } from './DashboardSectionHeading';

const STATUS_DOT: Record<string, string> = {
  Active:     'bg-emerald-500',
  Onboarding: 'bg-primary',
  Inactive:   'bg-slate-400',
};

interface DashboardSchoolsSnapshotProps {
  schools: School[];
  students: Student[];
  onOpenSchools: () => void;
  /** Opens a specific school's dashboard; rows fall back to onOpenSchools when not provided. */
  onSelectSchool?: (school: School) => void;
}

/** Formal register of the largest school cohorts with completion rates. */
export function DashboardSchoolsSnapshot({
  schools, students, onOpenSchools, onSelectSchool,
}: DashboardSchoolsSnapshotProps) {
  const rows = schools
    .map(school => {
      const cohort = students.filter(s => (s as { schoolId?: string }).schoolId === school.id);
      const completed = cohort.filter(s => s.currentStage === 'complete').length;
      const pct = cohort.length > 0 ? Math.round((completed / cohort.length) * 100) : 0;
      return { school, total: cohort.length, pct };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <DashboardSectionHeading>Schools Register — Largest Cohorts</DashboardSectionHeading>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['School', 'Status', 'Completion', 'Students'].map(h => (
                <th key={h} className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ school, total, pct }, idx) => (
              <motion.tr
                key={school.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.12, delay: idx * 0.04 }}
                onClick={() => (onSelectSchool ? onSelectSchool(school) : onOpenSchools())}
                className="hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <td className="px-5 py-3.5">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {school.name}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-slate-400">{school.morrisbyId}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[school.status] ?? STATUS_DOT.Inactive}`} />
                    {school.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3 w-40">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.04 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8 text-right shrink-0 tabular-nums">{pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-slate-900 tabular-nums">
                  {total.toLocaleString('en-AU')}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={onOpenSchools}
          className="w-full px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-primary transition-colors"
        >
          View full schools directory
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}
