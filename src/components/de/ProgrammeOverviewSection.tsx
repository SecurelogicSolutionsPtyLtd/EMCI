import React from 'react';
import { GraduationCap, Building2, CheckCircle2, Compass, AlertTriangle } from 'lucide-react';
import type { ProgrammeOverview } from '../../lib/deAnalyticsMetrics';

interface ProgrammeOverviewSectionProps {
  overview: ProgrammeOverview;
}

export function ProgrammeOverviewSection({ overview }: ProgrammeOverviewSectionProps) {
  const tiles = [
    { label: 'Enrolled Students',   value: overview.totalEnrolled.toLocaleString('en-AU'), icon: GraduationCap, highlight: false },
    { label: 'Active Schools',      value: overview.activeSchools,                          icon: Building2,     highlight: false },
    { label: 'Completion Rate',     value: `${overview.completionRate}%`,                   icon: CheckCircle2,  highlight: true },
    { label: 'In Career Guidance',  value: overview.inCareerGuidance.toLocaleString('en-AU'), icon: Compass,     highlight: false },
    { label: 'Needing Follow-up',   value: overview.needingFollowUp.toLocaleString('en-AU'), icon: AlertTriangle, highlight: false, alert: overview.needingFollowUp > 0 },
  ];

  return (
    <section>
      <h2 className="text-sm font-bold text-slate-900 mb-3">Programme Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map(t => (
          <div
            key={t.label}
            className={`rounded-xl border px-4 py-3 shadow-sm ${
              t.alert
                ? 'bg-amber-50 border-amber-200'
                : t.highlight
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <t.icon className={`w-3.5 h-3.5 shrink-0 ${t.alert ? 'text-amber-500' : t.highlight ? 'text-primary' : 'text-slate-400'}`} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.label}</p>
            </div>
            <p className={`text-lg font-bold ${t.alert ? 'text-amber-700' : t.highlight ? 'text-primary' : 'text-slate-800'}`}>
              {t.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
