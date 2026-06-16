import React from 'react';
import { ArrowRight, Building2, Users } from 'lucide-react';
import { DashboardSectionHeading } from './DashboardSectionHeading';

interface DashboardQuickAccessProps {
  showStudentRoster: boolean;
  showStudentNames: boolean;
  onOpenSchools: () => void;
  onOpenStudents: () => void;
}

/** Formal quick-access registry links to the schools directory and student roster. */
export function DashboardQuickAccess({
  showStudentRoster, showStudentNames, onOpenSchools, onOpenStudents,
}: DashboardQuickAccessProps) {
  return (
    <section className="space-y-3">
      <DashboardSectionHeading>Records &amp; Registers</DashboardSectionHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
        <button
          type="button"
          onClick={onOpenSchools}
          className="group flex items-start gap-4 p-5 rounded-lg border border-slate-200 border-l-4 border-l-primary bg-white shadow-sm hover:shadow-md hover:border-slate-300 hover:border-l-primary transition-all text-left"
        >
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Schools Directory
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              All participating schools, completion KPIs, and school cohort dashboards.
            </p>
          </div>
        </button>

        {showStudentRoster ? (
          <button
            type="button"
            onClick={onOpenStudents}
            className="group flex items-start gap-4 p-5 rounded-lg border border-slate-200 border-l-4 border-l-primary bg-white shadow-sm hover:shadow-md hover:border-slate-300 hover:border-l-primary transition-all text-left"
          >
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Student Roster
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {showStudentNames
                  ? 'Network student roster, filters, and journey access (where permitted).'
                  : 'Anonymized student roster and read-only redacted journey.'}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex items-start gap-4 p-5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 text-slate-400">
            <div className="rounded-lg bg-slate-100 p-2.5 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-500">Student Roster</h3>
              <p className="text-xs mt-1">Not available for your role.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
