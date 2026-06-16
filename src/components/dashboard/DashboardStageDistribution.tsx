import React from 'react';
import { motion } from 'motion/react';
import type { Student } from '../../data/studentsData';
import { DashboardSectionHeading } from './DashboardSectionHeading';

interface StageSegment {
  key: string;
  label: string;
  color: string;
  count: number;
}

function buildStageSegments(students: Student[]): StageSegment[] {
  const count = (predicate: (s: Student) => boolean) => students.filter(predicate).length;
  return [
    { key: 'none',            label: 'Not Started',     color: 'bg-slate-300',   count: count(s => s.currentStage == null) },
    { key: 'referral',        label: 'Initial Intake',  color: 'bg-slate-400',   count: count(s => s.currentStage === 'referral') },
    { key: 'consent',         label: 'Consent',         color: 'bg-amber-400',   count: count(s => s.currentStage === 'consent') },
    { key: 'career_guidance', label: 'Career Guidance', color: 'bg-primary',     count: count(s => s.currentStage === 'career_guidance') },
    { key: 'complete',        label: 'Job Ready',       color: 'bg-emerald-500', count: count(s => s.currentStage === 'complete') },
  ];
}

/** Official ledger-style horizontal distribution of students across programme stages. */
export function DashboardStageDistribution({ students }: { students: Student[] }) {
  const segments = buildStageSegments(students);
  const total = students.length;

  return (
    <section className="space-y-3">
      <DashboardSectionHeading>Programme Stage Distribution</DashboardSectionHeading>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100" role="img" aria-label="Stage distribution">
          {segments.map((seg, i) =>
            seg.count > 0 ? (
              <motion.div
                key={seg.key}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: seg.count }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                className={`${seg.color} min-w-0`}
                style={{ flexBasis: 0 }}
                title={`${seg.label}: ${seg.count}`}
              />
            ) : null,
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {segments.map(seg => {
            const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
            return (
              <div key={seg.key} className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${seg.color}`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{seg.label}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {seg.count.toLocaleString('en-AU')} · {pct}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
