import { useMemo, useState } from 'react';
import {
  BookOpen, ClipboardList, Briefcase, Building2, HandHelping,
  HardHat, UserPlus, MoreHorizontal, CalendarDays, UserX, ClipboardCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TimelineEvent } from '../services/dataverse';
import {
  PILOT_SURVEY_STAGE_COUNT,
  QUICK_INSIGHT_AREAS,
  buildQuickInsightDetails,
  type QuickInsightAreaKey,
  type QuickInsightDetailKey,
  type QuickInsights,
} from '../lib/studentInsights';
import { ReportCardHeader, ReportSectionHeading } from './ReportCard';
import { QuickInsightDetailPanel } from './QuickInsightDetail';

type Variant = 'success' | 'neutral' | 'warning';

interface InsightRow {
  key:     QuickInsightDetailKey;
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
      key:     'sessions',
      label:   'Sessions',
      value:   sessionLabel,
      Icon:    CalendarDays,
      variant: insights.sessionCount > 0 ? 'success' : 'neutral',
    },
    {
      key:     'absences',
      label:   'Absences',
      value:   absenceLabel,
      Icon:    UserX,
      variant: insights.absencesFlagged ? 'warning' : insights.absenceCount > 0 ? 'neutral' : 'success',
    },
    {
      key:     'surveys',
      label:   'Surveys',
      value:   `${insights.surveyCount}/${PILOT_SURVEY_STAGE_COUNT}`,
      Icon:    ClipboardCheck,
      variant: insights.surveyCount === PILOT_SURVEY_STAGE_COUNT ? 'success' : 'neutral',
    },
  ];
}

function rowsFromInsights(insights: QuickInsights): InsightRow[] {
  return QUICK_INSIGHT_AREAS.map(area => {
    const yes = insights[area.key].yes;
    return {
      key:     area.key,
      label:   area.label,
      value:   yes ? 'Yes' : 'No',
      Icon:    AREA_ICONS[area.key],
      variant: yes ? 'success' : 'neutral',
    };
  });
}

interface QuickInsightsPanelProps {
  insights: QuickInsights;
  events:   TimelineEvent[];
}

interface InsightGridProps {
  rows:     InsightRow[];
  selected: QuickInsightDetailKey | null;
  onSelect: (key: QuickInsightDetailKey) => void;
}

function InsightGrid({ rows, selected, onSelect }: InsightGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(row => {
        const isSelected = row.key === selected;
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect(row.key)}
            aria-expanded={isSelected}
            className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border min-w-0 text-left cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:-translate-y-px active:translate-y-0 transition-all duration-300 ease-out ${ROW_BG[row.variant]} ${ROW_HOVER[row.variant]} ${
              isSelected ? 'ring-2 ring-primary/40 border-primary/40' : ''
            }`}
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
          </button>
        );
      })}
    </div>
  );
}

export function QuickInsightsPanel({ insights, events }: QuickInsightsPanelProps) {
  const [selected, setSelected] = useState<QuickInsightDetailKey | null>(null);
  const countRows = countRowsFromInsights(insights);
  const areaRows  = rowsFromInsights(insights);
  const details   = useMemo(() => buildQuickInsightDetails(events), [events]);

  const toggle = (key: QuickInsightDetailKey) =>
    setSelected(prev => (prev === key ? null : key));

  const allRows = [...countRows, ...areaRows];
  const selectedRow = selected ? allRows.find(r => r.key === selected) ?? null : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
      <ReportCardHeader
        title="Quick Insights"
        subtitle="Programme engagement at a glance"
      />
      <div className="p-6 flex-1 flex flex-col gap-6">
        <div className="space-y-3">
          <ReportSectionHeading>Attendance</ReportSectionHeading>
          <InsightGrid rows={countRows} selected={selected} onSelect={toggle} />
        </div>
        <div className="space-y-3">
          <ReportSectionHeading>Interventions</ReportSectionHeading>
          <InsightGrid rows={areaRows} selected={selected} onSelect={toggle} />
        </div>
      </div>
      <QuickInsightDetailPanel
        open={selected !== null && selectedRow !== null}
        label={selectedRow?.label ?? ''}
        value={selectedRow?.value ?? ''}
        items={selected ? details[selected] : []}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
