import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ShieldCheck,
  LayoutGrid,
  Users,
  Filter,
  Scale,
  MapPin,
} from 'lucide-react';
import type { Student } from '../../data/studentsData';
import type { School } from '../../data/networkData';
import type { TimelineEvent } from '../../services/dataverse';
import {
  buildProgrammeOverview,
  buildCohortOutcomes,
  buildCompletionGap,
  buildRegionalPerformance,
  applyDeFilters,
  listRegions,
  DEFAULT_DE_FILTERS,
  type DeFilters,
} from '../../lib/deAnalyticsMetrics';
import { DeAnalyticsFilters } from './DeAnalyticsFilters';
import { ProgrammeOverviewSection } from './ProgrammeOverviewSection';
import { CohortOutcomesSection } from './CohortOutcomesSection';
import { StageFunnelSection } from './StageFunnelSection';
import { CompletionGapSection } from './CompletionGapSection';
import { RegionalPerformanceSection } from './RegionalPerformanceSection';

interface DeAnalyticsDashboardProps {
  students: Student[];
  schools: School[];
  studentEventsMap: Record<string, TimelineEvent[]>;
}

type DeView = 'overview' | 'cohorts' | 'funnel' | 'gap' | 'regional';

const VIEWS: { id: DeView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview',       icon: LayoutGrid },
  { id: 'cohorts',  label: 'By Cohort',      icon: Users },
  { id: 'funnel',   label: 'Stage Funnel',   icon: Filter },
  { id: 'gap',      label: 'Completion Gap', icon: Scale },
  { id: 'regional', label: 'Regional',       icon: MapPin },
];

export function DeAnalyticsDashboard({ students, schools, studentEventsMap }: DeAnalyticsDashboardProps) {
  const [view, setView] = useState<DeView>('overview');
  const [filters, setFilters] = useState<DeFilters>(DEFAULT_DE_FILTERS);

  const regions = useMemo(() => listRegions(schools), [schools]);

  const scoped = useMemo(
    () => applyDeFilters(students, schools, filters),
    [students, schools, filters],
  );
  const fStudents = scoped.students;
  const fSchools = scoped.schools;

  const overview      = useMemo(() => buildProgrammeOverview(fStudents, fSchools), [fStudents, fSchools]);
  const cohortOutcomes = useMemo(() => buildCohortOutcomes(fStudents, studentEventsMap), [fStudents, studentEventsMap]);
  const completionGap = useMemo(() => buildCompletionGap(fStudents), [fStudents]);
  const regional      = useMemo(() => buildRegionalPerformance(fStudents, fSchools), [fStudents, fSchools]);

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50">
      <header className="shrink-0 bg-white border-b border-slate-200 px-8 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-6 h-6 text-primary shrink-0" />
          <h1 className="text-xl font-bold text-slate-900">DE Analytics</h1>
        </div>
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {VIEWS.map(v => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <v.icon className="w-4 h-4 shrink-0" />
                {v.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="p-8 max-w-6xl mx-auto w-full space-y-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emci-success shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Aggregated, de-identified programme data. No student names, identifiers or counsellor
            details are shown. Cohort breakdowns are based on recorded cohort tags.
          </p>
        </div>

        <DeAnalyticsFilters
          filters={filters}
          regions={regions}
          onChange={setFilters}
          resultCount={fStudents.length}
        />

        <div className="space-y-8">
          {view === 'overview' && <ProgrammeOverviewSection overview={overview} />}
          {view === 'cohorts'  && <CohortOutcomesSection rows={cohortOutcomes} />}
          {view === 'funnel'   && <StageFunnelSection students={fStudents} />}
          {view === 'gap'      && <CompletionGapSection rows={completionGap} />}
          {view === 'regional' && <RegionalPerformanceSection rows={regional} />}
        </div>
      </div>
    </main>
  );
}
