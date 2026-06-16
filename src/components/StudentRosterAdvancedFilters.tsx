import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ListFilter, RotateCcw } from 'lucide-react';
import { SearchableDropdown } from './ui/SearchableDropdown';
import type { SearchableDropdownOption } from './ui/SearchableDropdown';

export interface RosterFilterState {
  counsellor: string;
  stage: string;
  year: string;
  status: string;
  school: string;
  risk: string;
  studentType: string;
  interviewed: string;
  hasProfile: string;
  progress: string;
}

export const DEFAULT_ROSTER_FILTERS: RosterFilterState = {
  counsellor: 'all',
  stage: 'all',
  year: 'all',
  status: 'all',
  school: 'all',
  risk: 'all',
  studentType: 'all',
  interviewed: 'all',
  hasProfile: 'all',
  progress: 'all',
};

export function countActiveRosterFilters(
  filters: RosterFilterState,
  opts?: { showCounsellor?: boolean; showYear?: boolean; showSchool?: boolean },
): number {
  const showCounsellor = opts?.showCounsellor ?? true;
  const showYear = opts?.showYear ?? true;
  const showSchool = opts?.showSchool ?? true;
  let n = 0;
  if (showCounsellor && filters.counsellor !== 'all') n++;
  if (filters.stage !== 'all') n++;
  if (showYear && filters.year !== 'all') n++;
  if (filters.status !== 'all') n++;
  if (showSchool && filters.school !== 'all') n++;
  if (filters.risk !== 'all') n++;
  if (filters.studentType !== 'all') n++;
  if (filters.interviewed !== 'all') n++;
  if (filters.hasProfile !== 'all') n++;
  if (filters.progress !== 'all') n++;
  return n;
}

const PROGRESS_OPTIONS: SearchableDropdownOption[] = [
  { value: 'all', label: 'Any progress' },
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete', label: 'Job ready' },
];

const RISK_OPTIONS: SearchableDropdownOption[] = [
  { value: 'all', label: 'Any risk' },
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function triOptions(label: string): SearchableDropdownOption[] {
  return [
    { value: 'all', label: `Any — ${label}` },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];
}

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
}

function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}

export interface StudentRosterAdvancedFiltersProps {
  filters: RosterFilterState;
  onChange: (patch: Partial<RosterFilterState>) => void;
  onReset: () => void;
  showCounsellor?: boolean;
  showYear?: boolean;
  showSchool?: boolean;
  counsellorOptions?: SearchableDropdownOption[];
  stageOptions: SearchableDropdownOption[];
  yearOptions?: SearchableDropdownOption[];
  statusOptions: SearchableDropdownOption[];
  schoolOptions?: SearchableDropdownOption[];
  studentTypeOptions: SearchableDropdownOption[];
  className?: string;
}

export function StudentRosterAdvancedFilters({
  filters,
  onChange,
  onReset,
  showCounsellor = true,
  showYear = true,
  showSchool = true,
  counsellorOptions = [],
  stageOptions,
  yearOptions = [],
  statusOptions,
  schoolOptions = [],
  studentTypeOptions,
  className = '',
}: StudentRosterAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeCount = useMemo(
    () =>
      countActiveRosterFilters(filters, {
        showCounsellor,
        showYear,
        showSchool,
      }),
    [filters, showCounsellor, showYear, showSchool],
  );

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, []);

  function patch(patch: Partial<RosterFilterState>) {
    onChange(patch);
  }

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`group flex items-center gap-2 h-[38px] px-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
          open || activeCount > 0
            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <ListFilter
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? 'rotate-90' : 'group-hover:scale-105'
          }`}
        />
        <span>Filters</span>
        <AnimatePresence mode="popLayout">
          {activeCount > 0 && (
            <motion.span
              key={activeCount}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                open || activeCount > 0
                  ? 'bg-white/20 text-white'
                  : 'bg-primary text-white'
              }`}
            >
              {activeCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Advanced student filters"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,28rem)] origin-top-right"
          >
            <div className="rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col max-h-[min(70vh,26rem)]">
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Filter students</p>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FilterField label="Stage">
                  <SearchableDropdown
                    value={filters.stage}
                    onChange={v => patch({ stage: v })}
                    options={stageOptions}
                    placeholder="All stages"
                    searchPlaceholder="Search stages…"
                    panelWidthClass="w-56"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>

                <FilterField label="Status">
                  <SearchableDropdown
                    value={filters.status}
                    onChange={v => patch({ status: v })}
                    options={statusOptions}
                    placeholder="All statuses"
                    searchPlaceholder="Search statuses…"
                    panelWidthClass="w-48"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>

                <FilterField label="Progress">
                  <SearchableDropdown
                    value={filters.progress}
                    onChange={v => patch({ progress: v })}
                    options={PROGRESS_OPTIONS}
                    placeholder="Any progress"
                    searchable={false}
                    panelWidthClass="w-52"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>

                <FilterField label="Risk level">
                  <SearchableDropdown
                    value={filters.risk}
                    onChange={v => patch({ risk: v })}
                    options={RISK_OPTIONS}
                    placeholder="Any risk"
                    searchable={false}
                    panelWidthClass="w-48"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>

                {showCounsellor && (
                  <FilterField label="Counsellor">
                    <SearchableDropdown
                      value={filters.counsellor}
                      onChange={v => patch({ counsellor: v })}
                      options={counsellorOptions}
                      placeholder="All counsellors"
                      searchPlaceholder="Search counsellors…"
                      panelWidthClass="w-56"
                      triggerClassName="!py-2 !text-sm"
                    />
                  </FilterField>
                )}

                {showYear && (
                  <FilterField label="Year level">
                    <SearchableDropdown
                      value={filters.year}
                      onChange={v => patch({ year: v })}
                      options={yearOptions}
                      placeholder="All years"
                      searchPlaceholder="Search years…"
                      panelWidthClass="w-48"
                      triggerClassName="!py-2 !text-sm"
                    />
                  </FilterField>
                )}

                {showSchool && (
                  <FilterField label="School">
                    <SearchableDropdown
                      value={filters.school}
                      onChange={v => patch({ school: v })}
                      options={schoolOptions}
                      placeholder="All schools"
                      searchPlaceholder="Search schools…"
                      panelWidthClass="w-64"
                      triggerClassName="!py-2 !text-sm"
                      className="sm:col-span-2"
                    />
                  </FilterField>
                )}

                <FilterField label="Student type">
                  <SearchableDropdown
                    value={filters.studentType}
                    onChange={v => patch({ studentType: v })}
                    options={studentTypeOptions}
                    placeholder="All types"
                    searchPlaceholder="Search types…"
                    panelWidthClass="w-52"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>

                <FilterField label="Interviewed">
                  <SearchableDropdown
                    value={filters.interviewed}
                    onChange={v => patch({ interviewed: v })}
                    options={triOptions('interviewed')}
                    placeholder="Any"
                    searchable={false}
                    panelWidthClass="w-44"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>

                <FilterField label="Morrisby profile">
                  <SearchableDropdown
                    value={filters.hasProfile}
                    onChange={v => patch({ hasProfile: v })}
                    options={triOptions('profile')}
                    placeholder="Any"
                    searchable={false}
                    panelWidthClass="w-44"
                    triggerClassName="!py-2 !text-sm"
                  />
                </FilterField>
              </div>

              <div className="shrink-0 px-4 py-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Returns true when a student matches roster filter state (excluding free-text search). */
export function studentMatchesRosterFilters(
  student: {
    counsellor?: string;
    currentStage?: string | null;
    yearLevel: number;
    status: string;
    riskLevel: string;
    studentType: string;
    interviewed: boolean;
    hasProfile: boolean;
    stageProgress: number;
  },
  filters: RosterFilterState,
  ctx: { schoolId?: string; schoolName?: string },
): boolean {
  if (filters.school !== 'all' && ctx.schoolId !== filters.school) return false;
  if (
    filters.counsellor !== 'all' &&
    (student.counsellor ?? '').trim() !== filters.counsellor
  ) {
    return false;
  }
  const stageKey = student.currentStage == null ? '__none__' : student.currentStage;
  if (filters.stage !== 'all' && stageKey !== filters.stage) return false;
  if (filters.year !== 'all' && String(student.yearLevel) !== filters.year) return false;
  if (filters.status !== 'all' && student.status !== filters.status) return false;
  if (filters.risk !== 'all' && student.riskLevel !== filters.risk) return false;
  if (filters.studentType !== 'all' && student.studentType !== filters.studentType) return false;
  if (filters.interviewed === 'yes' && !student.interviewed) return false;
  if (filters.interviewed === 'no' && student.interviewed) return false;
  if (filters.hasProfile === 'yes' && !student.hasProfile) return false;
  if (filters.hasProfile === 'no' && student.hasProfile) return false;

  if (filters.progress !== 'all') {
    const complete = student.currentStage === 'complete';
    const started =
      student.currentStage != null && (student.stageProgress > 0 || complete);
    if (filters.progress === 'not_started' && started) return false;
    if (filters.progress === 'in_progress' && (!started || complete)) return false;
    if (filters.progress === 'complete' && !complete) return false;
  }

  return true;
}
