import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CompletionGapRow } from '../../lib/deAnalyticsMetrics';

interface CompletionGapSectionProps {
  rows: CompletionGapRow[];
}

export function CompletionGapSection({ rows }: CompletionGapSectionProps) {
  const overall = rows[0]?.overallRate ?? 0;
  const maxAbsDelta = Math.max(1, ...rows.map(r => Math.abs(r.delta)));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 mb-1">Completion Gap Analysis</h2>
      <p className="text-xs text-slate-400 mb-4">
        Each priority cohort's completion rate against the overall population ({overall}%). Negative
        bars are equity gaps that may need attention.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No priority cohort data available.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const positive = r.delta >= 0;
            const widthPct = (Math.abs(r.delta) / maxAbsDelta) * 50;
            const Icon = r.delta === 0 ? Minus : positive ? TrendingUp : TrendingDown;
            return (
              <div key={r.cohort} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs font-medium text-slate-700 truncate">
                  {r.cohort}
                  <span className="text-slate-400 font-normal"> ({r.count})</span>
                </div>
                <div className="flex-1 flex items-center">
                  <div className="w-1/2 flex justify-end">
                    {!positive && (
                      <div
                        className="h-5 rounded-l-md bg-emci-risk/80"
                        style={{ width: `${widthPct}%` }}
                      />
                    )}
                  </div>
                  <div className="w-px h-6 bg-slate-300 shrink-0" />
                  <div className="w-1/2">
                    {positive && (
                      <div
                        className="h-5 rounded-r-md bg-emci-success/80"
                        style={{ width: `${widthPct}%` }}
                      />
                    )}
                  </div>
                </div>
                <div
                  className={`w-28 shrink-0 flex items-center justify-end gap-1 text-xs font-bold ${
                    r.delta === 0 ? 'text-slate-400' : positive ? 'text-emci-success' : 'text-emci-risk'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {positive && r.delta !== 0 ? '+' : ''}
                  {r.delta} pts
                  <span className="text-slate-400 font-normal">({r.completionRate}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
