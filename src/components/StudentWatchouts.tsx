/**
 * Compact "Watch-outs" strip for the Student Journey header.
 *
 * Renders the proactive watch-outs from {@link computeWatchouts} as small
 * severity-coloured chips. Hovering a chip reveals a custom tooltip that
 * explains, in more depth, why the watch-out fired and what to do about it.
 * Renders nothing when there is nothing to flag.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, Sparkles, type LucideIcon } from 'lucide-react';
import type { Watchout, WatchoutSeverity } from '../lib/studentWatchouts';

interface StudentWatchoutsProps {
  watchouts: Watchout[];
  /** Cap on how many chips to show (rest are summarised). Default 4. */
  max?: number;
}

const SEVERITY_STYLE: Record<
  WatchoutSeverity,
  { label: string; chip: string; icon: LucideIcon; iconClass: string; badge: string }
> = {
  action:   { label: 'Action',   chip: 'bg-rose-50 text-rose-700 border-rose-200',         icon: AlertTriangle, iconClass: 'text-rose-500',    badge: 'text-rose-600 bg-rose-50' },
  watch:    { label: 'Watch',    chip: 'bg-amber-50 text-amber-700 border-amber-200',      icon: Eye,           iconClass: 'text-amber-500',   badge: 'text-amber-600 bg-amber-50' },
  positive: { label: 'Positive', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Sparkles,      iconClass: 'text-emerald-500', badge: 'text-emerald-600 bg-emerald-50' },
};

/** In-depth "why this is flagged" copy, keyed by watch-out id. */
const WATCHOUT_INFO: Record<string, string> = {
  'active-dormant': 'Marked Active but nothing has been logged for over 90 days. They may have quietly disengaged or moved on — confirm they are still enrolled before the gap widens.',
  'stalled': 'The journey is in progress but has had no activity for over 60 days. Momentum has stalled; a quick check-in can help restart progress.',
  'guidance-no-sessions': 'The student has reached Career Guidance but no counselling sessions are recorded. Either sessions are happening and not logged, or guidance has not actually started.',
  'complete-missing-outcomes': 'Marked complete but one or more core outcomes are missing. Completion should normally include a Career Action Plan, a Morrisby profile and an interview.',
  'interview-no-profile': 'An interview is recorded but there is no Morrisby profile. The profile usually underpins the interview — it may be missing or not yet synced.',
  'profile-no-interview': 'A Morrisby profile exists but no interview has been recorded. The follow-up interview that turns the profile into a plan may be outstanding.',
  'consent-stall': 'Referred over 90 days ago but still before the guidance stage. Consent or onboarding may be stuck — worth chasing so the student can start.',
  'deactivated-active': 'A deactivation has been recorded yet the student is still marked Active. The two records disagree — confirm the correct status.',
  'high-absences': 'More than five absences have been recorded. A pattern of absence can signal disengagement or wellbeing issues worth exploring.',
  'no-career-plan': 'In Career Guidance with sessions logged but still no Career Action Plan. The plan is the key output of guidance.',
  'wellbeing-concern': 'The AI review of notes and survey comments picked up possible wellbeing signals. Review the notes directly before acting.',
  'disengaged': 'The AI rating detected signs of disengagement alongside a low engagement score. Worth a check-in to re-engage the student.',
  'equity-escalation': 'A priority-cohort student is tracking in the needs-attention band with high support needs. Prioritise follow-up to close the gap.',
  'thriving': 'Signals point to a student doing well — recognise the progress and keep the momentum going.',
};

export function StudentWatchouts({ watchouts, max = 4 }: StudentWatchoutsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  if (watchouts.length === 0) return null;

  const shown = watchouts.slice(0, max);
  const extra = watchouts.length - shown.length;

  const show = (id: string, el: HTMLElement) => {
    setActiveId(id);
    setAnchor(el.getBoundingClientRect());
  };
  const hide = () => {
    setActiveId(null);
    setAnchor(null);
  };

  const active = activeId ? shown.find(w => w.id === activeId) ?? null : null;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        Watch-outs
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map(w => {
          const style = SEVERITY_STYLE[w.severity];
          const Icon = style.icon;
          return (
            <button
              key={w.id}
              type="button"
              onMouseEnter={e => show(w.id, e.currentTarget)}
              onMouseLeave={hide}
              onFocus={e => show(w.id, e.currentTarget)}
              onBlur={hide}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-help ${style.chip}`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${style.iconClass}`} />
              {w.label}
            </button>
          );
        })}
        {extra > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
            +{extra} more
          </span>
        )}
      </div>

      {active && anchor && <WatchoutTooltip watchout={active} anchor={anchor} />}
    </div>
  );
}

// ── Tooltip (portal so it is never clipped by the header card) ───────────────

interface WatchoutTooltipProps {
  watchout: Watchout;
  anchor:   DOMRect;
}

const TOOLTIP_WIDTH = 260;

function WatchoutTooltip({ watchout, anchor }: WatchoutTooltipProps) {
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

  const style = SEVERITY_STYLE[watchout.severity];
  const why = WATCHOUT_INFO[watchout.id];

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
        <span className="text-xs font-bold text-slate-900">{watchout.label}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {why && (
        <p className="text-[11px] leading-snug text-slate-600">{why}</p>
      )}

      {watchout.detail && (
        <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] leading-snug text-slate-500">
          {watchout.detail}
        </p>
      )}
    </div>,
    document.body,
  );
}
