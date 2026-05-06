import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard, Building2, Users, UserCheck, Settings,
  Search, Bell, ChevronLeft, ChevronRight, Network, FlaskConical,
  AlertTriangle, BookOpen, MoreVertical, UsersRound,
} from 'lucide-react';
import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import type { AppRole } from '../types/roles';
import { canAccessPage, canSeeStudentNames, isAdminRole, getRoleGroup, ROLE_LABELS } from '../types/roles';
import { useAuth } from '../context/AuthContext';

interface NetworkOverviewProps {
  students: Student[];
  schools: School[];
  userRole: AppRole;
  onSelectSchool: (school: School) => void;
  onSelectStudent: (student: Student) => void;
  onGoToCounsellors: () => void;
  onGoToDevLab: () => void;
  onGoToTeam: () => void;
}

const PAGE_SIZE = 10;

const STATUS_DOT: Record<string, { dot: string; text: string }> = {
  Active:     { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Onboarding: { dot: 'bg-primary',     text: 'text-primary'     },
  Inactive:   { dot: 'bg-slate-400',   text: 'text-slate-500'   },
};

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

function schoolStats(schoolId: string, students: Student[]) {
  const ss        = students.filter(s => (s as any).schoolId === schoolId);
  const total     = ss.length;
  const completed = ss.filter(s => s.currentStage === 'complete').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
}

function getInitials(student: Student) {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

type View = 'schools' | 'students';

export function NetworkOverview({
  students, schools, userRole, onSelectSchool, onSelectStudent,
  onGoToCounsellors, onGoToDevLab, onGoToTeam,
}: NetworkOverviewProps) {
  const { authUser } = useAuth();
  const showStudentNames = canSeeStudentNames(userRole);
  const showCounsellors  = canAccessPage(userRole, 'counsellors');
  const showDevLab       = canAccessPage(userRole, 'devlab');
  const showStudentJourney = canAccessPage(userRole, 'student');
  const showTeam         = isAdminRole(userRole);
  // ── view switcher ─────────────────────────────────────────────
  const [view, setView] = useState<View>('schools');

  // ── schools view state ────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [page,         setPage]         = useState(1);

  // ── student roster state ──────────────────────────────────────
  const [rosterSearch, setRosterSearch]     = useState('');
  const [rosterSchool, setRosterSchool]     = useState('all');
  const [rosterPage,   setRosterPage]       = useState(1);

  // ── KPI values ───────────────────────────────────────────────
  const totalSchools    = schools.length;
  const totalStudents   = students.length;
  const totalActive     = students.filter(s => s.status === 'Active').length;
  const totalInProgress = students.filter(s => s.stageProgress > 0 && s.currentStage !== 'complete').length;
  const totalCompleted  = students.filter(s => s.currentStage === 'complete').length;
  const completedPct    = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;
  const totalCounsellors = Array.from(new Set(students.map(s => s.counsellor).filter(Boolean))).length;

  const regions = ['all', ...Array.from(new Set(schools.map(s => s.region))).sort()];

  // ── schools filter ────────────────────────────────────────────
  const filteredSchools = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.morrisbyId.toLowerCase().includes(search.toLowerCase());
    const matchRegion = regionFilter === 'all' || s.region === regionFilter;
    return matchSearch && matchRegion;
  });

  const totalSchoolPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  const safePage         = Math.min(page, totalSchoolPages);
  const pageSlice        = filteredSchools.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleRegion = (v: string) => { setRegionFilter(prev => prev === v ? 'all' : v); setPage(1); };

  // ── student roster filter ─────────────────────────────────────
  const filteredRoster = students.filter(s => {
    const name    = `${s.firstName} ${s.lastName} ${s.preferredName ?? ''}`.toLowerCase();
    const matchSearch = name.includes(rosterSearch.toLowerCase()) ||
                        s.morrisbyId.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                        (s.counsellor ?? '').toLowerCase().includes(rosterSearch.toLowerCase());
    const matchSchool = rosterSchool === 'all' || (s as any).schoolId === rosterSchool;
    return matchSearch && matchSchool;
  });

  const totalRosterPages = Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE));
  const safeRosterPage   = Math.min(rosterPage, totalRosterPages);
  const rosterSlice      = filteredRoster.slice((safeRosterPage - 1) * PAGE_SIZE, safeRosterPage * PAGE_SIZE);

  const handleRosterSearch = (v: string) => { setRosterSearch(v); setRosterPage(1); };
  const handleRosterSchool = (v: string) => { setRosterSchool(v); setRosterPage(1); };

  const rosterShowingFrom = filteredRoster.length === 0 ? 0 : (safeRosterPage - 1) * PAGE_SIZE + 1;
  const rosterShowingTo   = Math.min(safeRosterPage * PAGE_SIZE, filteredRoster.length);

  const rosterPageNumbers: number[] = [];
  for (let i = Math.max(1, safeRosterPage - 2); i <= Math.min(totalRosterPages, safeRosterPage + 2); i++) {
    rosterPageNumbers.push(i);
  }

  const KPIS = [
    { label: 'Total Schools',   value: totalSchools,                         highlight: false },
    { label: 'Total Students',  value: totalStudents.toLocaleString(),       highlight: false },
    { label: 'Active Students', value: totalActive.toLocaleString(),         highlight: false },
    { label: 'In Progress',     value: totalInProgress.toLocaleString(),     highlight: false },
    { label: 'Completed %',     value: `${completedPct}%`,                  highlight: true  },
    { label: 'Counsellors',     value: totalCounsellors,                    highlight: false },
  ];

  // ── nav items (role-filtered) ─────────────────────────────────
  const NAV_ITEMS = [
    { label: 'Dashboard',   icon: LayoutDashboard, viewKey: null       as View | null, always: true },
    { label: 'Schools',     icon: Building2,       viewKey: 'schools'  as View | null, always: true },
    { label: 'Students',    icon: Users,           viewKey: 'students' as View | null, always: true },
    { label: 'Counsellors', icon: UserCheck,       viewKey: null       as View | null, always: false, show: showCounsellors },
  ].filter(item => item.always || item.show);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Left Sidebar ──────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">

        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2 text-white shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">EMCI</h1>
            <p className="text-xs text-slate-500">Network Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {NAV_ITEMS.map(item => {
            const isActive = item.viewKey === view || (view === 'schools' && item.label === 'Dashboard');
            const handleClick =
              item.label === 'Counsellors' ? onGoToCounsellors
              : item.viewKey              ? () => setView(item.viewKey as View)
              : undefined;
            return (
              <button
                key={item.label}
                onClick={handleClick}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </button>
            );
          })}

          {/* Dataverse Lab — ACCE only */}
          {showDevLab && (
            <button
              onClick={onGoToDevLab}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <FlaskConical className="w-5 h-5 shrink-0" />
              Dataverse Lab
            </button>
          )}

          {/* Team Management — admins only */}
          {showTeam && (
            <button
              onClick={onGoToTeam}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <UsersRound className="w-5 h-5 shrink-0" />
              Team Management
            </button>
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white text-xs font-bold">
              {(authUser?.firstName ?? authUser?.email ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{authUser?.displayName ?? authUser?.email ?? '—'}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[userRole]}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ════════════════════════════════════════════════════════
            SCHOOLS VIEW
            ════════════════════════════════════════════════════ */}
        {view === 'schools' && (
          <>
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-6 flex-1">
                <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">Network Overview</h2>
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search schools or IDs..."
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Region pills */}
                <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
                  {regions.filter(r => r !== 'all').map(r => (
                    <button
                      key={r}
                      onClick={() => handleRegion(r)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all
                        ${regionFilter === r ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
                </button>
              </div>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">

              {/* KPI strip */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-6 divide-x divide-slate-100">
                  {KPIS.map((k, i) => (
                    <motion.div
                      key={k.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-6 hover:bg-slate-50/50 transition-colors"
                    >
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                      <h3 className={`text-3xl font-bold tracking-tight ${k.highlight ? 'text-primary' : 'text-slate-900'}`}>
                        {k.value}
                      </h3>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Schools table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['School Name', 'Morrisby ID', 'Status', 'Programme Completion', 'Total Students'].map(h => (
                          <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageSlice.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">
                            No schools match your search.
                          </td>
                        </tr>
                      ) : (
                        pageSlice.map((school, idx) => {
                          const stats  = schoolStats(school.id, students);
                          const status = STATUS_DOT[school.status] ?? STATUS_DOT.Inactive;
                          return (
                            <motion.tr
                              key={school.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.12, delay: idx * 0.03 }}
                              onClick={() => onSelectSchool(school)}
                              className="hover:bg-slate-50 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-5">
                                <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                  {school.name}
                                </span>
                              </td>
                              <td className="px-6 py-5 font-mono text-sm text-slate-500">{school.morrisbyId}</td>
                              <td className="px-6 py-5">
                                <div className={`flex items-center gap-1.5 text-xs font-bold ${status.text}`}>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                                  {school.status}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3 w-48">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${stats.pct}%` }}
                                      transition={{ duration: 0.6, delay: idx * 0.03 }}
                                      className="h-full bg-primary rounded-full"
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 w-8 text-right shrink-0">{stats.pct}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-sm font-semibold text-slate-900">{stats.total.toLocaleString()}</span>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Schools pagination */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing {pageSlice.length} of {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <span className="text-xs font-medium text-slate-500 px-1">{safePage} / {totalSchoolPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalSchoolPages, p + 1))}
                      disabled={safePage >= totalSchoolPages}
                      className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            STUDENT ROSTER VIEW
            ════════════════════════════════════════════════════ */}
        {view === 'students' && (
          <>
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-6 flex-1">
                <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">Student Roster</h2>

                {/* Search */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or counsellor..."
                    value={rosterSearch}
                    onChange={e => handleRosterSearch(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 text-slate-700"
                  />
                </div>

                {/* School dropdown */}
                <select
                  value={rosterSchool}
                  onChange={e => handleRosterSchool(e.target.value)}
                  className="text-sm rounded-lg bg-slate-100 border-none py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-700 cursor-pointer min-w-[180px]"
                >
                  <option value="all">All Schools</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
              </button>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Selected school info strip */}
                {rosterSchool !== 'all' && (() => {
                  const s = schools.find(sc => sc.id === rosterSchool);
                  return s ? (
                    <div className="px-6 py-3 bg-primary/5 border-b border-primary/20 flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-semibold text-primary">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.morrisbyId}</span>
                      <span className="ml-auto text-xs text-slate-500">{filteredRoster.length} student{filteredRoster.length !== 1 ? 's' : ''}</span>
                    </div>
                  ) : null;
                })()}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Year</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">School</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Counsellor</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stage</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rosterSlice.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center">
                            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">No students match your search.</p>
                          </td>
                        </tr>
                      ) : (
                        rosterSlice.map((student, idx) => {
                          const atRisk     = student.riskLevel !== 'none';
                          const initials   = getInitials(student);
                          const pct        = Math.round((student.stageProgress / 4) * 100);
                          const barColor   = student.currentStage === 'complete' ? 'bg-emerald-500' : atRisk ? 'bg-red-400' : 'bg-primary';
                          const stagePill  = student.currentStage ? (STAGE_PILL[student.currentStage] ?? 'bg-slate-100 text-slate-500') : 'bg-slate-100 text-slate-500';
                          const stageLabel = student.currentStage ? (STAGE_LABELS[student.currentStage] ?? student.currentStage) : 'Not started';
                          const schoolName = schools.find(sc => sc.id === (student as any).schoolId)?.name ?? '—';

                          return (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.12, delay: idx * 0.02 }}
                              className={`transition-colors group ${showStudentJourney ? 'hover:bg-slate-50/70 cursor-pointer' : ''}`}
                              onClick={showStudentJourney ? () => onSelectStudent(student) : undefined}
                            >
                              {/* Name */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${atRisk ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {showStudentNames ? initials : '—'}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold text-slate-900 ${showStudentJourney ? 'group-hover:text-primary transition-colors' : ''}`}>
                                        {showStudentNames ? `${student.firstName} ${student.lastName}` : '— Redacted —'}
                                      </span>
                                      {atRisk && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                    </div>
                                    {atRisk
                                      ? <span className="text-xs text-red-500/80 font-medium">At Risk</span>
                                      : <span className="text-xs text-slate-400 font-mono">{showStudentNames ? student.morrisbyId : '—'}</span>
                                    }
                                  </div>
                                </div>
                              </td>

                              {/* Year */}
                              <td className="px-4 py-4 text-sm text-slate-700">{showStudentNames ? student.yearLevel : '—'}</td>

                              {/* School */}
                              <td className="px-6 py-4">
                                <span className="text-sm text-slate-600 truncate max-w-[140px] block">{schoolName}</span>
                              </td>

                              {/* Counsellor */}
                              <td className="px-6 py-4 text-sm text-slate-600">{showStudentNames ? (student.counsellor ?? '—') : '—'}</td>

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
                                : student.status === 'Pending'  ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {student.status}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-right">
                                {showStudentJourney && (
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

                {/* Roster pagination */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing{' '}
                    <span className="font-bold text-slate-900">{rosterShowingFrom}</span>
                    {' '}to{' '}
                    <span className="font-bold text-slate-900">{rosterShowingTo}</span>
                    {' '}of{' '}
                    <span className="font-bold text-slate-900">{filteredRoster.length}</span>
                    {' '}students
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                      disabled={safeRosterPage === 1}
                      className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    {rosterPageNumbers.map(n => (
                      <button
                        key={n}
                        onClick={() => setRosterPage(n)}
                        className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                          n === safeRosterPage
                            ? 'bg-primary text-white'
                            : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
                      disabled={safeRosterPage === totalRosterPages}
                      className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
