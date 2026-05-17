import React, { useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  Search, MoreVertical, AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { type Student, YEAR_LEVEL_PLUS_BUCKET, formatYearLevelLine } from '../data/studentsData';
import type { School } from '../data/networkData';
import { MetricCardGrid } from './MetricCardGrid';
import { buildSchoolMetricCards } from '../lib/metricCards';
import { SELECT_PROGRAM_CLASS } from '../lib/selectProgramClass';

interface SchoolDashboardProps {
  students: Student[];
  school: School | null;
  onSelectStudent?: (student: Student) => void;
}

const PAGE_SIZE = 10;

const STAGE_LABELS: Record<string, string> = {
  referral:        'Initial Intake',
  consent:         'Consent',
  career_guidance: 'Career Guidance',
  complete:        'Job Ready',
};

const STAGE_PILL: Record<string, string> = {
  referral:        'bg-slate-100 text-slate-600',
  consent:         'bg-slate-100 text-slate-600',
  career_guidance: 'bg-primary/10 text-primary',
  complete:        'bg-emerald-100 text-emerald-700',
};

const SCHOOL_STATUS_BADGE: Record<string, string> = {
  Active:     'bg-emerald-100 text-emerald-700',
  Onboarding: 'bg-primary/10 text-primary',
  Inactive:   'bg-slate-100 text-slate-500',
};

function getInitials(student: Student) {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

function getProgressPct(student: Student) {
  return Math.round((student.stageProgress / 4) * 100);
}

function getProgressBarColor(student: Student) {
  if (student.currentStage === 'complete') return 'bg-emerald-500';
  if (student.riskLevel !== 'none') return 'bg-red-400';
  return 'bg-primary';
}

export function SchoolDashboard({ students, school, onSelectStudent }: SchoolDashboardProps) {
  const [search, setSearch]                     = useState('');
  const [filterStage, setFilterStage]           = useState<string>('all');
  const [filterCounsellor, setFilterCounsellor] = useState<string>('all');
  const [filterYear, setFilterYear]             = useState<string>('all');
  const [page, setPage]                         = useState(1);

  const schoolStudents = school
    ? students.filter(s => (s as any).schoolId === school.id || !school.id)
    : students;

  const counsellors = Array.from(new Set(schoolStudents.map(s => s.counsellor).filter(Boolean)));
  const yearLevels  = Array.from(new Set(schoolStudents.map(s => s.yearLevel).filter(y => y > 0))).sort((a, b) => a - b);

  const filtered = schoolStudents.filter(s => {
    const name        = `${s.firstName} ${s.lastName} ${s.preferredName ?? ''}`.toLowerCase();
    const matchSearch     = name.includes(search.toLowerCase()) || s.morrisbyId.toLowerCase().includes(search.toLowerCase()) || (s.counsellor ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStage      = filterStage === 'all' || s.currentStage === filterStage;
    const matchCounsellor = filterCounsellor === 'all' || s.counsellor === filterCounsellor;
    const matchYear       = filterYear === 'all' || String(s.yearLevel) === filterYear;
    return matchSearch && matchStage && matchCounsellor && matchYear;
  });

  const total      = schoolStudents.length;
  const active     = schoolStudents.filter(s => s.status === 'Active').length;
  const inProgress = schoolStudents.filter(s => s.stageProgress > 0 && s.currentStage !== 'complete').length;
  const completed  = schoolStudents.filter(s => s.currentStage === 'complete').length;

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleFilterStage = (val: string) => { setFilterStage(val); setPage(1); };
  const handleFilterYear = (val: string) => { setFilterYear(val); setPage(1); };
  const handleFilterCounsellor = (val: string) => { setFilterCounsellor(val); setPage(1); };

  // Page buttons: show up to 5 around current
  const pageNumbers: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pageNumbers.push(i);
  }

  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo   = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const metricCards = buildSchoolMetricCards(total, active, inProgress, completed);

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">
      <header className="shrink-0 bg-white border-b border-slate-200 flex items-center px-8 py-3 gap-4">
        <div className="flex flex-col min-w-0 gap-0.5 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">{school?.name ?? 'School'}</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${SCHOOL_STATUS_BADGE[school?.status ?? 'Active']}`}>
              {school?.status ?? 'Active'}
            </span>
          </div>
          <p className="text-sm text-slate-500 truncate">
            Morrisby ID:{' '}
            <span className="text-slate-800 font-medium font-mono tracking-wide">{school?.morrisbyId ?? '—'}</span>
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full px-8 py-6 flex flex-col gap-6">

          {/* ── KPI Cards ────────────────────────────────────────── */}
          <MetricCardGrid cards={metricCards} />

          {/* ── Student Table Card ───────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, ID or counsellor..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-700 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:ml-auto">
                <select
                  value={filterStage}
                  onChange={e => handleFilterStage(e.target.value)}
                  className={`${SELECT_PROGRAM_CLASS} min-w-[10.5rem]`}
                >
                  <option value="all">All Stages</option>
                  <option value="referral">Initial Intake</option>
                  <option value="consent">Consent</option>
                  <option value="career_guidance">Career Guidance</option>
                  <option value="complete">Job Ready</option>
                </select>

                <select
                  value={filterYear}
                  onChange={e => handleFilterYear(e.target.value)}
                  className={`${SELECT_PROGRAM_CLASS} min-w-[9.5rem]`}
                >
                  <option value="all">Year Level</option>
                  {yearLevels.map(y => (
                    <option key={y} value={String(y)}>{y === YEAR_LEVEL_PLUS_BUCKET ? '15+' : `Year ${y}`}</option>
                  ))}
                </select>

                <select
                  value={filterCounsellor}
                  onChange={e => handleFilterCounsellor(e.target.value)}
                  className={`${SELECT_PROGRAM_CLASS} min-w-[11rem]`}
                >
                  <option value="all">All Counsellors</option>
                  {counsellors.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Year</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Counsellor</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Current Stage</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Progress</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No students match your search.</p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((student, idx) => {
                      const atRisk   = student.riskLevel !== 'none';
                      const initials = getInitials(student);
                      const pct      = getProgressPct(student);
                      const barColor = getProgressBarColor(student);
                      const stagePill = student.currentStage ? STAGE_PILL[student.currentStage] : 'bg-slate-100 text-slate-500';
                      const stageLabel = student.currentStage ? (STAGE_LABELS[student.currentStage] ?? student.currentStage) : 'Not started';

                      return (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.025 }}
                          className={`transition-colors group ${onSelectStudent ? 'hover:bg-slate-50/70 cursor-pointer' : ''}`}
                          onClick={onSelectStudent ? () => onSelectStudent(student) : undefined}
                        >
                          {/* Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${atRisk ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0 gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                    {student.firstName} {student.lastName}
                                  </span>
                                  {atRisk && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                </div>
                                <p className="text-xs text-slate-500 tabular-nums">
                                  <span>{student.absenceCount} absence{student.absenceCount !== 1 ? 's' : ''}</span>
                                  {atRisk && (
                                    <>
                                      <span className="text-slate-300 mx-1">·</span>
                                      <span className="text-red-500/80 font-medium">At risk</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Year */}
                          <td className="px-4 py-4 text-sm text-slate-700 max-w-[10rem] truncate" title={formatYearLevelLine(student)}>
                            {formatYearLevelLine(student)}
                          </td>

                          {/* Counsellor */}
                          <td className="px-6 py-4 text-sm text-slate-700">{student.counsellor ?? '—'}</td>

                          {/* Stage */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stagePill}`}>
                              {stageLabel}
                            </span>
                          </td>

                          {/* Progress */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-slate-500 tabular-nums">{pct}%</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              student.status === 'Active'   ? 'bg-emerald-100 text-emerald-700'
                            : student.status === 'Pending' ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-500'
                            }`}>
                              {student.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            {onSelectStudent && (
                              <button
                                onClick={e => { e.stopPropagation(); onSelectStudent(student); }}
                                className="text-slate-400 hover:text-primary transition-colors"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing{' '}
                <span className="font-bold text-slate-900">{showingFrom}</span>
                {' '}to{' '}
                <span className="font-bold text-slate-900">{showingTo}</span>
                {' '}of{' '}
                <span className="font-bold text-slate-900">{filtered.length}</span>
                {' '}students
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {pageNumbers.map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                      n === currentPage
                        ? 'bg-primary text-white'
                        : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Footer timestamp */}
          <p className="text-xs text-slate-400 pb-2">
            Last synced: {format(new Date(), 'dd MMM yyyy, h:mm aa')}
          </p>

        </div>
      </div>
    </main>
  );
}
