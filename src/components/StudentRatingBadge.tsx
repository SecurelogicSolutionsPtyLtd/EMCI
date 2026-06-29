/**
 * Tracking-score badge — a small progress ring with the score inside, paired
 * with the plain-language band the score falls into (On Track / Progressing /
 * Monitoring / Needs Attention) so the number is never shown without meaning.
 *
 * Scoring is manually triggered: before a score exists the badge shows a
 * text-free empty state (an on-theme gauge icon) that the user clicks to
 * generate. Once generated it renders the band label beside a band-coloured
 * ring; clicking again regenerates. Deliberately compact, Linear-style restraint.
 */

import type { RatingState } from '../hooks/useStudentRating';
import type { RatingBand } from '../lib/studentRating';

interface StudentRatingBadgeProps {
  state:    RatingState;
  generate: () => void;
}

const BAND_COLOR: Record<RatingBand, string> = {
  on_track:        'text-emerald-500',
  progressing:     'text-sky-500',
  monitoring:      'text-amber-500',
  needs_attention: 'text-rose-500',
};

const BAND_LABEL: Record<RatingBand, string> = {
  on_track:        'On Track',
  progressing:     'Progressing',
  monitoring:      'Monitoring',
  needs_attention: 'Needs Attention',
};

const BAND_LABEL_COLOR: Record<RatingBand, string> = {
  on_track:        'text-emerald-600',
  progressing:     'text-sky-600',
  monitoring:      'text-amber-600',
  needs_attention: 'text-rose-600',
};

/** Mirrors `bandFromScore` thresholds in `lib/studentRating.ts`. */
const BAND_SCALE_TOOLTIP =
  'Tracking score bands: 80–100 On Track · 65–79 Progressing · 45–64 Monitoring · below 45 Needs Attention. Click to regenerate.';

const SIZE = 44;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StudentRatingBadge({ state, generate }: StudentRatingBadgeProps) {
  if (state.status === 'ineligible') return null;

  // ── Empty / error state: clickable gauge icon ──
  if (state.status === 'idle' || state.status === 'error') {
    const isError = state.status === 'error';
    return (
      <button
        type="button"
        onClick={generate}
        title={isError ? `Scoring failed — click to retry` : 'Generate tracking score'}
        aria-label={isError ? 'Retry tracking score' : 'Generate tracking score'}
        className={`shrink-0 flex items-center justify-center rounded-full border transition-all cursor-pointer hover:scale-105 ${
          isError
            ? 'border-rose-200 bg-rose-50 hover:border-rose-300'
            : 'border-slate-200 bg-slate-50 hover:border-primary/40 hover:bg-primary/5'
        }`}
        style={{ width: SIZE, height: SIZE }}
      >
        <img
          src="/rating-empty-state.png"
          alt=""
          className="w-7 h-7 object-contain"
          draggable={false}
        />
      </button>
    );
  }

  // ── Loading state: muted pulsing ring ──
  if (state.status === 'loading') {
    return (
      <div
        className="relative shrink-0 animate-pulse"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="text-slate-200"
            stroke="currentColor"
          />
        </svg>
      </div>
    );
  }

  // ── Success state: band label + band-coloured ring with score ──
  const { overall, band } = state.rating;
  const offset = CIRCUMFERENCE * (1 - overall / 100);

  return (
    <button
      type="button"
      onClick={generate}
      title={BAND_SCALE_TOOLTIP}
      aria-label={`Tracking score ${overall} out of 100 — ${BAND_LABEL[band]}`}
      className="group shrink-0 flex items-center gap-3 cursor-pointer"
    >
      <span className="flex flex-col items-end text-right">
        <span className={`text-sm font-semibold leading-tight ${BAND_LABEL_COLOR[band]}`}>
          {BAND_LABEL[band]}
        </span>
        <span className="text-[11px] font-medium text-slate-400 leading-tight">
          Tracking score · out of 100
        </span>
      </span>
      <span
        className="relative block transition-transform group-hover:scale-105"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="text-slate-100"
            stroke="currentColor"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={BAND_COLOR[band]}
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
          {overall}
        </span>
      </span>
    </button>
  );
}
