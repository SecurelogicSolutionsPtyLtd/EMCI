import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Search, Users, X, ChevronUp,
  CheckCircle2, Circle, BookOpen, SlidersHorizontal, RotateCcw, Star,
} from 'lucide-react';
import { SearchableDropdown } from './ui/SearchableDropdown';
import { type Student, YEAR_LEVEL_PLUS_BUCKET, formatFollowUpLevelLabel, formatStudentTypeLabel, formatYearLevelLine } from '../data/studentsData';
import type { School } from '../data/networkData';

interface StudentSearchProps {
  students: Student[];
  schools: School[];
  onBack: () => void;
}

// ── Field definitions ──────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  referral: 'Referral', consent: 'Consent',
  career_guidance: 'Career Guidance', complete: 'Complete',
};
const STAGE_COLORS: Record<string, string> = {
  referral:        'bg-primary/10 text-primary border-primary/20',
  consent:         'bg-violet-50 text-violet-700 border-violet-200',
  career_guidance: 'bg-amber-50 text-amber-700 border-amber-200',
  complete:        'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const RISK_COLORS: Record<string, string> = {
  high:   'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  none:   'bg-slate-50 text-slate-500 border-slate-200',
};
const STATUS_COLORS: Record<string, string> = {
  Active:   'text-emerald-600',
  Inactive: 'text-slate-400',
  Pending:  'text-amber-600',
};

// All searchable / filterable fields
const ALL_FIELDS: { key: keyof Student | '_schoolName'; label: string; type: 'text' | 'select' | 'bool' }[] = [
  { key: 'firstName',       label: 'First Name',        type: 'text'   },
  { key: 'lastName',        label: 'Last Name',         type: 'text'   },
  { key: 'preferredName',   label: 'Preferred Name',    type: 'text'   },
  { key: 'morrisbyId',      label: 'Morrisby ID',       type: 'text'   },
  { key: 'email',           label: 'Email',             type: 'text'   },
  { key: 'yearLevel',       label: 'Year Level',        type: 'select' },
  { key: 'status',          label: 'Status',            type: 'select' },
  { key: 'currentStage',    label: 'Current Stage',     type: 'select' },
  { key: 'riskLevel',       label: 'Follow Up',         type: 'select' },
  { key: 'counsellor',      label: 'Counsellor',        type: 'select' },
  { key: '_schoolName',     label: 'School',            type: 'select' },
  { key: 'studentType',     label: 'Student Type',      type: 'select' },
  { key: 'interviewed',     label: 'Interviewed',       type: 'bool'   },
  { key: 'hasProfile',      label: 'Has Profile',       type: 'bool'   },
];

interface ActiveFilter {
  id: string;
  field: string;
  label: string;
  value: string;
  display: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function StudentRow({
  student, school, index, isExpanded, onToggle,
}: {
  student: Student; school: School | undefined; index: number;
  isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="border-b border-slate-100 last:border-0"
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-violet-600">
            {student.firstName[0]}{student.lastName[0]}
          </span>
        </div>

        {/* Name */}
        <div className="w-44 shrink-0">
          <p className="text-xs font-semibold text-slate-800 truncate">
            {student.firstName} {student.lastName}
            {student.preferredName && student.preferredName !== student.firstName && (
              <span className="text-slate-400 font-normal"> ({student.preferredName})</span>
            )}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">{student.morrisbyId}</p>
        </div>

        {/* Year */}
        <div className="w-16 shrink-0 text-center min-w-0">
          <span className="text-[10px] font-semibold text-slate-600 truncate block" title={formatYearLevelLine(student)}>
            {formatYearLevelLine(student)}
          </span>
        </div>

        {/* School */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 truncate">{school?.name ?? '—'}</p>
        </div>

        {/* Stage */}
        <div className="w-32 shrink-0">
          {student.currentStage ? (
            <Badge cls={STAGE_COLORS[student.currentStage]}>
              {STAGE_LABELS[student.currentStage]}
            </Badge>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Not started</span>
          )}
        </div>

        {/* Follow Up */}
        <div className="w-20 shrink-0">
          <Badge cls={RISK_COLORS[student.riskLevel]}>
            {formatFollowUpLevelLabel(student.riskLevel)}
          </Badge>
        </div>

        {/* Status */}
        <div className="w-16 shrink-0">
          <span className={`text-[10px] font-semibold ${STATUS_COLORS[student.status]}`}>
            {student.status}
          </span>
        </div>

        {/* Flags */}
        <div className="flex items-center gap-1.5 shrink-0 w-12">
          <CheckCircle2 className={`w-3.5 h-3.5 ${student.interviewed ? 'text-emerald-500' : 'text-slate-200'}`} />
          <Star className={`w-3.5 h-3.5 ${student.hasProfile ? 'text-amber-400' : 'text-slate-200'}`} />
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-slate-400">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded detail panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-2 bg-slate-50/60 border-t border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { label: 'Full Name',        value: `${student.firstName} ${student.lastName}` },
                  { label: 'Preferred Name',   value: student.preferredName ?? '—' },
                  { label: 'Morrisby ID',      value: student.morrisbyId },
                  { label: 'Email',            value: student.email ?? '—' },
                  { label: 'Year Level',       value: student.yearLevelLabel ?? `Year ${student.yearLevel}` },
                  { label: 'School',           value: school?.name ?? '—' },
                  { label: 'Counsellor',       value: student.counsellor },
                  { label: 'Status',           value: student.status },
                  { label: 'Stage',            value: student.currentStage ? STAGE_LABELS[student.currentStage] : 'Not started' },
                  { label: 'Stage Progress',   value: `${student.stageProgress} / 4` },
                  { label: 'Follow Up',        value: formatFollowUpLevelLabel(student.riskLevel) },
                  { label: 'Student Type',     value: formatStudentTypeLabel(student.studentType) },
                  { label: 'Interviewed',      value: student.interviewed ? 'Yes' : 'No' },
                  { label: 'Has Profile',      value: student.hasProfile ? 'Yes' : 'No' },
                  { label: 'Last Activity',    value: student.lastActivity ?? '—' },
                  { label: 'Record ID',        value: student.id },
                ].map(f => (
                  <div key={f.label} className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{f.label}</p>
                    <p className="text-xs font-semibold text-slate-700 break-all leading-snug">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function StudentSearch({ students, schools, onBack }: StudentSearchProps) {
  const [query, setQuery]               = useState('');
  const [yearFilter, setYearFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter]   = useState('');
  const [riskFilter, setRiskFilter]     = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [interviewedFilter, setInterviewedFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showFilters, setShowFilters]   = useState(true);

  // Unique filter options
  const yearOptions      = useMemo(
    () =>
      Array.from(new Set(students.map(s => String(s.yearLevel)).filter(Boolean))).sort(
        (a, b) => Number(a) - Number(b),
      ),
    [students],
  );
  const statusOptions    = useMemo(() => Array.from(new Set(students.map(s => s.status))).sort(), [students]);
  const stageOptions     = useMemo(() => ['Not started', ...Array.from(new Set(students.filter(s => s.currentStage).map(s => STAGE_LABELS[s.currentStage!]))).sort()], [students]);
  const riskOptions      = useMemo(() => Array.from(new Set(students.map(s => s.riskLevel))).sort(), [students]);
  const counsellorOptions= useMemo(() => Array.from(new Set(students.map(s => s.counsellor).filter(Boolean))).sort(), [students]);
  const schoolOptions    = useMemo(() => Array.from(new Set(students.map(s => { const sc = schools.find(sc => sc.id === (s as any).schoolId); return sc?.name ?? ''; }).filter(Boolean))).sort(), [students, schools]);
  const typeOptions      = useMemo(() => Array.from(new Set(students.map(s => s.studentType).filter(Boolean))).sort(), [students]);

  const activeFilterCount = [yearFilter, statusFilter, stageFilter, riskFilter, counsellorFilter, schoolFilter, typeFilter, interviewedFilter, profileFilter].filter(Boolean).length;

  const yearFilterDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Year Level' },
      ...yearOptions.map(y => ({
        value: y,
        label: y === String(YEAR_LEVEL_PLUS_BUCKET) ? '15+' : `Year ${y}`,
      })),
    ],
    [yearOptions],
  );

  const statusFilterDropdownOptions = useMemo(
    () => [{ value: '', label: 'Status' }, ...statusOptions.map(s => ({ value: s, label: s }))],
    [statusOptions],
  );

  const stageFilterDropdownOptions = useMemo(
    () => [{ value: '', label: 'Stage' }, ...stageOptions.map(s => ({ value: s, label: s }))],
    [stageOptions],
  );

  const riskFilterDropdownOptions = useMemo(
    () => [{ value: '', label: 'Follow Up' }, ...riskOptions.map(r => ({ value: r, label: formatFollowUpLevelLabel(r) }))],
    [riskOptions],
  );

  const counsellorFilterDropdownOptions = useMemo(
    () => [{ value: '', label: 'Counsellor' }, ...counsellorOptions.map(c => ({ value: c, label: c }))],
    [counsellorOptions],
  );

  const schoolFilterDropdownOptions = useMemo(
    () => [{ value: '', label: 'School' }, ...schoolOptions.map(s => ({ value: s, label: s }))],
    [schoolOptions],
  );

  const typeFilterDropdownOptions = useMemo(
    () => [{ value: '', label: 'Student Type' }, ...typeOptions.map(t => ({ value: t, label: formatStudentTypeLabel(t) }))],
    [typeOptions],
  );

  const yesNoFilterOptions = (label: string) => [
    { value: '', label },
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ];

  function resetFilters() {
    setQuery(''); setYearFilter(''); setStatusFilter(''); setStageFilter('');
    setRiskFilter(''); setCounsellorFilter(''); setSchoolFilter('');
    setTypeFilter(''); setInterviewedFilter(''); setProfileFilter('');
  }

  // Filtered results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return students.filter(s => {
      const school = schools.find(sc => sc.id === (s as any).schoolId);
      const schoolName = school?.name ?? '';

      // Free text: searches across all text fields
      if (q) {
        const haystack = [
          s.firstName, s.lastName, s.preferredName ?? '',
          s.morrisbyId, s.email ?? '', s.counsellor,
          schoolName, s.studentType, s.id,
          s.yearLevelLabel ?? '',
          s.currentStage ? STAGE_LABELS[s.currentStage] : '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (yearFilter       && String(s.yearLevel) !== yearFilter)                           return false;
      if (statusFilter     && s.status !== statusFilter)                                    return false;
      if (stageFilter) {
        if (stageFilter === 'Not started' && s.currentStage)                               return false;
        if (stageFilter !== 'Not started' && (!s.currentStage || STAGE_LABELS[s.currentStage] !== stageFilter)) return false;
      }
      if (riskFilter       && s.riskLevel !== riskFilter)                                   return false;
      if (counsellorFilter && s.counsellor !== counsellorFilter)                            return false;
      if (schoolFilter     && schoolName !== schoolFilter)                                   return false;
      if (typeFilter       && s.studentType !== typeFilter)                                  return false;
      if (interviewedFilter && (interviewedFilter === 'Yes') !== s.interviewed)             return false;
      if (profileFilter    && (profileFilter === 'Yes') !== s.hasProfile)                   return false;

      return true;
    });
  }, [students, schools, query, yearFilter, statusFilter, stageFilter, riskFilter, counsellorFilter, schoolFilter, typeFilter, interviewedFilter, profileFilter]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          DevLab
        </button>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-800">Student Search</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {results.length} of {students.length} students
          </span>
          {(activeFilterCount > 0 || query) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Search + filters bar ─────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 space-y-3">

        {/* Free text search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, Morrisby ID, counsellor, school, student type…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder-slate-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors ${
              showFilters ? 'bg-violet-50 border-violet-200 text-violet-600' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-violet-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter dropdowns */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-1">
                <SearchableDropdown allValue="" value={yearFilter} onChange={setYearFilter} options={yearFilterDropdownOptions} placeholder="Year Level" searchPlaceholder="Search year levels…" panelWidthClass="w-48" />
                <SearchableDropdown allValue="" value={statusFilter} onChange={setStatusFilter} options={statusFilterDropdownOptions} placeholder="Status" searchPlaceholder="Search statuses…" panelWidthClass="w-48" />
                <SearchableDropdown allValue="" value={stageFilter} onChange={setStageFilter} options={stageFilterDropdownOptions} placeholder="Stage" searchPlaceholder="Search stages…" panelWidthClass="w-52" />
                <SearchableDropdown allValue="" value={riskFilter} onChange={setRiskFilter} options={riskFilterDropdownOptions} placeholder="Follow Up" searchPlaceholder="Search follow up levels…" panelWidthClass="w-48" />
                <SearchableDropdown allValue="" value={counsellorFilter} onChange={setCounsellorFilter} options={counsellorFilterDropdownOptions} placeholder="Counsellor" searchPlaceholder="Search counsellors…" panelWidthClass="w-56" />
                <SearchableDropdown allValue="" value={schoolFilter} onChange={setSchoolFilter} options={schoolFilterDropdownOptions} placeholder="School" searchPlaceholder="Search schools / campuses…" panelWidthClass="w-64" />
                <SearchableDropdown allValue="" value={typeFilter} onChange={setTypeFilter} options={typeFilterDropdownOptions} placeholder="Student Type" searchPlaceholder="Search types…" panelWidthClass="w-52" />
                <SearchableDropdown allValue="" value={interviewedFilter} onChange={setInterviewedFilter} options={yesNoFilterOptions('Interviewed')} placeholder="Interviewed" searchable={false} panelWidthClass="w-40" />
                <SearchableDropdown allValue="" value={profileFilter} onChange={setProfileFilter} options={yesNoFilterOptions('Has Profile')} placeholder="Has Profile" searchable={false} panelWidthClass="w-40" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Results table ────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Column headers */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-2 grid grid-cols-[32px_176px_56px_1fr_128px_80px_64px_48px_20px] gap-3 items-center">
          <div />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Year</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">School</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Follow Up</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flags</span>
          <div />
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto bg-white">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Users className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-400">
                {students.length === 0 ? 'No student data loaded.' : 'No students match the current filters.'}
              </p>
              {(activeFilterCount > 0 || query) && (
                <button onClick={resetFilters} className="text-xs text-violet-500 hover:text-violet-700 underline">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="sync">
              {results.map((student, i) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  school={schools.find(sc => sc.id === (student as any).schoolId)}
                  index={i}
                  isExpanded={expandedId === student.id}
                  onToggle={() => setExpandedId(expandedId === student.id ? null : student.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer count */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-100 px-5 py-2 flex items-center gap-4 text-[10px] text-slate-400">
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Interviewed</div>
          <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Has Morrisby profile</div>
          <span className="ml-auto">Click any row to expand all fields</span>
        </div>
      </div>
    </div>
  );
}
