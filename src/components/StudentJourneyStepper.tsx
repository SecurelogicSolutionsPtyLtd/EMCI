import React from 'react';
import {
  Check, ClipboardCheck, Compass, Flag, type LucideIcon,
} from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';

// ── Steps ────────────────────────────────────────────────────────────────────

const STEPS: { key: StepKey; label: string; Icon: LucideIcon }[] = [
  { key: 'consent',         label: 'Referral',        Icon: ClipboardCheck },
  { key: 'career_guidance', label: 'Career Guidance', Icon: Compass },
  { key: 'complete',        label: 'Complete',        Icon: Flag },
];

type StepKey = 'consent' | 'career_guidance' | 'complete';
type StepStatus = 'done' | 'current' | 'pending';

/**
 * Derives each visual step's status from the numeric `stageProgress` (0–4)
 * rather than the nullable `currentStage`. The visible progress score is
 * reported as X/3 (referral excluded) so the stepper matches AI narratives.
 *
 * Progress scale: 0 not started · 1–2 consent · 3 career guidance · 4 complete.
 * The referral data stage (1) is folded into the visual "Consent" step.
 */
function getStepStatus(stepKey: StepKey, stageProgress: number): StepStatus {
  switch (stepKey) {
    case 'consent':
      if (stageProgress >= 3) return 'done';
      if (stageProgress >= 1) return 'current';
      return 'pending';
    case 'career_guidance':
      if (stageProgress >= 4) return 'done';
      if (stageProgress === 3) return 'current';
      return 'pending';
    case 'complete':
      return stageProgress >= 4 ? 'done' : 'pending';
    default: {
      const exhaustive: never = stepKey;
      return exhaustive;
    }
  }
}

// ── Step detail derivation (shared with CompletedJourneyPanel) ───────────────

export function formatShortDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function latestEventDate(
  events: TimelineEvent[],
  types: readonly TimelineEvent['type'][] | null,
): string | null {
  let latest: string | null = null;
  for (const event of events) {
    if (types && !types.includes(event.type)) continue;
    if (!event.date) continue;
    if (latest === null || new Date(event.date).getTime() > new Date(latest).getTime()) {
      latest = event.date;
    }
  }
  return latest;
}

export function countSessions(events: TimelineEvent[]): number {
  return events.filter((event) => event.type === 'session').length;
}

/**
 * Sub-label for each step. Completed steps surface real evidence from the
 * timeline (dates, session counts) instead of a generic "Completed".
 */
function getStepDetail(stepKey: StepKey, status: StepStatus, events: TimelineEvent[]): string {
  if (status === 'current') return 'Active Stage';
  if (status === 'pending') return 'Upcoming';
  switch (stepKey) {
    case 'consent': {
      const date = latestEventDate(events, ['consent', 'referral']);
      const formatted = date ? formatShortDate(date) : null;
      return formatted ? `Completed ${formatted}` : 'Completed';
    }
    case 'career_guidance': {
      const sessions = countSessions(events);
      const date = latestEventDate(events, ['session']);
      const formatted = date ? formatShortDate(date) : null;
      if (sessions > 0) {
        const count = `${sessions} session${sessions !== 1 ? 's' : ''}`;
        return formatted ? `${count} · ${formatted}` : count;
      }
      return 'Completed';
    }
    case 'complete': {
      const date = latestEventDate(events, null);
      const formatted = date ? formatShortDate(date) : null;
      return formatted ? `Finished ${formatted}` : 'Completed';
    }
    default: {
      const exhaustive: never = stepKey;
      return exhaustive;
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface StudentJourneyStepperProps {
  student: Pick<Student, 'stageProgress'>;
  events:  TimelineEvent[];
}

/** In-progress stepper. Completed students use `CompletedJourneyPanel` instead. */
export function StudentJourneyStepper({ student, events }: StudentJourneyStepperProps) {
  return (
    <div className="border-t border-slate-100 px-8 py-5">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.key, student.stageProgress);
          const StepIcon = status === 'done' ? Check : step.Icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  status === 'done'
                    ? 'bg-primary shadow-sm shadow-primary/30'
                    : status === 'current'
                    ? 'bg-primary ring-4 ring-primary/15 shadow-sm shadow-primary/30'
                    : 'border-2 border-slate-300 bg-white'
                }`}>
                  <StepIcon
                    className={`w-4 h-4 ${status === 'pending' ? 'text-slate-400' : 'text-white'}`}
                    strokeWidth={2.25}
                  />
                </div>
                <span className="flex flex-col items-center gap-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                    status === 'pending'
                      ? 'text-slate-300'
                      : status === 'current'
                      ? 'text-primary'
                      : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                  <span className={`text-xs font-semibold tracking-tight transition-colors duration-300 ${
                    status === 'pending'
                      ? 'text-slate-400'
                      : status === 'current'
                      ? 'text-slate-900'
                      : 'text-slate-700'
                  }`}>
                    {getStepDetail(step.key, status, events)}
                  </span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-9 mx-2 rounded-full transition-colors duration-300 ${
                  status === 'done' ? 'bg-primary' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
