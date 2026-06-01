import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { SearchableDropdown } from '../ui/SearchableDropdown';
import {
  DEFAULT_DE_FILTERS,
  type DeFilters,
  type StatusFilter,
} from '../../lib/deAnalyticsMetrics';

interface DeAnalyticsFiltersProps {
  filters: DeFilters;
  regions: string[];
  onChange: (next: DeFilters) => void;
  /** Number of students after filtering, shown as a live count. */
  resultCount: number;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'All statuses' },
  { value: 'Active',   label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Pending',  label: 'Pending' },
];

export function DeAnalyticsFilters({ filters, regions, onChange, resultCount }: DeAnalyticsFiltersProps) {
  const isFiltered = filters.region !== 'all' || filters.status !== 'all';

  const regionOptions = [
    { value: 'all', label: 'All regions' },
    ...regions.map(r => ({ value: r, label: r })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pr-1">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters
      </div>

      <SearchableDropdown
        value={filters.region}
        onChange={region => onChange({ ...filters, region })}
        options={regionOptions}
        placeholder="All regions"
        allValue="all"
        searchPlaceholder="Search regions…"
        className="w-44"
        panelWidthClass="w-52"
      />

      <SearchableDropdown
        value={filters.status}
        onChange={status => onChange({ ...filters, status: status as StatusFilter })}
        options={STATUS_OPTIONS}
        placeholder="All statuses"
        allValue="all"
        searchable={false}
        className="w-40"
        panelWidthClass="w-44"
      />

      {isFiltered && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_DE_FILTERS)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      <span className="ml-auto text-xs text-slate-400">
        {resultCount.toLocaleString('en-AU')} student{resultCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}
