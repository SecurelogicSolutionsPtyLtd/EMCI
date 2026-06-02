/**
 * Minimalist category breakdown shown beside the tracking score.
 *
 * Surfaces the five rubric categories that make up the headline number, each
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
    description: 'Action plan, Morrisby & exploration',
    rubric: [
      { signal: 'Career Action Plan',     pts: '40' },
      { signal: 'Morrisby profile',       pts: '25' },
      { signal: 'Researching careers',    pts: '20' },
      { signal: 'Career interview held',  pts: '15' },
    ],
  },
  work_readiness: {
    label: 'Work readiness',
    description: 'Work experience & employability',
    rubric: [
      { signal: 'Work experience done',  pts: '40' },
      { signal: 'Part-time job',         pts: '25' },
      { signal: 'Work experience prep',  pts: '20' },
      { signal: 'Work-readiness session', pts: '15' },
    ],
  },
  attendance_momentum: {
    label: 'Attendance',
    description: 'Recorded absences',
    rubric: [
      { signal: '0 absences',  pts: '100' },
      { signal: '1–2 absences', pts: '75' },
      { signal: '3–5 absences', pts: '40' },
      { signal: '>5 absences',  pts: '15' },
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
            className="group min-w-0 text-left rounded-md border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:bg-white hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all duration-300 ease-out cursor-help"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 truncate">
              {meta.label}
            </p>
            <div className="flex items-baseline gap-0.5 mt-1">
              <span className={`text-lg font-semibold leading-none tabular-nums ${hasScore ? 'text-slate-900' : 'text-slate-300'}`}>
                {hasScore ? cat.score : '—'}
              </span>
              {hasScore && <span className="text-[11px] font-medium text-slate-300">/100</span>}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-slate-100/90 overflow-hidden">
              {hasScore && (
                <div
                  className={`h-full rounded-full ${color!.bar} opacity-75 group-hover:opacity-100 transition-all duration-300 ease-out group-hover:brightness-105`}
                  style={{ width: `${cat.score}%` }}
                />
              )}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-slate-400 line-clamp-2">{meta.description}</p>
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
      className="z-[300] pointer-events-none rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.06)]"
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
