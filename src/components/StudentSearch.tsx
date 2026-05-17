import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Search, Users, X, ChevronDown, ChevronUp,
  CheckCircle2, Circle, AlertCircle, Shield, Star, UserCheck,
  Building2, BookOpen, Filter, SlidersHorizontal, RotateCcw,
} from 'lucide-react';
import { type Student, YEAR_LEVEL_PLUS_BUCKET, formatYearLevelLine } from '../data/studentsData';
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
  { key: 'riskLevel',       label: 'Risk Level',        type: 'select' },
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

        {/* Risk */}
        <div className="w-20 shrink-0">
          <Badge cls={RISK_COLORS[student.riskLevel]}>
            {student.riskLevel === 'none' ? 'None' : student.riskLevel.charAt(0).toUpperCase() + student.riskLevel.slice(1)}
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
                  { label: 'Risk Level',       value: student.riskLevel },
                  { label: 'Student Type',     value: student.studentType },
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

// ── Filter dropdown ────────────────────────────────────────────────────────

function FilterDropdown({
  label, options, value, onChange, icon: Icon, formatOption,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
  /** Optional display transform (filter value stays `options` entry). */
  formatOption?: (opt: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const isActive = value !== '';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setSearch(''); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
          isActive
            ? 'bg-violet-500 text-white border-violet-500'
            : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
        }`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span className="max-w-[100px] truncate">{isActive ? (formatOption ? formatOption(value) : value) : label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-full mt-1 z-50 w-52 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          >
            {options.length > 6 && (
              <div className="px-2 pt-2 pb-1 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 placeholder-slate-400"
                  />
                </div>
              </div>
            )}
            <div className="max-h-48 overflow-y-auto py-1">
              {isActive && (
                <button
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">No matches</p>
              ) : (
                filtered.map(opt => (
                  <button
                    key={opt}
                    onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      value === opt ? 'font-bold text-violet-600 bg-violet-50' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {formatOption ? formatOption(opt) : opt}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
                <FilterDropdown
                  label="Year Level"
                  options={yearOptions}
                  value={yearFilter}
                  onChange={setYearFilter}
                  icon={BookOpen}
                  formatOption={v =>
                    v === String(YEAR_LEVEL_PLUS_BUCKET) ? '15+' : `Year ${v}`
                  }
                />
                <FilterDropdown label="Status"      options={statusOptions}     value={statusFilter}     onChange={setStatusFilter}     icon={AlertCircle}/>
                <FilterDropdown label="Stage"       options={stageOptions}      value={stageFilter}      onChange={setStageFilter}      icon={Shield}     />
                <FilterDropdown label="Risk Level"  options={riskOptions}       value={riskFilter}       onChange={setRiskFilter}       icon={AlertCircle}/>
                <FilterDropdown label="Counsellor"  options={counsellorOptions} value={counsellorFilter} onChange={setCounsellorFilter} icon={UserCheck}  />
                <FilterDropdown label="School"      options={schoolOptions}     value={schoolFilter}     onChange={setSchoolFilter}     icon={Building2}  />
                <FilterDropdown label="Student Type"options={typeOptions}       value={typeFilter}       onChange={setTypeFilter}       icon={Users}      />
                <FilterDropdown label="Interviewed" options={['Yes', 'No']}     value={interviewedFilter}onChange={setInterviewedFilter}icon={CheckCircle2}/>
                <FilterDropdown label="Has Profile" options={['Yes', 'No']}     value={profileFilter}    onChange={setProfileFilter}    icon={Star}       />
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk</span>
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
