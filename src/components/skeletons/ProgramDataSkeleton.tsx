import React from 'react';

/** Full-view placeholder while programme data (students / schools / events) is loading or refreshing. */
export function ProgramDataSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-slate-50" role="status" aria-label="Loading programme data">
      <div className="shrink-0 h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center gap-4">
        <div className="h-8 w-40 max-w-[45vw] rounded-lg bg-slate-200 animate-pulse" />
        <div className="hidden sm:block flex-1 max-w-md h-9 rounded-lg bg-slate-100 animate-pulse" />
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-sm min-h-[4.5rem] sm:min-h-[5.25rem]"
            >
              <div className="h-2.5 w-16 sm:w-20 rounded bg-slate-200 animate-pulse mb-2" />
              <div className="h-6 sm:h-7 w-12 sm:w-16 rounded-md bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="h-11 sm:h-12 border-b border-slate-100 bg-slate-50/80 flex items-center px-4 gap-3">
            <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-4 flex-1 max-w-xs rounded bg-slate-100 animate-pulse hidden sm:block" />
          </div>
          <div className="divide-y divide-slate-100 p-2 sm:p-0">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-[40%] max-w-[200px] rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-slate-100 animate-pulse sm:hidden" />
                  <div className="hidden sm:block h-3 w-32 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="hidden md:block h-4 w-20 rounded bg-slate-100 animate-pulse shrink-0" />
                <div className="h-8 w-16 rounded-lg bg-slate-100 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
