import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X,
} from 'lucide-react';
import type { School } from '../data/networkData';
import { type Student } from '../data/studentsData';
import type { AppRole } from '../types/roles';
import { canAccessPage, canSeeStudentNames, canViewStudentRoster } from '../types/roles';
import { useAuth } from '../context/AuthContext';
import type { NetworkMainTab } from './layout/MainSidebar';
import { buildProgramKpiCards, getProgramVisibleScope, resolveProgramStatsOptions } from '../lib/networkProgramMetrics';
import { filterViewableSchools } from '../lib/programStatsFilters';
import { getRoleGroup } from '../types/roles';
import type { TeamMember, InactiveCounsellorOverride } from '../services/supabase';
import type { OwnerLookup } from '../services/dataverse';
import {
  SchoolColumnFilterDropdown,
  SCHOOL_TABLE_COLUMNS,
  type SchoolSortKey,
  type SortDir,
  type ColumnFilterValues,
} from './SchoolColumnFilterDropdown';
import { NetworkStudentRoster } from './NetworkStudentRoster';

interface NetworkOverviewProps {
  students: Student[];
  schools: School[];
  userRole: AppRole;
  teamMembers?: TeamMember[];
  ownerMap?: OwnerLookup;
  inactiveCounsellorOverrides?: InactiveCounsellorOverride[];
  networkTab: NetworkMainTab;
  onNetworkTabChange: (tab: NetworkMainTab) => void;
  onSelectSchool: (school: School) => void;
  onSelectStudent: (student: Student) => void;
}

const PAGE_SIZE = 10;

const STATUS_DOT: Record<string, { dot: string; text: string }> = {
  Active:     { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Onboarding: { dot: 'bg-primary',     text: 'text-primary'     },
  Inactive:   { dot: 'bg-slate-400',   text: 'text-slate-500'   },
};

function schoolStats(schoolId: string, students: Student[]) {
  const ss        = students.filter(s => (s as any).schoolId === schoolId);
  const total     = ss.length;
  const completed = ss.filter(s => s.currentStage === 'complete').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
}

const SCHOOL_STATUS_ORDER: Record<School['status'], number> = {
  Active: 0,
  Onboarding: 1,
  Inactive: 2,
};

const COMPLETION_BUCKET_ORDER = ['0%', '1–24%', '25–49%', '50–74%', '75–99%', '100%'];
const STUDENTS_BUCKET_ORDER   = ['0', '1–25', '26–50', '51–100', '101+'];

function getCompletionBucket(pct: number): string {
  if (pct === 0)    return '0%';
  if (pct < 25)     return '1–24%';
  if (pct < 50)     return '25–49%';
  if (pct < 75)     return '50–74%';
  if (pct < 100)    return '75–99%';
  return '100%';
}

function getStudentsBucket(total: number): string {
  if (total === 0)  return '0';
  if (total <= 25)  return '1–25';
  if (total <= 50)  return '26–50';
  if (total <= 100) return '51–100';
  return '101+';
}

function compareSchools(
  a: School,
  b: School,
  key: SchoolSortKey,
  dir: SortDir,
  students: Student[],
): number {
  let cmp = 0;
  switch (key) {
    case 'name':
      cmp = a.name.localeCompare(b.name, 'en-AU', { sensitivity: 'base' });
      break;
    case 'morrisbyId':
      cmp = a.morrisbyId.localeCompare(b.morrisbyId, 'en-AU', { sensitivity: 'base' });
      break;
    case 'status':
      cmp = SCHOOL_STATUS_ORDER[a.status] - SCHOOL_STATUS_ORDER[b.status];
      break;
    case 'completion':
      cmp = schoolStats(a.id, students).pct - schoolStats(b.id, students).pct;
      break;
    case 'students':
      cmp = schoolStats(a.id, students).total - schoolStats(b.id, students).total;
      break;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
  return dir === 'asc' ? cmp : -cmp;
}

type View = 'schools' | 'students';

export function NetworkOverview({
  students, schools, userRole, teamMembers = [], ownerMap, inactiveCounsellorOverrides = [], networkTab, onNetworkTabChange,
  onSelectSchool, onSelectStudent,
}: NetworkOverviewProps) {
  const { schoolId, counsellorScope } = useAuth();
  const showStudentNames   = canSeeStudentNames(userRole);
  const showStudentRoster  = canViewStudentRoster(userRole);
  const showStudentJourney = canAccessPage(userRole, 'student', counsellorScope);
  const canOpenSchoolDashboard = canAccessPage(userRole, 'school', counsellorScope);

  const { visibleSchools, visibleStudents } = getProgramVisibleScope(
    students,
    schools,
    userRole,
    schoolId,
    counsellorScope,
  );

  const directorySchools = useMemo(() => {
    const retainSchoolId = getRoleGroup(userRole) === 'school' && schoolId ? schoolId : null;
    return filterViewableSchools(visibleSchools, { retainSchoolId });
  }, [visibleSchools, userRole, schoolId]);

  // ── schools view state ────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const [schoolSortKey, setSchoolSortKey] = useState<SchoolSortKey>('name');
  const [schoolSortDir, setSchoolSortDir] = useState<SortDir>('asc');
  const [openFilterKey,    setOpenFilterKey]    = useState<SchoolSortKey | null>(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });
  const [columnFilters,    setColumnFilters]    = useState<ColumnFilterValues>({});
  const closeTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── schools filter options (per-column dropdown data) ───────
  const schoolColumnFilterOptions = useMemo<Record<SchoolSortKey, string[]>>(() => {
    const statsBySchoolId = new Map<string, ReturnType<typeof schoolStats>>(
      directorySchools.map(s => [s.id, schoolStats(s.id, students)]),
    );
    const completionBuckets = Array.from(
      new Set<string>(directorySchools.map(s => getCompletionBucket(statsBySchoolId.get(s.id)!.pct))),
    ).sort((a, b) => COMPLETION_BUCKET_ORDER.indexOf(a) - COMPLETION_BUCKET_ORDER.indexOf(b));
    const studentsBuckets = Array.from(
      new Set<string>(directorySchools.map(s => getStudentsBucket(statsBySchoolId.get(s.id)!.total))),
    ).sort((a, b) => STUDENTS_BUCKET_ORDER.indexOf(a) - STUDENTS_BUCKET_ORDER.indexOf(b));
    return {
      name:       directorySchools.map(s => s.name).sort((a, b) => a.localeCompare(b, 'en-AU', { sensitivity: 'base' })),
      morrisbyId: directorySchools.map(s => s.morrisbyId).sort(),
      status:     (['Active', 'Onboarding', 'Inactive'] as School['status'][]).filter(
                    st => directorySchools.some(s => s.status === st),
                  ),
      completion: completionBuckets,
      students:   studentsBuckets,
    };
  }, [directorySchools, students]);

  // ── schools filter ────────────────────────────────────────────
  const filteredSchools = useMemo(
    () =>
      directorySchools.filter(s => {
        const q = search.toLowerCase();
        if (!(s.name.toLowerCase().includes(q) || s.morrisbyId.toLowerCase().includes(q))) return false;

        const nameF = columnFilters.name;
        if (nameF && nameF.length > 0 && !nameF.includes(s.name)) return false;

        const midF = columnFilters.morrisbyId;
        if (midF && midF.length > 0 && !midF.includes(s.morrisbyId)) return false;

        const stF = columnFilters.status;
        if (stF && stF.length > 0 && !stF.includes(s.status)) return false;

        const compF = columnFilters.completion;
        if (compF && compF.length > 0) {
          const pct = schoolStats(s.id, students).pct;
          if (!compF.includes(getCompletionBucket(pct))) return false;
        }

        const stuF = columnFilters.students;
        if (stuF && stuF.length > 0) {
          const total = schoolStats(s.id, students).total;
          if (!stuF.includes(getStudentsBucket(total))) return false;
        }

        return true;
      }),
    [directorySchools, search, columnFilters, students],
  );

  const sortedSchools = useMemo(
    () =>
      [...filteredSchools].sort((a, b) =>
        compareSchools(a, b, schoolSortKey, schoolSortDir, students),
      ),
    [filteredSchools, schoolSortKey, schoolSortDir, students],
  );

  const totalSchoolPages = Math.max(1, Math.ceil(sortedSchools.length / PAGE_SIZE));
  const safePage         = Math.min(page, totalSchoolPages);
  const pageSlice        = sortedSchools.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const handleSchoolSort = (key: SchoolSortKey) => {
    setOpenFilterKey(null);
    if (schoolSortKey === key) {
      setSchoolSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSchoolSortKey(key);
      setSchoolSortDir('asc');
    }
    setPage(1);
  };

  const scheduleFilterClose = () => {
    closeTimerRef.current = setTimeout(() => setOpenFilterKey(null), 160);
  };

  const cancelFilterClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handleThMouseEnter = (key: SchoolSortKey, thEl: HTMLTableCellElement) => {
    cancelFilterClose();
    const rect = thEl.getBoundingClientRect();
    setFilterDropdownPos({ top: rect.bottom + 2, left: rect.left });
    setOpenFilterKey(key);
  };

  const toggleFilterValue = (key: SchoolSortKey, value: string) => {    setColumnFilters(prev => {
      const current = prev[key] ?? [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: updated };
    });
    setPage(1);
  };

  const clearColumnFilter = (key: SchoolSortKey) => {
    setColumnFilters(prev => ({ ...prev, [key]: [] }));
    setPage(1);
  };

  const hasColumnFilter  = (key: SchoolSortKey) => (columnFilters[key]?.length ?? 0) > 0;
  const hasAnyColumnFilter = Object.values(columnFilters).some(
    (f): f is string[] => Array.isArray(f) && f.length > 0,
  );

  const KPIS = buildProgramKpiCards(
    directorySchools,
    visibleStudents,
    resolveProgramStatsOptions(teamMembers, ownerMap, inactiveCounsellorOverrides),
  );

  // Clamp the active view if the role can't see the roster.
  // Using a derived value avoids a setState-during-render loop.
  const effectiveView: View = networkTab === 'students' && !showStudentRoster ? 'schools' : networkTab;

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">

        {/* ════════════════════════════════════════════════════════
            SCHOOLS VIEW
            ════════════════════════════════════════════════════ */}
        {effectiveView === 'schools' && (
          <>
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">Schools / Campuses</h2>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">

              {/* KPI strip */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 divide-x divide-y xl:divide-y-0 divide-slate-100">
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
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search schools / campuses by name or Morrisby ID…"
                      value={search}
                      onChange={e => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-700 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  {(search || schoolSortKey !== 'name' || schoolSortDir !== 'asc' || hasAnyColumnFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSchoolSortKey('name');
                        setSchoolSortDir('asc');
                        setColumnFilters({});
                        setOpenFilterKey(null);
                        setPage(1);
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-all duration-150 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {SCHOOL_TABLE_COLUMNS.map(({ key, label }) => {
                          const active = schoolSortKey === key;
                          const SortIcon = active && schoolSortDir === 'desc' ? ChevronDown : ChevronUp;
                          const filterActive = hasColumnFilter(key);
                          return (
                            <th
                              key={key}
                              className="px-6 py-3 whitespace-nowrap"
                              onMouseEnter={e => handleThMouseEnter(key, e.currentTarget)}
                              onMouseLeave={scheduleFilterClose}
                            >
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSchoolSort(key)}
                                  aria-sort={active ? (schoolSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                                  className={`group/sort inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-all duration-150 ${
                                    active
                                      ? 'text-primary bg-primary/8'
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                                  }`}
                                >
                                  {label}
                                  <SortIcon
                                    className={`w-3.5 h-3.5 shrink-0 transition-opacity duration-150 ${
                                      active ? 'opacity-100 text-primary' : 'opacity-25 group-hover/sort:opacity-60'
                                    }`}
                                  />
                                </button>
                                {filterActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Filter active" />
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageSlice.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">
                            No schools / campuses match your search.
                          </td>
                        </tr>
                      ) : (
                        pageSlice.map((school, idx) => {
                          const stats  = schoolStats(school.id, students);
                          const status = STATUS_DOT[school.status] ?? STATUS_DOT.Inactive;
                          return (
                            <motion.tr
                              key={school.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                              onClick={canOpenSchoolDashboard ? () => onSelectSchool(school) : undefined}
                              className={`transition-colors group ${canOpenSchoolDashboard ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
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
                                <span className="text-sm font-semibold text-slate-900">{stats.total.toLocaleString('en-AU')}</span>
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
                    Showing {pageSlice.length} of {sortedSchools.length} schools / campuses
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

            {/* Column filter dropdown — fixed-positioned so it escapes the overflow-x-auto table */}
            {openFilterKey && (
              <SchoolColumnFilterDropdown
                openFilterKey={openFilterKey}
                filterDropdownPos={filterDropdownPos}
                columnFilters={columnFilters}
                schoolColumnFilterOptions={schoolColumnFilterOptions}
                onMouseEnter={cancelFilterClose}
                onMouseLeave={scheduleFilterClose}
                onClear={clearColumnFilter}
                onToggleValue={toggleFilterValue}
                hasColumnFilter={hasColumnFilter}
              />
            )}
          </>
        )}

        {effectiveView === 'students' && (
          <>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-8 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">Students</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <NetworkStudentRoster
                students={visibleStudents}
                schools={directorySchools}
                showStudentNames={showStudentNames}
                showStudentJourney={showStudentJourney}
                onSelectStudent={onSelectStudent}
              />
            </div>
          </>
        )}

    </main>
  );
}
