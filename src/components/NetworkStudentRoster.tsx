import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import {
  Building2,
  Search, ChevronUp, ChevronDown, X,
  BookOpen, EyeOff,
} from 'lucide-react';
import type { School } from '../data/networkData';
import { type Student, YEAR_LEVEL_PLUS_BUCKET, formatStudentTypeLabel, formatYearLevelLine } from '../data/studentsData';
import { studentPseudonym } from '../lib/studentRedaction';
import { programmeProgressPct, ratingOverallColorClass } from '../lib/stageProgress';
import { isFlaggedForFollowUp } from '../lib/deAnalyticsMetrics';
import { hasPriorityAlertWithFlags } from '../lib/priorityAlerts';
import { useStudentRatingScores } from '../hooks/useStudentRatingScores';
import type { AppShellOutletContext } from '../routes/shellContext';
import {
  DEFAULT_ROSTER_FILTERS,
  StudentRosterAdvancedFilters,
  countActiveRosterFilters,
  studentMatchesRosterFilters,
  type RosterFilterState,
} from './StudentRosterAdvancedFilters';
import { SearchableDropdown } from './ui/SearchableDropdown';
import { StudentRosterNameMeta } from './StudentRosterNameMeta';
import { ColumnFilterDropdown, type SortDir } from './SchoolColumnFilterDropdown';

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

function rosterStageFilterLabel(key: string) {
  if (key === '__none__') return 'Not started';
  return STAGE_LABELS[key] ?? key;
}

function getReferralDateBucket(iso?: string): string {
  if (!iso?.trim()) return '__none__';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '__none__';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatReferralDateBucketLabel(bucket: string): string {
  if (bucket === '__none__') return 'No date';
  const [y, m] = bucket.split('-');
  const month = Number(m);
  const year = Number(y);
  if (!month || !year) return bucket;
  return new Date(year, month - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function formatReferralDate(iso?: string): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function referralDateSortValue(iso?: string): number {
  if (!iso?.trim()) return -1;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? -1 : t;
}

type StudentRosterColumnKey =
  | 'name'
  | 'year'
  | 'school'
  | 'counsellor'
  | 'referralDate'
  | 'stage'
  | 'score'
  | 'progress'
  | 'status';
type StudentColumnFilterValues = Partial<Record<StudentRosterColumnKey, string[]>>;

interface StudentRosterColumnDef {
  key: StudentRosterColumnKey;
  label: string;
  filterable: boolean;
  align?: 'center';
}

function buildStudentRosterColumns(showNames: boolean, hideCounsellor: boolean): StudentRosterColumnDef[] {
  const cols: StudentRosterColumnDef[] = [
    { key: 'name', label: showNames ? 'Name' : 'Student', filterable: false },
  ];
  if (showNames) cols.push({ key: 'year', label: 'Year', filterable: true });
  cols.push({ key: 'school', label: 'School', filterable: true });
  if (showNames && !hideCounsellor) cols.push({ key: 'counsellor', label: 'Counsellor', filterable: true });
  cols.push(
    { key: 'referralDate', label: 'Referral Date', filterable: true },
    { key: 'stage', label: 'Current Stage', filterable: true },
    { key: 'score', label: 'Score', filterable: false, align: 'center' },
    { key: 'progress', label: 'Progress', filterable: false },
    { key: 'status', label: 'Status', filterable: true, align: 'center' },
  );
  return cols;
}

const STUDENT_STATUS_ORDER: Record<string, number> = {
  Active: 0,
  Pending: 1,
  Inactive: 2,
};

const STAGE_SORT_ORDER: Record<string, number> = {
  __none__: -1,
  referral: 0,
  consent: 1,
  career_guidance: 2,
  complete: 3,
};

function compareStudents(
  a: Student,
  b: Student,
  key: StudentRosterColumnKey,
  dir: SortDir,
  ratingScores: Map<string, number | null | undefined>,
  schoolNameById: Map<string, string>,
  showNames: boolean,
): number {
  let cmp = 0;
  switch (key) {
    case 'name': {
      const aName = showNames
        ? `${a.lastName} ${a.firstName}`.toLowerCase()
        : a.id;
      const bName = showNames
        ? `${b.lastName} ${b.firstName}`.toLowerCase()
        : b.id;
      cmp = aName.localeCompare(bName, 'en-AU', { sensitivity: 'base' });
      break;
    }
    case 'year':
      cmp = a.yearLevel - b.yearLevel;
      break;
    case 'school': {
      const aSchool = schoolNameById.get((a as { schoolId?: string }).schoolId ?? '') ?? '';
      const bSchool = schoolNameById.get((b as { schoolId?: string }).schoolId ?? '') ?? '';
      cmp = aSchool.localeCompare(bSchool, 'en-AU', { sensitivity: 'base' });
      break;
    }
    case 'counsellor':
      cmp = (a.counsellor ?? '').localeCompare(b.counsellor ?? '', 'en-AU', { sensitivity: 'base' });
      break;
    case 'referralDate':
      cmp = referralDateSortValue(a.createdAt) - referralDateSortValue(b.createdAt);
      break;
    case 'stage': {
      const aKey = a.currentStage == null ? '__none__' : a.currentStage;
      const bKey = b.currentStage == null ? '__none__' : b.currentStage;
      cmp = (STAGE_SORT_ORDER[aKey] ?? 99) - (STAGE_SORT_ORDER[bKey] ?? 99);
      break;
    }
    case 'score': {
      const aScore = ratingScores.get(a.id) ?? -1;
      const bScore = ratingScores.get(b.id) ?? -1;
      cmp = aScore - bScore;
      break;
    }
    case 'progress':
      cmp = programmeProgressPct(a.stageProgress) - programmeProgressPct(b.stageProgress);
      break;
    case 'status':
      cmp = (STUDENT_STATUS_ORDER[a.status] ?? 99) - (STUDENT_STATUS_ORDER[b.status] ?? 99);
      break;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
  return dir === 'asc' ? cmp : -cmp;
}

function studentMatchesColumnFilters(
  student: Student,
  filters: StudentColumnFilterValues,
): boolean {
  const yearF = filters.year;
  if (yearF && yearF.length > 0 && !yearF.includes(String(student.yearLevel))) return false;

  const schoolF = filters.school;
  if (schoolF && schoolF.length > 0) {
    const schoolId = (student as { schoolId?: string }).schoolId ?? '';
    if (!schoolF.includes(schoolId)) return false;
  }

  const counsellorF = filters.counsellor;
  if (counsellorF && counsellorF.length > 0 && !counsellorF.includes(student.counsellor ?? '')) {
    return false;
  }

  const referralDateF = filters.referralDate;
  if (referralDateF && referralDateF.length > 0) {
    if (!referralDateF.includes(getReferralDateBucket(student.createdAt))) return false;
  }

  const stageF = filters.stage;
  if (stageF && stageF.length > 0) {
    const stageKey = student.currentStage == null ? '__none__' : student.currentStage;
    if (!stageF.includes(stageKey)) return false;
  }

  const statusF = filters.status;
  if (statusF && statusF.length > 0 && !statusF.includes(student.status)) return false;

  return true;
}

export interface NetworkStudentRosterProps {
  students: Student[];
  schools: School[];
  showStudentNames: boolean;
  showStudentJourney: boolean;
  onSelectStudent?: (student: Student) => void;
  /** Hide counsellor toolbar filter and table column (counsellor-scoped views). */
  hideCounsellor?: boolean;
  className?: string;
}

/** Sortable, filterable student roster table shared by Network and Counsellor views. */
export function NetworkStudentRoster({
  students,
  schools,
  showStudentNames,
  showStudentJourney,
  onSelectStudent,
  hideCounsellor = false,
  className = '',
}: NetworkStudentRosterProps) {
  const { studentEventsMap } = useOutletContext<AppShellOutletContext>();
  const studentIds = useMemo(() => students.map(s => s.id), [students]);
  const { scores: ratingScores, ratingFlags } = useStudentRatingScores(studentIds);

  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilters, setRosterFilters] = useState<RosterFilterState>(DEFAULT_ROSTER_FILTERS);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterSortKey, setRosterSortKey] = useState<StudentRosterColumnKey>('name');
  const [rosterSortDir, setRosterSortDir] = useState<SortDir>('asc');
  const [openRosterFilterKey, setOpenRosterFilterKey] = useState<StudentRosterColumnKey | null>(null);
  const [rosterFilterDropdownPos, setRosterFilterDropdownPos] = useState({ top: 0, left: 0 });
  const [rosterColumnFilters, setRosterColumnFilters] = useState<StudentColumnFilterValues>({});
  const rosterCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const studentRosterColumns = useMemo(
    () => buildStudentRosterColumns(showStudentNames, hideCounsellor),
    [showStudentNames, hideCounsellor],
  );

  const schoolNameById = useMemo(
    () => new Map(schools.map(s => [s.id, s.name])),
    [schools],
  );

  const rosterCounsellorOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map(s => s.counsellor).filter((c): c is string => Boolean(c && c.trim()))),
      ).sort((a, b) => a.localeCompare(b)),
    [students],
  );
  const rosterYearOptions = useMemo(
    () =>
      Array.from(new Set(students.map(s => s.yearLevel)))
        .filter((y): y is number => y != null && !Number.isNaN(y) && y > 0)
        .sort((a, b) => a - b),
    [students],
  );
  const rosterStageFilterKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of students) {
      keys.add(s.currentStage == null ? '__none__' : s.currentStage);
    }
    return Array.from(keys).sort((a, b) => {
      const order = (k: string) =>
        k === '__none__' ? -1 : ['referral', 'consent', 'career_guidance', 'complete'].indexOf(k);
      return order(a) - order(b);
    });
  }, [students]);

  const rosterStatusOptions = useMemo(() => {
    const present = new Set(students.map(s => s.status));
    return (['Active', 'Pending', 'Inactive'] as const).filter(st => present.has(st));
  }, [students]);

  const rosterReferralDateBuckets = useMemo(() => {
    const buckets = new Set(students.map(s => getReferralDateBucket(s.createdAt)));
    return Array.from(buckets).sort((a, b) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      return b.localeCompare(a);
    });
  }, [students]);

  const counsellorFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Counsellors' },
      ...rosterCounsellorOptions.map(c => ({ value: c, label: c })),
    ],
    [rosterCounsellorOptions],
  );

  const stageFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Stages' },
      ...rosterStageFilterKeys.map(k => ({ value: k, label: rosterStageFilterLabel(k) })),
    ],
    [rosterStageFilterKeys],
  );

  const yearFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Year Level' },
      ...rosterYearOptions.map(y => ({
        value: String(y),
        label: y === YEAR_LEVEL_PLUS_BUCKET ? '15+' : `Year ${y}`,
      })),
    ],
    [rosterYearOptions],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Statuses' },
      ...rosterStatusOptions.map(st => ({ value: st, label: st })),
    ],
    [rosterStatusOptions],
  );

  const schoolFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Schools / Campuses' },
      ...schools.map(s => ({ value: s.id, label: s.name })),
    ],
    [schools],
  );

  const rosterStudentTypeOptions = useMemo(() => {
    const types = Array.from(
      new Set(students.map(s => s.studentType).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: 'All Types' },
      ...types.map(t => ({ value: t, label: formatStudentTypeLabel(t) })),
    ];
  }, [students]);

  const rosterColumnFilterOptions = useMemo<Record<StudentRosterColumnKey, string[]>>(() => ({
    name: [],
    year: rosterYearOptions.map(String),
    school: schools.map(s => s.id),
    counsellor: rosterCounsellorOptions,
    referralDate: rosterReferralDateBuckets,
    stage: rosterStageFilterKeys,
    score: [],
    progress: [],
    status: [...rosterStatusOptions],
  }), [
    rosterYearOptions,
    schools,
    rosterCounsellorOptions,
    rosterReferralDateBuckets,
    rosterStageFilterKeys,
    rosterStatusOptions,
  ]);

  const rosterColumnFilterLabels = useMemo(
    () => ({
      year: Object.fromEntries(
        rosterYearOptions.map(y => [
          String(y),
          y === YEAR_LEVEL_PLUS_BUCKET ? '15+' : `Year ${y}`,
        ]),
      ),
      school: Object.fromEntries(schools.map(s => [s.id, s.name])),
      stage: Object.fromEntries(rosterStageFilterKeys.map(k => [k, rosterStageFilterLabel(k)])),
      referralDate: Object.fromEntries(
        rosterReferralDateBuckets.map(b => [b, formatReferralDateBucketLabel(b)]),
      ),
    }),
    [rosterYearOptions, schools, rosterStageFilterKeys, rosterReferralDateBuckets],
  );

  const scheduleRosterFilterClose = () => {
    rosterCloseTimerRef.current = setTimeout(() => setOpenRosterFilterKey(null), 160);
  };

  const cancelRosterFilterClose = () => {
    if (rosterCloseTimerRef.current) clearTimeout(rosterCloseTimerRef.current);
  };

  const handleRosterThMouseEnter = (key: StudentRosterColumnKey, thEl: HTMLTableCellElement) => {
    const col = studentRosterColumns.find(c => c.key === key);
    if (!col?.filterable || rosterColumnFilterOptions[key].length === 0) return;
    cancelRosterFilterClose();
    const rect = thEl.getBoundingClientRect();
    setRosterFilterDropdownPos({ top: rect.bottom + 2, left: rect.left });
    setOpenRosterFilterKey(key);
  };

  const toggleRosterFilterValue = (key: StudentRosterColumnKey, value: string) => {
    setRosterColumnFilters(prev => {
      const current = prev[key] ?? [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: updated };
    });
    setRosterPage(1);
  };

  const clearRosterColumnFilter = (key: StudentRosterColumnKey) => {
    setRosterColumnFilters(prev => ({ ...prev, [key]: [] }));
    setRosterPage(1);
  };

  const hasRosterColumnFilter = (key: StudentRosterColumnKey) =>
    (rosterColumnFilters[key]?.length ?? 0) > 0;

  const hasAnyRosterColumnFilter = Object.values(rosterColumnFilters).some(
    (f): f is string[] => Array.isArray(f) && f.length > 0,
  );

  const handleRosterSort = (key: StudentRosterColumnKey) => {
    setOpenRosterFilterKey(null);
    if (rosterSortKey === key) {
      setRosterSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setRosterSortKey(key);
      setRosterSortDir('asc');
    }
    setRosterPage(1);
  };

  const showCounsellorFilter = showStudentNames && !hideCounsellor;

  const activeRosterToolbarFilters = countActiveRosterFilters(rosterFilters, {
    showCounsellor: showCounsellorFilter,
    showYear: showStudentNames,
    showSchool: true,
  });

  const hasRosterViewReset =
    Boolean(rosterSearch) ||
    activeRosterToolbarFilters > 0 ||
    hasAnyRosterColumnFilter ||
    rosterSortKey !== 'name' ||
    rosterSortDir !== 'asc';

  const resetRosterView = () => {
    setRosterSearch('');
    setRosterFilters(DEFAULT_ROSTER_FILTERS);
    setRosterColumnFilters({});
    setRosterSortKey('name');
    setRosterSortDir('asc');
    setOpenRosterFilterKey(null);
    setRosterPage(1);
  };

  const filteredRoster = useMemo(() => {
    const matched = students.filter(s => {
      const q = rosterSearch.toLowerCase();
      const matchSearch = showStudentNames
        ? `${s.firstName} ${s.lastName} ${s.preferredName ?? ''}`.toLowerCase().includes(q) ||
          s.morrisbyId.toLowerCase().includes(q) ||
          (s.counsellor ?? '').toLowerCase().includes(q)
        : studentPseudonym(s.id).toLowerCase().includes(q) ||
          (schools.find(sc => sc.id === (s as { schoolId?: string }).schoolId)?.name ?? '')
            .toLowerCase()
            .includes(q);
      const schoolId = (s as { schoolId?: string }).schoolId;
      return (
        matchSearch &&
        studentMatchesRosterFilters(s, rosterFilters, { schoolId }) &&
        studentMatchesColumnFilters(s, rosterColumnFilters)
      );
    });

    return [...matched].sort((a, b) =>
      compareStudents(a, b, rosterSortKey, rosterSortDir, ratingScores, schoolNameById, showStudentNames),
    );
  }, [
    students,
    rosterSearch,
    showStudentNames,
    schools,
    rosterFilters,
    rosterColumnFilters,
    rosterSortKey,
    rosterSortDir,
    ratingScores,
    schoolNameById,
  ]);

  const totalRosterPages = Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE));
  const safeRosterPage   = Math.min(rosterPage, totalRosterPages);
  const rosterSlice      = filteredRoster.slice((safeRosterPage - 1) * PAGE_SIZE, safeRosterPage * PAGE_SIZE);

  const handleRosterSearch = (v: string) => { setRosterSearch(v); setRosterPage(1); };
  const handleRosterFilters = (patch: Partial<RosterFilterState>) => {
    setRosterFilters(f => ({ ...f, ...patch }));
    setRosterPage(1);
  };
  const resetRosterFilters = () => {
    setRosterFilters(DEFAULT_ROSTER_FILTERS);
    setRosterPage(1);
  };

  const rosterShowingFrom = filteredRoster.length === 0 ? 0 : (safeRosterPage - 1) * PAGE_SIZE + 1;
  const rosterShowingTo   = Math.min(safeRosterPage * PAGE_SIZE, filteredRoster.length);

  const rosterPageNumbers: number[] = [];
  for (let i = Math.max(1, safeRosterPage - 2); i <= Math.min(totalRosterPages, safeRosterPage + 2); i++) {
    rosterPageNumbers.push(i);
  }

  const minTableWidth = showStudentNames
    ? (hideCounsellor ? 'min-w-[820px]' : 'min-w-[920px]')
    : 'min-w-[660px]';

  return (
    <>
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative w-full lg:w-96 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                showStudentNames
                  ? 'Search students by name, ID or counsellor...'
                  : 'Search by pseudonym or school...'
              }
              value={rosterSearch}
              onChange={e => handleRosterSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-700 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:flex-1 lg:min-w-0 ${showStudentNames ? (hideCounsellor ? 'lg:grid-cols-4' : 'lg:grid-cols-5') : 'lg:grid-cols-3'}`}>
            {showCounsellorFilter && (
              <SearchableDropdown
                value={rosterFilters.counsellor}
                onChange={v => handleRosterFilters({ counsellor: v })}
                options={counsellorFilterOptions}
                placeholder="All Counsellors"
                searchPlaceholder="Search counsellors…"
                panelWidthClass="w-56"
              />
            )}
            <SearchableDropdown
              value={rosterFilters.stage}
              onChange={v => handleRosterFilters({ stage: v })}
              options={stageFilterOptions}
              placeholder="All Stages"
              searchPlaceholder="Search stages…"
              panelWidthClass="w-56"
            />
            {showStudentNames && (
              <SearchableDropdown
                value={rosterFilters.year}
                onChange={v => handleRosterFilters({ year: v })}
                options={yearFilterOptions}
                placeholder="Year Level"
                searchPlaceholder="Search year levels…"
                panelWidthClass="w-48"
              />
            )}
            <SearchableDropdown
              value={rosterFilters.status}
              onChange={v => handleRosterFilters({ status: v })}
              options={statusFilterOptions}
              placeholder="All Statuses"
              searchPlaceholder="Search statuses…"
              panelWidthClass="w-48"
            />
            <SearchableDropdown
              value={rosterFilters.school}
              onChange={v => handleRosterFilters({ school: v })}
              options={schoolFilterOptions}
              placeholder="All Schools / Campuses"
              searchPlaceholder="Search schools / campuses…"
              panelWidthClass="w-64"
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <StudentRosterAdvancedFilters
            filters={rosterFilters}
            onChange={handleRosterFilters}
            onReset={resetRosterFilters}
            showCounsellor={showCounsellorFilter}
            showYear={showStudentNames}
            showSchool
            counsellorOptions={counsellorFilterOptions}
            stageOptions={stageFilterOptions}
            yearOptions={yearFilterOptions}
            statusOptions={statusFilterOptions}
            schoolOptions={schoolFilterOptions}
            studentTypeOptions={rosterStudentTypeOptions}
            className="shrink-0"
          />

          {hasRosterViewReset && (
            <button
              type="button"
              onClick={resetRosterView}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-all duration-150 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {rosterFilters.school !== 'all' && (() => {
          const s = schools.find(sc => sc.id === rosterFilters.school);
          return s ? (
            <div className="px-6 py-3 bg-primary/5 border-b border-primary/20 flex items-center gap-3">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-primary">{s.name}</span>
              <span className="text-xs text-slate-400">{s.morrisbyId}</span>
              <span className="ml-auto text-xs text-slate-500">{filteredRoster.length} student{filteredRoster.length !== 1 ? 's' : ''}</span>
            </div>
          ) : null;
        })()}

        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${minTableWidth}`}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {studentRosterColumns.map(({ key, label, filterable, align }) => {
                  const active = rosterSortKey === key;
                  const SortIcon = active && rosterSortDir === 'desc' ? ChevronDown : ChevronUp;
                  const filterActive = filterable && hasRosterColumnFilter(key);
                  return (
                    <th
                      key={key}
                      className={`px-4 py-3 whitespace-nowrap ${align === 'center' ? 'text-center' : ''} ${key === 'year' ? '!px-3' : ''}`}
                      onMouseEnter={filterable ? e => handleRosterThMouseEnter(key, e.currentTarget) : undefined}
                      onMouseLeave={filterable ? scheduleRosterFilterClose : undefined}
                    >
                      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
                        <button
                          type="button"
                          onClick={() => handleRosterSort(key)}
                          aria-sort={active ? (rosterSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
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
              {rosterSlice.length === 0 ? (
                <tr>
                  <td colSpan={studentRosterColumns.length} className="py-16 text-center">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No students match your search or filters.</p>
                  </td>
                </tr>
              ) : (
                rosterSlice.map((student, idx) => {
                  const atRisk     = isFlaggedForFollowUp(student);
                  const needsAttention = hasPriorityAlertWithFlags(
                    student,
                    studentEventsMap[student.id] ?? [],
                    ratingFlags.get(student.id),
                  );
                  const initials   = getInitials(student);
                  const pct        = programmeProgressPct(student.stageProgress);
                  const score      = student.scoreEligible ? ratingScores.get(student.id) : undefined;
                  const barColor   = student.currentStage === 'complete' ? 'bg-emerald-500' : needsAttention ? 'bg-rose-400' : atRisk ? 'bg-red-400' : 'bg-primary';
                  const stagePill  = student.currentStage ? (STAGE_PILL[student.currentStage] ?? 'bg-slate-100 text-slate-500') : 'bg-slate-100 text-slate-500';
                  const stageLabel = student.currentStage ? (STAGE_LABELS[student.currentStage] ?? student.currentStage) : 'Not started';
                  const schoolName = schools.find(sc => sc.id === (student as { schoolId?: string }).schoolId)?.name ?? '—';

                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12, delay: idx * 0.02 }}
                      className={`transition-colors group ${showStudentJourney ? 'hover:bg-slate-50/70 cursor-pointer' : ''}`}
                      onClick={showStudentJourney && onSelectStudent ? () => onSelectStudent(student) : undefined}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            needsAttention ? 'bg-rose-50 text-rose-600' : atRisk ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {showStudentNames ? initials : <EyeOff className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-slate-900 ${showStudentJourney ? 'group-hover:text-primary transition-colors' : ''}`}>
                                {showStudentNames
                                  ? `${student.firstName} ${student.lastName}`
                                  : studentPseudonym(student.id)}
                              </span>
                            </div>
                            <StudentRosterNameMeta
                              student={student}
                              showFollowUp={atRisk}
                              showNeedsAttention={needsAttention}
                            />
                          </div>
                        </div>
                      </td>

                      {showStudentNames && (
                        <td className="px-3 py-4 text-sm text-slate-700 max-w-[10rem] truncate" title={formatYearLevelLine(student)}>
                          {formatYearLevelLine(student)}
                        </td>
                      )}

                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 truncate max-w-[140px] block">{schoolName}</span>
                      </td>

                      {showStudentNames && !hideCounsellor && (
                        <td className="px-4 py-4 text-sm text-slate-600">{student.counsellor ?? '—'}</td>
                      )}

                      <td className="px-4 py-4 text-sm text-slate-600 tabular-nums whitespace-nowrap">
                        {formatReferralDate(student.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stagePill}`}>
                          {stageLabel}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-center">
                        {score != null ? (
                          <span className={`text-sm font-bold tabular-nums ${ratingOverallColorClass(score)}`}>
                            {score}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-500 tabular-nums">{pct}%</span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          student.status === 'Active'   ? 'bg-emerald-100 text-emerald-700'
                        : student.status === 'Pending'  ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
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
              type="button"
              onClick={() => setRosterPage(p => Math.max(1, p - 1))}
              disabled={safeRosterPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {rosterPageNumbers.map(n => (
              <button
                key={n}
                type="button"
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
              type="button"
              onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
              disabled={safeRosterPage === totalRosterPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {openRosterFilterKey && (
        <ColumnFilterDropdown
          openFilterKey={openRosterFilterKey}
          columnLabel={
            studentRosterColumns.find(c => c.key === openRosterFilterKey)?.label ?? openRosterFilterKey
          }
          filterDropdownPos={rosterFilterDropdownPos}
          columnFilters={rosterColumnFilters}
          columnFilterOptions={rosterColumnFilterOptions}
          onMouseEnter={cancelRosterFilterClose}
          onMouseLeave={scheduleRosterFilterClose}
          onClear={clearRosterColumnFilter}
          onToggleValue={toggleRosterFilterValue}
          hasColumnFilter={hasRosterColumnFilter}
          getOptionLabel={(key, value) =>
            rosterColumnFilterLabels[key as keyof typeof rosterColumnFilterLabels]?.[value] ?? value
          }
        />
      )}
    </>
  );
}
