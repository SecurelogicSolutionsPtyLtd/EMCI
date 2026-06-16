import React from 'react';

/** Official report-style section heading: primary rule + uppercase tracked label. */
export function DashboardSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-1 h-4 bg-primary rounded-sm shrink-0" aria-hidden />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {children}
      </h2>
      <span className="flex-1 h-px bg-slate-200" aria-hidden />
    </div>
  );
}
