/**
 * Minimalist category breakdown shown beside the tracking score.
 *
 * Surfaces the four rubric categories that make up the headline number, each
 * with a short plain-language description of what it measures, a thin
 * score-coloured meter and the 0–100 value. Hovering a category reveals a
 * custom tooltip explaining how that category is scored (the point rubric).
 * Categories with no supporting data (null score) render muted with an em dash.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RatingCategoryKey, FinalCategory, StudentRating } from '../lib/studentRating';

interface StudentRatingBreakdownProps {
  rating: StudentRating;
}

interface CategoryMeta {
  label:       string;
  description: string;
  /** How the category is scored, as signal → points rows. */
  rubric:      { signal: string; pts: string }[];
}

const CATEGORY_META: Record<RatingCategoryKey, CategoryMeta> = {
  engagement: {
    label: 'Engagement',
    description: 'Sessions, interventions & interview',
    rubric: [
      { signal: 'Counselling sessions',  pts: '0–60' },
      { signal: 'Intervention breadth',  pts: '0–20' },
      { signal: 'Career interview held', pts: '20' },
    ],
  },
  career_outcomes: {
    label: 'Career',
    description: 'Action plan, work experience, Morrisby',
    rubric: [
      { signal: 'Career Action Plan',     pts: '30' },
      { signal: 'Work experience done',   pts: '25' },
      { signal: 'Work experience prep',   pts: '10' },
      { signal: 'Morrisby profile',       pts: '15' },
      { signal: 'Part-time job',          pts: '10' },
      { signal: 'Researching careers',    pts: '10' },
    ],
  },
  attendance_momentum: {
    label: 'Attendance',
    description: 'Absences & recent activity',
    rubric: [
      { signal: 'Attendance (fewer absences)', pts: '0–60' },
      { signal: 'Recency of activity',         pts: '0–40' },
    ],
  },
  growth_wellbeing: {
    label: 'Wellbeing',
    description: 'Survey shifts & sentiment',
    rubric: [
      { signal: 'Preparedness & strengths shift', pts: '0–40' },
      { signal: 'Helpfulness / positive tone',    pts: '0–30' },
      { signal: 'Wellbeing read of notes',        pts: '0–30' },
    ],
  },
};

function scoreColor(score: number): { bar: string; text: string } {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (score >= 65) return { bar: 'bg-sky-500',     text: 'text-sky-600' };
  if (score >= 45) return { bar: 'bg-amber-500',   text: 'text-amber-600' };
  return { bar: 'bg-rose-500', text: 'text-rose-600' };
}

export function StudentRatingBreakdown({ rating }: StudentRatingBreakdownProps) {
  const [active, setActive] = useState<RatingCategoryKey | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const show = (key: RatingCategoryKey, el: HTMLElement) => {
    setActive(key);
    setAnchor(el.getBoundingClientRect());
  };
  const hide = () => {
    setActive(null);
    setAnchor(null);
  };

  const activeCat = active ? rating.categories.find(c => c.key === active) ?? null : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
      {rating.categories.map(cat => {
        const meta = CATEGORY_META[cat.key];
        const hasScore = cat.score !== null;
        const color = hasScore ? scoreColor(cat.score as number) : null;
        return (
          <button
            key={cat.key}
            type="button"
            onMouseEnter={e => show(cat.key, e.currentTarget)}
            onMouseLeave={hide}
            onFocus={e => show(cat.key, e.currentTarget)}
            onBlur={hide}
            className="group min-w-0 text-left -m-1.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-help"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {meta.label}
            </p>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className={`text-xl font-bold leading-none tabular-nums ${color ? color.text : 'text-slate-300'}`}>
                {hasScore ? cat.score : '—'}
              </span>
              {hasScore && <span className="text-xs font-semibold text-slate-300">/100</span>}
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              {hasScore && (
                <div
                  className={`h-full rounded-full ${color!.bar} transition-all`}
                  style={{ width: `${cat.score}%` }}
                />
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{meta.description}</p>
          </button>
        );
      })}

      {activeCat && anchor && (
        <RubricTooltip category={activeCat} anchor={anchor} />
      )}
    </div>
  );
}

// ── Tooltip (portal so it is never clipped by the header card) ───────────────

interface RubricTooltipProps {
  category: FinalCategory;
  anchor:   DOMRect;
}

const TOOLTIP_WIDTH = 256;

function RubricTooltip({ category, anchor }: RubricTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number; above: boolean }>(() => ({
    left: anchor.left + anchor.width / 2,
    top: anchor.top,
    above: true,
  }));

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const margin = 8;
    const above = anchor.top > height + margin + 8;
    const rawLeft = anchor.left + anchor.width / 2;
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.min(
      Math.max(rawLeft, half + margin),
      window.innerWidth - half - margin,
    );
    const top = above ? anchor.top - margin : anchor.bottom + margin;
    setPlacement({ left, top, above });
  }, [anchor]);

  const meta = CATEGORY_META[category.key];

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{
        position: 'fixed',
        left: placement.left,
        top: placement.top,
        width: TOOLTIP_WIDTH,
        transform: `translate(-50%, ${placement.above ? '-100%' : '0'})`,
      }}
      className="z-[300] pointer-events-none rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold text-slate-900">{meta.label}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          {category.weight}% of score
        </span>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        How it is scored
      </p>
      <ul className="space-y-1">
        {meta.rubric.map(row => (
          <li key={row.signal} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-slate-600">{row.signal}</span>
            <span className="shrink-0 font-semibold text-slate-400 tabular-nums">{row.pts}</span>
          </li>
        ))}
      </ul>

      {category.reason && (
        <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] leading-snug text-slate-500">
          <span className="font-semibold text-slate-600">This student: </span>
          {category.reason}
        </p>
      )}

      <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] leading-snug text-slate-400">
        Each category scores 0–100; the headline number blends them by weight.
      </p>
    </div>,
    document.body,
  );
}
