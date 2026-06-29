import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ListFilter, RotateCcw } from 'lucide-react';
import { SearchableDropdown, SEARCHABLE_DROPDOWN_PANEL_ATTR } from './ui/SearchableDropdown';
import type { SearchableDropdownOption } from './ui/SearchableDropdown';

const PANEL_WIDTH_PX = 448; // 28rem
const VIEWPORT_MARGIN_PX = 12;

type PanelPlacement = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  above: boolean;
};

function computePanelPlacement(trigger: HTMLElement): PanelPlacement {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(window.innerWidth - VIEWPORT_MARGIN_PX * 2, PANEL_WIDTH_PX);
  let left = rect.right - width;
  left = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN_PX),
  );

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX;
  const spaceAbove = rect.top - VIEWPORT_MARGIN_PX;
  const above = spaceBelow < 280 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    220,
    Math.min(640, above ? spaceAbove - VIEWPORT_MARGIN_PX : spaceBelow - VIEWPORT_MARGIN_PX),
  );
  const top = above ? rect.top - VIEWPORT_MARGIN_PX : rect.bottom + VIEWPORT_MARGIN_PX;

  return { top, left, width, maxHeight, above };
}

export type SessionCountFilter = 'all' | '0' | '1' | '2_3' | '4_plus';

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
  sessions: SessionCountFilter;
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
  sessions: 'all',
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
  if (filters.sessions !== 'all') n++;
  return n;
}

function resolveSessionCount(sessionCount?: number): number {
  if (sessionCount == null || Number.isNaN(sessionCount) || sessionCount < 0) return 0;
  return sessionCount;
}

export function studentMatchesSessionFilter(
  sessionCount: number | undefined,
  filter: SessionCountFilter,
): boolean {
  if (filter === 'all') return true;
  const count = resolveSessionCount(sessionCount);
  switch (filter) {
    case '0':
      return count === 0;
    case '1':
      return count === 1;
    case '2_3':
      return count >= 2 && count <= 3;
    case '4_plus':
      return count >= 4;
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

const PROGRESS_OPTIONS: SearchableDropdownOption[] = [
  { value: 'all', label: 'Any progress' },
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete', label: 'Job ready' },
];

const FOLLOW_UP_LEVEL_OPTIONS: SearchableDropdownOption[] = [
  { value: 'all', label: 'Any level' },
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SESSION_COUNT_OPTIONS: SearchableDropdownOption[] = [
  { value: 'all', label: 'Any sessions' },
  { value: '0', label: 'None (0)' },
  { value: '1', label: '1 session' },
  { value: '2_3', label: '2–3 sessions' },
  { value: '4_plus', label: '4+ sessions' },
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
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCount = useMemo(
    () =>
      countActiveRosterFilters(filters, {
        showCounsellor,
        showYear,
        showSchool,
      }),
    [filters, showCounsellor, showYear, showSchool],
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPlacement(null);
      return;
    }

    const update = () => {
      if (triggerRef.current) {
        setPlacement(computePanelPlacement(triggerRef.current));
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest(`[${SEARCHABLE_DROPDOWN_PANEL_ATTR}]`)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, []);

  function patch(patch: Partial<RosterFilterState>) {
    onChange(patch);
  }

  const filterPanel = open && placement && (
    <div
      style={{
        position: 'fixed',
        top: placement.top,
        left: placement.left,
        width: placement.width,
        maxHeight: placement.maxHeight,
        transform: placement.above ? 'translateY(-100%)' : undefined,
        zIndex: 200,
      }}
      className="origin-top-right"
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-label="Advanced student filters"
        initial={{ opacity: 0, y: placement.above ? -6 : 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: placement.above ? -6 : 6, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div
          className="rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden grid grid-rows-[auto_minmax(0,1fr)_auto]"
          style={{ maxHeight: placement.maxHeight }}
        >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
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

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
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

          <FilterField label="Sessions">
            <SearchableDropdown
              value={filters.sessions}
              onChange={v => patch({ sessions: v as SessionCountFilter })}
              options={SESSION_COUNT_OPTIONS}
              placeholder="Any sessions"
              searchable={false}
              panelWidthClass="w-52"
              triggerClassName="!py-2 !text-sm"
            />
          </FilterField>

          <FilterField label="Follow Up">
            <SearchableDropdown
              value={filters.risk}
              onChange={v => patch({ risk: v })}
              options={FOLLOW_UP_LEVEL_OPTIONS}
              placeholder="Any level"
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
                placeholder="All schools / campuses"
                searchPlaceholder="Search schools / campuses…"
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

        <div className="px-4 py-3 border-t border-slate-100 flex justify-end bg-white">
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
    </div>
  );

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
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

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>{filterPanel}</AnimatePresence>,
          document.body,
        )}
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
    sessionCount?: number;
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

  if (!studentMatchesSessionFilter(student.sessionCount, filters.sessions)) {
    return false;
  }

  return true;
}
