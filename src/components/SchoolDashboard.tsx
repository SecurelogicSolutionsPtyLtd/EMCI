import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Building2 } from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { School } from '../data/networkData';
import { buildSchoolMetricCards } from '../lib/metricCards';
import { DashboardLetterhead } from './dashboard/DashboardLetterhead';
import { DashboardAdvisories } from './dashboard/DashboardAdvisories';
import { DashboardSectionHeading } from './dashboard/DashboardSectionHeading';
import { DashboardStageDistribution } from './dashboard/DashboardStageDistribution';
import { SchoolParticularsPanel } from './dashboard/SchoolParticularsPanel';
import { SchoolStudentRegister } from './SchoolStudentRegister';

interface SchoolDashboardProps {
  students: Student[];
  school: School | null;
  onSelectStudent?: (student: Student) => void;
}

const SCHOOL_STATUS_BADGE: Record<string, string> = {
  Active:     'bg-emerald-100 text-emerald-700',
  Onboarding: 'bg-primary/10 text-primary',
  Inactive:   'bg-slate-100 text-slate-500',
};

export function SchoolDashboard({ students, school, onSelectStudent }: SchoolDashboardProps) {
  const schoolStudents = school
    ? students.filter(s => (s as any).schoolId === school.id || !school.id)
    : students;

  const total      = schoolStudents.length;
  const active     = schoolStudents.filter(s => s.status === 'Active').length;
  const inProgress = schoolStudents.filter(s => s.stageProgress > 0 && s.currentStage !== 'complete').length;
  const completed  = schoolStudents.filter(s => s.currentStage === 'complete').length;
  const atRiskCount = schoolStudents.filter(s => s.riskLevel !== 'none').length;

  const metricCards = buildSchoolMetricCards(total, active, inProgress, completed);

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">
      <header className="shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="w-6 h-6 text-primary shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">School Dashboard</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-12 sm:pb-16">
          {/* ── Official letterhead ──────────────────────────────── */}
          <DashboardLetterhead
            eyebrow="EMCI · Official School Record"
            title={school?.name ?? 'School'}
            titleBadge={
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${SCHOOL_STATUS_BADGE[school?.status ?? 'Active']}`}>
                {school?.status ?? 'Active'}
              </span>
            }
            subtitle={
              <>
                Morrisby ID:{' '}
                <span className="text-slate-800 font-medium font-mono tracking-wide">{school?.morrisbyId ?? '—'}</span>
                {school?.region && <> · {school.region}</>}
              </>
            }
          />

          {/* ── KPI strip ────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-slate-100">
              {metricCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 sm:px-6 py-4 sm:py-5 hover:bg-slate-50/60 transition-colors"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                    {stat.displayValue ?? stat.value.toLocaleString('en-AU')}
                  </p>
                  <div className="h-1 w-full bg-slate-100 rounded-full mt-3">
                    <motion.div
                      className={`h-full ${stat.barColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.barPct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Two-column dashboard body ────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left column — student register */}
            <section className="xl:col-span-8 space-y-3 min-w-0">
              <DashboardSectionHeading>Student Register — School Cohort</DashboardSectionHeading>
              <SchoolStudentRegister students={schoolStudents} onSelectStudent={onSelectStudent} />
            </section>

            {/* Right column — advisories & particulars */}
            <div className="xl:col-span-4 space-y-6 min-w-0">
              <DashboardAdvisories atRiskCount={atRiskCount} scopeSuffix="at this school" />
              <DashboardStageDistribution students={schoolStudents} />
              {school && <SchoolParticularsPanel school={school} />}
            </div>
          </div>

          {/* ── Official footer rule ─────────────────────────────── */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <span className="leading-relaxed">EMCI Student Management Platform · Last synced {format(new Date(), 'dd MMM yyyy, h:mm aa')}</span>
            <span className="shrink-0">Confidential — internal use only</span>
          </div>
        </div>
      </div>
    </main>
  );
}
