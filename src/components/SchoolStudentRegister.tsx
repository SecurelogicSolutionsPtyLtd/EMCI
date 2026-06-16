import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, MoreVertical, AlertTriangle, BookOpen } from 'lucide-react';
import { type Student, YEAR_LEVEL_PLUS_BUCKET, formatYearLevelLine } from '../data/studentsData';
import { programmeProgressPct } from '../lib/stageProgress';
import {
  DEFAULT_ROSTER_FILTERS,
  StudentRosterAdvancedFilters,
  studentMatchesRosterFilters,
  type RosterFilterState,
} from './StudentRosterAdvancedFilters';
import { SearchableDropdown } from './ui/SearchableDropdown';

interface SchoolStudentRegisterProps {
  students: Student[];
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

function getInitials(student: Student) {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

function getProgressBarColor(student: Student) {
  if (student.currentStage === 'complete') return 'bg-emerald-500';
  if (student.riskLevel !== 'none') return 'bg-red-400';
  return 'bg-primary';
}

/** School cohort roster card: search/filter toolbar, table, and pagination. */
export function SchoolStudentRegister({ students, onSelectStudent }: SchoolStudentRegisterProps) {
  const [search, setSearch] = useState('');
  const [rosterFilters, setRosterFilters] = useState<RosterFilterState>(DEFAULT_ROSTER_FILTERS);
  const [page, setPage] = useState(1);

  const counsellors = Array.from(new Set(students.map(s => s.counsellor).filter(Boolean)));
  const yearLevels  = Array.from(new Set(students.map(s => s.yearLevel).filter(y => y > 0))).sort((a, b) => a - b);

  const stageFilterOptions = useMemo(() => {
    const keys = new Set(students.map(s => (s.currentStage == null ? '__none__' : s.currentStage)));
    const label = (k: string) => (k === '__none__' ? 'Not started' : (STAGE_LABELS[k] ?? k));
    return [
      { value: 'all', label: 'All Stages' },
      ...Array.from(keys)
        .sort((a, b) => {
          const order = (k: string) =>
            k === '__none__' ? -1 : ['referral', 'consent', 'career_guidance', 'complete'].indexOf(k);
          return order(a) - order(b);
        })
        .map(k => ({ value: k, label: label(k) })),
    ];
  }, [students]);

  const statusFilterOptions = useMemo(() => {
    const statuses = Array.from(new Set(students.map(s => s.status))).sort();
    return [{ value: 'all', label: 'All Statuses' }, ...statuses.map(st => ({ value: st, label: st }))];
  }, [students]);

  const studentTypeFilterOptions = useMemo(() => {
    const types = Array.from(new Set(students.map(s => s.studentType).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', label: 'All Types' }, ...types.map(t => ({ value: t, label: t }))];
  }, [students]);

  const yearFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Year Level' },
      ...yearLevels.map(y => ({
        value: String(y),
        label: y === YEAR_LEVEL_PLUS_BUCKET ? '15+' : `Year ${y}`,
      })),
    ],
    [yearLevels],
  );

  const counsellorFilterOptions = useMemo(
    () => [{ value: 'all', label: 'All Counsellors' }, ...counsellors.map(c => ({ value: c, label: c }))],
    [counsellors],
  );

  const filtered = students.filter(s => {
    const name = `${s.firstName} ${s.lastName} ${s.preferredName ?? ''}`.toLowerCase();
    const matchSearch =
      name.includes(search.toLowerCase()) ||
      s.morrisbyId.toLowerCase().includes(search.toLowerCase()) ||
      (s.counsellor ?? '').toLowerCase().includes(search.toLowerCase());
    const schoolId = (s as { schoolId?: string }).schoolId;
    return matchSearch && studentMatchesRosterFilters(s, rosterFilters, { schoolId });
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleRosterFilters = (patch: Partial<RosterFilterState>) => {
    setRosterFilters(f => ({ ...f, ...patch }));
    setPage(1);
  };
  const resetRosterFilters = () => {
    setRosterFilters(DEFAULT_ROSTER_FILTERS);
    setPage(1);
  };

  const pageNumbers: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pageNumbers.push(i);
  }

  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo   = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-700 placeholder:text-slate-400 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full lg:flex lg:flex-wrap lg:items-center lg:flex-1 lg:justify-end lg:min-w-0">
          <SearchableDropdown
            value={rosterFilters.stage}
            onChange={v => handleRosterFilters({ stage: v })}
            options={stageFilterOptions}
            placeholder="All Stages"
            searchPlaceholder="Search stages…"
            panelWidthClass="w-56"
            triggerClassName="w-full min-w-0 lg:min-w-[10.5rem]"
          />
          <SearchableDropdown
            value={rosterFilters.year}
            onChange={v => handleRosterFilters({ year: v })}
            options={yearFilterOptions}
            placeholder="Year Level"
            searchPlaceholder="Search year levels…"
            panelWidthClass="w-48"
            triggerClassName="w-full min-w-0 lg:min-w-[9.5rem]"
          />
          <SearchableDropdown
            value={rosterFilters.counsellor}
            onChange={v => handleRosterFilters({ counsellor: v })}
            options={counsellorFilterOptions}
            placeholder="All Counsellors"
            searchPlaceholder="Search counsellors…"
            panelWidthClass="w-56"
            triggerClassName="w-full min-w-0 lg:min-w-[11rem]"
          />
          <StudentRosterAdvancedFilters
            filters={rosterFilters}
            onChange={handleRosterFilters}
            onReset={resetRosterFilters}
            showSchool={false}
            counsellorOptions={counsellorFilterOptions}
            stageOptions={stageFilterOptions}
            yearOptions={yearFilterOptions}
            statusOptions={statusFilterOptions}
            studentTypeOptions={studentTypeFilterOptions}
            className="col-span-2 sm:col-span-1 w-full sm:w-auto shrink-0"
          />
        </div>
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden divide-y divide-slate-100">
        {paginated.length === 0 ? (
          <div className="py-16 text-center px-4">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No students match your search.</p>
          </div>
        ) : (
          paginated.map((student, idx) => {
            const atRisk     = student.riskLevel !== 'none';
            const initials   = getInitials(student);
            const pct        = programmeProgressPct(student.stageProgress);
            const barColor   = getProgressBarColor(student);
            const stagePill  = student.currentStage ? STAGE_PILL[student.currentStage] : 'bg-slate-100 text-slate-500';
            const stageLabel = student.currentStage ? (STAGE_LABELS[student.currentStage] ?? student.currentStage) : 'Not started';

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.025 }}
                className={`p-4 ${onSelectStudent ? 'hover:bg-slate-50/70 cursor-pointer active:bg-slate-50' : ''}`}
                onClick={onSelectStudent ? () => onSelectStudent(student) : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${atRisk ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {student.firstName} {student.lastName}
                          </span>
                          {atRisk && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatYearLevelLine(student)} · {student.counsellor ?? '—'}
                        </p>
                      </div>
                      {onSelectStudent && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onSelectStudent(student); }}
                          className="text-slate-400 hover:text-primary transition-colors shrink-0 p-1 -mr-1"
                          aria-label={`Open ${student.firstName} ${student.lastName}`}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stagePill}`}>
                        {stageLabel}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        student.status === 'Active'   ? 'bg-emerald-100 text-emerald-700'
                      : student.status === 'Pending' ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                      }`}>
                        {student.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">{pct}%</span>
                    </div>

                    {(student.absenceCount > 0 || atRisk) && (
                      <p className="text-xs text-slate-500 mt-2 tabular-nums">
                        <span>{student.absenceCount} absence{student.absenceCount !== 1 ? 's' : ''}</span>
                        {atRisk && (
                          <>
                            <span className="text-slate-300 mx-1">·</span>
                            <span className="text-red-500/80 font-medium">At risk</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
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
                const atRisk     = student.riskLevel !== 'none';
                const initials   = getInitials(student);
                const pct        = programmeProgressPct(student.stageProgress);
                const barColor   = getProgressBarColor(student);
                const stagePill  = student.currentStage ? STAGE_PILL[student.currentStage] : 'bg-slate-100 text-slate-500';
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

                    <td className="px-4 py-4 text-sm text-slate-700 max-w-[10rem] truncate" title={formatYearLevelLine(student)}>
                      {formatYearLevelLine(student)}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">{student.counsellor ?? '—'}</td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stagePill}`}>
                        {stageLabel}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 tabular-nums">{pct}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        student.status === 'Active'   ? 'bg-emerald-100 text-emerald-700'
                      : student.status === 'Pending' ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                      }`}>
                        {student.status}
                      </span>
                    </td>

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
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500 text-center sm:text-left">
          Showing{' '}
          <span className="font-bold text-slate-900">{showingFrom}</span>
          {' '}to{' '}
          <span className="font-bold text-slate-900">{showingTo}</span>
          {' '}of{' '}
          <span className="font-bold text-slate-900">{filtered.length}</span>
          {' '}students
        </p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
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
  );
}
