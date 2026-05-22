/**
 * Legacy native `<select>` styling (prefer [`SearchableDropdown`](../components/ui/SearchableDropdown.tsx) for filters).
 */
export const SELECT_PROGRAM_CORE =
  'text-sm h-8 min-h-[2rem] rounded-lg bg-slate-100 border-none py-0 ' +
  'text-slate-700 cursor-pointer ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40';

/** Toolbar / roster filters: default horizontal padding, shrink-0. */
export const SELECT_PROGRAM_CLASS = SELECT_PROGRAM_CORE + ' shrink-0 pl-3 pr-8';
