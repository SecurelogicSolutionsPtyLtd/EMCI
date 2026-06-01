import {
  ClipboardList, BookOpen, Briefcase, CalendarX, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { QuickInsights } from '../lib/studentInsights';

type Variant = 'success' | 'warning' | 'neutral' | 'pending';

interface InsightRow {
  label: string;
  value: string;
  Icon:  LucideIcon;
  variant: Variant;
}

const ROW_BG: Record<Variant, string> = {
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-red-50 border-red-200',
  neutral: 'bg-slate-50 border-slate-200',
  pending: 'bg-amber-50 border-amber-200',
};

const ICON_COLOR: Record<Variant, string> = {
  success: 'text-emerald-500',
  warning: 'text-red-500',
  neutral: 'text-slate-400',
  pending: 'text-amber-500',
};

const VALUE_COLOR: Record<Variant, string> = {
  success: 'text-emerald-700',
  warning: 'text-red-700',
  neutral: 'text-slate-700',
  pending: 'text-amber-700',
};

function rowsFromInsights(i: QuickInsights): InsightRow[] {
  return [
    {
      label:   'Career Action Plan',
      value:   `${i.careerActionPlan.count} · ${i.careerActionPlan.complete ? 'Complete' : 'Pending'}`,
      Icon:    ClipboardList,
      variant: i.careerActionPlan.complete ? 'success' : 'pending',
    },
    {
      label:   'Morrisby Unpack',
      value:   `${i.morrisbyUnpack.count} · ${i.morrisbyUnpack.complete ? 'Complete' : 'Pending'}`,
      Icon:    BookOpen,
      variant: i.morrisbyUnpack.complete ? 'success' : 'pending',
    },
    {
      label:   'Morrisby Profile',
      value:   i.morrisbyProfile.yes ? 'Yes' : 'No',
      Icon:    i.morrisbyProfile.yes ? CheckCircle2 : XCircle,
      variant: i.morrisbyProfile.yes ? 'success' : 'neutral',
    },
    {
      label:   'Work Experience',
      value:   i.workExperience.yes ? 'Yes' : 'No',
      Icon:    Briefcase,
      variant: i.workExperience.yes ? 'success' : 'neutral',
    },
    {
      label:   'Absences',
      value:   i.absences.flagged
        ? `${i.absences.count} · Flag for review`
        : `${i.absences.count} recorded`,
      Icon:    i.absences.flagged ? AlertTriangle : CalendarX,
      variant: i.absences.flagged ? 'warning' : (i.absences.count > 0 ? 'neutral' : 'success'),
    },
  ];
}

interface QuickInsightsPanelProps {
  insights: QuickInsights;
}

export function QuickInsightsPanel({ insights }: QuickInsightsPanelProps) {
  const rows = rowsFromInsights(insights);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        Quick Insights
      </h3>
      <div className="flex flex-col gap-2">
        {rows.map(row => (
          <div
            key={row.label}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${ROW_BG[row.variant]}`}
          >
            <row.Icon className={`w-4 h-4 shrink-0 ${ICON_COLOR[row.variant]}`} />
            <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">
              {row.label}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${VALUE_COLOR[row.variant]}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
