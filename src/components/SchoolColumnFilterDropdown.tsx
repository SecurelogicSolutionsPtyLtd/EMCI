import React, { useRef } from 'react';
import { Check } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

export type SchoolSortKey = 'name' | 'morrisbyId' | 'status' | 'completion' | 'students';
export type ColumnFilterValues = Partial<Record<SchoolSortKey, string[]>>;

export const SCHOOL_TABLE_COLUMNS: { key: SchoolSortKey; label: string }[] = [
  { key: 'name', label: 'School Name' },
  { key: 'morrisbyId', label: 'Morrisby ID' },
  { key: 'status', label: 'Status' },
  { key: 'completion', label: 'Programme Completion' },
  { key: 'students', label: 'Total Students' },
];

interface ColumnFilterDropdownProps<K extends string> {
  openFilterKey: K;
  columnLabel: string;
  filterDropdownPos: { top: number; left: number };
  columnFilters: Partial<Record<K, string[]>>;
  columnFilterOptions: Record<K, string[]>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClear: (key: K) => void;
  onToggleValue: (key: K, value: string) => void;
  hasColumnFilter: (key: K) => boolean;
  getOptionLabel?: (key: K, value: string) => string;
}

export function ColumnFilterDropdown<K extends string>({
  openFilterKey,
  columnLabel,
  filterDropdownPos,
  columnFilters,
  columnFilterOptions,
  onMouseEnter,
  onMouseLeave,
  onClear,
  onToggleValue,
  hasColumnFilter,
  getOptionLabel,
}: ColumnFilterDropdownProps<K>) {
  const ref = useRef<HTMLDivElement>(null);
  const formatLabel = (value: string) => getOptionLabel?.(openFilterKey, value) ?? value;

  return (
    <div
      ref={ref}
      style={{ top: filterDropdownPos.top, left: filterDropdownPos.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-56 overflow-hidden"
    >
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {columnLabel}
        </span>
        {hasColumnFilter(openFilterKey) && (
          <button
            type="button"
            onClick={() => onClear(openFilterKey)}
            className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="max-h-60 overflow-y-auto py-1">
        {columnFilterOptions[openFilterKey].map(option => {
          const checked = (columnFilters[openFilterKey] ?? []).includes(option);
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => onToggleValue(openFilterKey, option)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-100 ${
                  checked ? 'bg-primary border-primary' : 'border-slate-300 bg-white'
                }`}>
                  {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </span>
                <span className={`truncate ${checked ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                  {formatLabel(option)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SchoolColumnFilterDropdownProps {
  openFilterKey: SchoolSortKey;
  filterDropdownPos: { top: number; left: number };
  columnFilters: ColumnFilterValues;
  schoolColumnFilterOptions: Record<SchoolSortKey, string[]>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClear: (key: SchoolSortKey) => void;
  onToggleValue: (key: SchoolSortKey, value: string) => void;
  hasColumnFilter: (key: SchoolSortKey) => boolean;
}

export function SchoolColumnFilterDropdown({
  openFilterKey,
  filterDropdownPos,
  columnFilters,
  schoolColumnFilterOptions,
  onMouseEnter,
  onMouseLeave,
  onClear,
  onToggleValue,
  hasColumnFilter,
}: SchoolColumnFilterDropdownProps) {
  const columnLabel = SCHOOL_TABLE_COLUMNS.find(c => c.key === openFilterKey)?.label ?? openFilterKey;

  return (
    <ColumnFilterDropdown
      openFilterKey={openFilterKey}
      columnLabel={columnLabel}
      filterDropdownPos={filterDropdownPos}
      columnFilters={columnFilters}
      columnFilterOptions={schoolColumnFilterOptions}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClear={onClear}
      onToggleValue={onToggleValue}
      hasColumnFilter={hasColumnFilter}
    />
  );
}
