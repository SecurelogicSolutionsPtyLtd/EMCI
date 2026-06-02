import {
  BookOpen, ClipboardList, Briefcase, Building2, HandHelping,
  HardHat, UserPlus, MoreHorizontal, CalendarDays, UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  QUICK_INSIGHT_AREAS,
  type QuickInsightAreaKey,
  type QuickInsights,
} from '../lib/studentInsights';

type Variant = 'success' | 'neutral' | 'warning';

interface InsightRow {
  label:   string;
  value:   string;
  Icon:    LucideIcon;
  variant: Variant;
}

const AREA_ICONS: Record<QuickInsightAreaKey, LucideIcon> = {
  unpack:             BookOpen,
  cap:                ClipboardList,
  workReadiness:      Briefcase,
  industryEngagement: Building2,
  externalSupport:    HandHelping,
  wexPreparation:     HardHat,
  introduction:       UserPlus,
  other:              MoreHorizontal,
};

const ROW_BG: Record<Variant, string> = {
  success: 'bg-emerald-50/80 border-emerald-200/80',
  neutral: 'bg-slate-50/80 border-slate-200/80',
  warning: 'bg-amber-50/80 border-amber-200/80',
};

const ROW_HOVER: Record<Variant, string> = {
  success: 'hover:border-emerald-300/90 hover:bg-emerald-50 hover:shadow-[0_4px_14px_rgba(16,185,129,0.12),0_1px_3px_rgba(16,185,129,0.06)]',
  neutral: 'hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_14px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)]',
  warning: 'hover:border-amber-300/90 hover:bg-amber-50 hover:shadow-[0_4px_14px_rgba(245,158,11,0.12),0_1px_3px_rgba(245,158,11,0.06)]',
};

const ICON_COLOR: Record<Variant, string> = {
  success: 'text-emerald-500',
  neutral: 'text-slate-400',
  warning: 'text-amber-500',
};

const VALUE_COLOR: Record<Variant, string> = {
  success: 'text-emerald-700',
  neutral: 'text-slate-700',
  warning: 'text-amber-700',
};

function countRowsFromInsights(insights: QuickInsights): InsightRow[] {
  const sessionLabel = insights.sessionCount === 1 ? '1 session' : `${insights.sessionCount} sessions`;
  const absenceLabel = insights.absenceCount === 1 ? '1 absence' : `${insights.absenceCount} absences`;
  return [
    {
      label:   'Sessions',
      value:   sessionLabel,
      Icon:    CalendarDays,
      variant: insights.sessionCount > 0 ? 'success' : 'neutral',
    },
    {
      label:   'Absences',
      value:   absenceLabel,
      Icon:    UserX,
      variant: insights.absencesFlagged ? 'warning' : insights.absenceCount > 0 ? 'neutral' : 'success',
    },
  ];
}

function rowsFromInsights(insights: QuickInsights): InsightRow[] {
  return QUICK_INSIGHT_AREAS.map(area => {
    const yes = insights[area.key].yes;
    return {
      label:   area.label,
      value:   yes ? 'Yes' : 'No',
      Icon:    AREA_ICONS[area.key],
      variant: yes ? 'success' : 'neutral',
    };
  });
}

interface QuickInsightsPanelProps {
  insights: QuickInsights;
}

function InsightGrid({ rows }: { rows: InsightRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(row => (
        <div
          key={row.label}
          className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border min-w-0 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:-translate-y-px active:translate-y-0 transition-all duration-300 ease-out ${ROW_BG[row.variant]} ${ROW_HOVER[row.variant]}`}
        >
          <row.Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 ${ICON_COLOR[row.variant]}`} />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-[11px] font-medium text-slate-500 leading-none truncate">
              {row.label}
            </span>
            <span className={`text-sm font-semibold leading-tight truncate ${VALUE_COLOR[row.variant]}`}>
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickInsightsPanel({ insights }: QuickInsightsPanelProps) {
  const countRows = countRowsFromInsights(insights);
  const areaRows  = rowsFromInsights(insights);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">
        Quick Insights
      </h3>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Attendance
          </p>
          <InsightGrid rows={countRows} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Interventions
          </p>
          <InsightGrid rows={areaRows} />
        </div>
      </div>
    </div>
  );
}
