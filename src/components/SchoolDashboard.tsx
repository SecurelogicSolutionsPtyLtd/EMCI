import React, { useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  Search, Users, CheckCircle2, Clock, Award,
  Bell, Settings, ChevronRight, ArrowLeft,
  MoreVertical, AlertTriangle, Building2,
  BookOpen,
} from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { School } from '../data/networkData';

interface SchoolDashboardProps {
  students: Student[];
  school: School | null;
  onSelectStudent?: (student: Student) => void;
  onBack: () => void;
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

export function SchoolDashboard({ students, school, onSelectStudent, onBack }: SchoolDashboardProps) {
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

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Top Navigation ───────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between bg-white border-b border-slate-200 px-6 lg:px-10 py-3">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <span className="text-slate-900 text-lg font-bold leading-tight tracking-tight">EMCI Platform</span>
          </div>
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {['Dashboard', 'Schools', 'Students', 'Reports'].map(item => (
              <span
                key={item}
                className={
                  item === 'Schools'
                    ? 'text-primary text-sm font-bold border-b-2 border-primary pb-1 cursor-default'
                    : 'text-slate-500 text-sm font-medium cursor-default'
                }
              >
                {item}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:flex items-center h-10 min-w-40 max-w-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <div className="pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              className="flex-1 bg-slate-50 text-sm px-2 py-2 border-none outline-none placeholder:text-slate-400 text-slate-900"
              placeholder="Global search..."
            />
          </div>
          {/* Icon buttons */}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
            <img src="https://picsum.photos/seed/admin/100/100" alt="User avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* ── Scrollable content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-[1280px] mx-auto w-full px-6 py-6 flex flex-col gap-6">

          {/* ── Breadcrumb + Heading ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <nav className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <button onClick={onBack} className="hover:text-primary transition-colors">Network</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900">{school?.name ?? 'School'}</span>
            </nav>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{school?.name ?? 'School'}</h1>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${SCHOOL_STATUS_BADGE[school?.status ?? 'Active']}`}>
                    {school?.status ?? 'Active'}
                  </span>
                </div>
                <p className="text-slate-500 text-base">
                  Morrisby ID: <span className="text-slate-900 font-medium tracking-wide">{school?.morrisbyId ?? '—'}</span>
                </p>
              </div>
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Network
              </button>
            </div>
          </div>

          {/* ── KPI Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Students',
                value: total,
                icon: Users,
                iconColor: 'text-primary/60',
                barColor: 'bg-primary',
                barPct: 100,
              },
              {
                label: 'Active',
                value: active,
                icon: CheckCircle2,
                iconColor: 'text-emerald-500/60',
                barColor: 'bg-emerald-500',
                barPct: total > 0 ? Math.round((active / total) * 100) : 0,
              },
              {
                label: 'In Progress',
                value: inProgress,
                icon: Clock,
                iconColor: 'text-blue-500/60',
                barColor: 'bg-blue-500',
                barPct: total > 0 ? Math.round((inProgress / total) * 100) : 0,
              },
              {
                label: 'Completed',
                value: completed,
                icon: Award,
                iconColor: 'text-amber-500/60',
                barColor: 'bg-amber-500',
                barPct: total > 0 ? Math.round((completed / total) * 100) : 0,
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex flex-col gap-2 rounded-xl p-5 bg-white border border-slate-200 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <p className="text-slate-900 text-3xl font-bold tracking-tight">{stat.value.toLocaleString()}</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-1">
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
                  className="text-sm rounded-lg bg-slate-50 border border-slate-200 py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700 cursor-pointer"
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
                  className="text-sm rounded-lg bg-slate-50 border border-slate-200 py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700 cursor-pointer"
                >
                  <option value="all">Year Level</option>
                  {yearLevels.map(y => (
                    <option key={y} value={String(y)}>Year {y}</option>
                  ))}
                </select>

                <select
                  value={filterCounsellor}
                  onChange={e => handleFilterCounsellor(e.target.value)}
                  className="text-sm rounded-lg bg-slate-50 border border-slate-200 py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700 cursor-pointer"
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
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                    {student.firstName} {student.lastName}
                                  </span>
                                  {atRisk && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Year */}
                          <td className="px-4 py-4 text-sm text-slate-700">{student.yearLevel}</td>

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

        </main>
      </div>
    </div>
  );
}
