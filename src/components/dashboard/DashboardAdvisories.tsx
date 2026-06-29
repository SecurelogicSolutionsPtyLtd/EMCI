import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DashboardSectionHeading } from './DashboardSectionHeading';

interface DashboardAdvisoriesProps {
  atRiskCount: number;
  /** Students with a priority alert (No Career Plan, Disengaged, Stalled). */
  priorityAlertCount?: number;
  /** e.g. "within your scope" or "at this school". */
  scopeSuffix: string;
  onReviewRoster?: () => void;
}

/** Official advisory notice: follow-up flag count or an all-clear state. */
export function DashboardAdvisories({
  atRiskCount,
  priorityAlertCount = 0,
  scopeSuffix,
  onReviewRoster,
}: DashboardAdvisoriesProps) {
  const hasFollowUp = atRiskCount > 0;
  const hasPriority = priorityAlertCount > 0;
  const allClear = !hasFollowUp && !hasPriority;

  return (
    <section className="space-y-3">
      <DashboardSectionHeading>Advisories</DashboardSectionHeading>
      {hasPriority && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 border-l-4 border-l-rose-500 rounded-lg px-4 sm:px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-rose-800 leading-relaxed">
              <span className="font-bold">{priorityAlertCount.toLocaleString('en-AU')}</span>{' '}
              student{priorityAlertCount !== 1 ? 's need' : ' needs'} priority attention {scopeSuffix}{' '}
              (<span className="font-semibold">No Career Plan</span>,{' '}
              <span className="font-semibold">Disengaged</span>, or{' '}
              <span className="font-semibold">Stalled</span>).
            </p>
            {onReviewRoster && (
              <button
                type="button"
                onClick={onReviewRoster}
                className="mt-2 text-[11px] font-bold uppercase tracking-wider text-rose-700 hover:text-rose-900 transition-colors"
              >
                Review student roster →
              </button>
            )}
          </div>
        </div>
      )}
      {hasFollowUp ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 rounded-lg px-4 sm:px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-amber-800 leading-relaxed">
              <span className="font-bold">{atRiskCount.toLocaleString('en-AU')}</span>{' '}
              student{atRiskCount !== 1 ? 's require' : ' requires'} Follow Up {scopeSuffix}.
            </p>
            {onReviewRoster && (
              <button
                type="button"
                onClick={onReviewRoster}
                className="mt-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900 transition-colors"
              >
                Review student roster →
              </button>
            )}
          </div>
        </div>
      ) : allClear ? (
        <div className="flex items-start gap-3 bg-white border border-slate-200 border-l-4 border-l-emerald-400 rounded-lg px-4 sm:px-5 py-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600 leading-relaxed">
            No students require Follow Up {scopeSuffix}.
          </p>
        </div>
      ) : null}
    </section>
  );
}
