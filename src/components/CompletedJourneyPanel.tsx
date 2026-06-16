import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { TimelineEvent } from '../services/dataverse';
import type { Watchout } from '../lib/studentWatchouts';
import { countSessions, formatShortDate, latestEventDate } from './StudentJourneyStepper';
import { StudentWatchouts } from './StudentWatchouts';

/**
 * Completion band shown at the very top of the student header card once every
 * programme stage is done. Blends the journey ledger (stage dates), the
 * tracking-score badge and the watch-outs strip into one clear element so the
 * completed state is unmistakable at a glance.
 */
interface CompletedJourneyPanelProps {
  events:    TimelineEvent[];
  watchouts: Watchout[];
  /** Tracking-score badge slot — already wired to its generate/regenerate handler. */
  ratingBadge?: ReactNode;
}

export function CompletedJourneyPanel({ events, watchouts, ratingBadge }: CompletedJourneyPanelProps) {
  const sessions = countSessions(events);
  const consentDate = latestEventDate(events, ['consent', 'referral']);
  const lastSessionDate = latestEventDate(events, ['session']);
  const finishedDate = latestEventDate(events, null);

  // One quiet reading line instead of a spread-out column grid.
  const journey: string[] = [];
  const consentFormatted = consentDate ? formatShortDate(consentDate) : null;
  if (consentFormatted) journey.push(`Referral ${consentFormatted}`);
  if (sessions > 0) {
    const lastFormatted = lastSessionDate ? formatShortDate(lastSessionDate) : null;
    journey.push(
      `${sessions} guidance session${sessions !== 1 ? 's' : ''}${lastFormatted ? ` (last ${lastFormatted})` : ''}`,
    );
  }
  const finishedFormatted = finishedDate ? formatShortDate(finishedDate) : null;
  if (finishedFormatted) journey.push(`Finished ${finishedFormatted}`);

  return (
    <div>

      {/* ── Completion band: one left-aligned line + score on the right ── */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            Programme Complete
          </p>
          {journey.length > 0 && (
            <p className="text-xs text-slate-500 truncate">
              {journey.join('  ·  ')}
            </p>
          )}
        </div>
        {ratingBadge && <div className="shrink-0">{ratingBadge}</div>}
      </div>

      {/* ── Watch-outs: quiet inline row beneath the band ── */}
      {watchouts.length > 0 && (
        <div className="px-6 pb-4 pl-[72px]">
          <StudentWatchouts watchouts={watchouts} subtle />
        </div>
      )}
    </div>
  );
}
