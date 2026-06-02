/**
 * Proactive student watch-outs.
 *
 * Surfaces "things worth a look" on a student — mostly deterministic, factual
 * checks (no AI), with a few softer signals derived from the AI rating flags.
 * Pure and side-effect free: it reads the already-loaded student record, the
 * derived timeline events and (optionally) a generated rating. It never writes
 * to or fetches from any data source.
 *
 * See STUDENT_WATCHOUTS.md for the thresholds and the wider design.
 */

import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import type { StudentRating } from './studentRating';
import { computeQuickInsights } from './studentInsights';

export type WatchoutSeverity = 'action' | 'watch' | 'positive';

export interface Watchout {
  id:       string;
  severity: WatchoutSeverity;
  label:    string;
  /** Optional one-line hint (shown as a tooltip in the UI). */
  detail?:  string;
}

// ── Thresholds (mirrors STUDENT_WATCHOUTS.md) ──────────────────────────────

const DORMANT_ACTIVE_DAYS = 90; // Active but no activity for this long
const STALL_DAYS          = 60; // in-progress and idle for this long
const CONSENT_STALL_DAYS  = 90; // referred this long ago, still pre-guidance
const HIGH_ABSENCE_COUNT  = 5;  // more than this many absences

const SEVERITY_ORDER: Record<WatchoutSeverity, number> = {
  action: 0,
  watch: 1,
  positive: 2,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function daysSince(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

/** Days since the most recent timeline event, falling back to lastActivity. */
function daysSinceLastActivity(student: Student, events: TimelineEvent[]): number | null {
  const latestEventDate = events.reduce(
    (max, e) => (e.date && e.date > max ? e.date : max),
    '',
  );
  return daysSince(latestEventDate || student.lastActivity);
}

function isInProgress(student: Student): boolean {
  return student.stageProgress > 0 && student.currentStage !== 'complete';
}

function countSessions(events: TimelineEvent[]): number {
  return events.reduce((n, e) => (e.type === 'session' ? n + 1 : n), 0);
}

function earliestReferralDays(events: TimelineEvent[]): number | null {
  const referralDates = events
    .filter(e => e.type === 'referral' && e.date)
    .map(e => e.date)
    .sort();
  return referralDates.length > 0 ? daysSince(referralDates[0]) : null;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ── Engine ─────────────────────────────────────────────────────────────────

/**
 * Computes the watch-outs for a single student. Pass the generated `rating`
 * (when available) to include the AI-flag-derived signals; omit it for the
 * deterministic checks only.
 */
export function computeWatchouts(
  student: Student,
  events:  TimelineEvent[],
  rating:  StudentRating | null = null,
): Watchout[] {
  const out: Watchout[] = [];
  const insights    = computeQuickInsights(student, events);
  const idle        = daysSinceLastActivity(student, events);
  const sessions    = countSessions(events);
  const inProgress  = isInProgress(student);

  // 1. Inactivity — contradiction (active + dormant) or momentum (stalled).
  //    Completed students are expected to be inactive, so this never applies to them.
  if (idle !== null && student.currentStage !== 'complete') {
    if (student.status === 'Active' && idle > DORMANT_ACTIVE_DAYS) {
      out.push({
        id: 'active-dormant',
        severity: 'action',
        label: `Active but no activity in ${idle} days`,
        detail: 'Confirm the student is still enrolled and engaged.',
      });
    } else if (inProgress && idle > STALL_DAYS) {
      out.push({
        id: 'stalled',
        severity: 'watch',
        label: `Stalled — no activity in ${idle} days`,
      });
    }
  }

  // 2. In Career Guidance with nothing logged.
  if (student.currentStage === 'career_guidance' && sessions === 0) {
    out.push({
      id: 'guidance-no-sessions',
      severity: 'action',
      label: 'In Career Guidance with no sessions logged',
    });
  }

  // 3. Completed without the expected outcomes.
  if (student.currentStage === 'complete') {
    const missing: string[] = [];
    if (!insights.cap.yes) missing.push('a Career Action Plan');
    if (!student.hasProfile)                 missing.push('a Morrisby profile');
    if (!student.interviewed)                missing.push('an interview');
    if (missing.length > 0) {
      out.push({
        id: 'complete-missing-outcomes',
        severity: 'watch',
        label: `Completed without ${joinList(missing)}`,
      });
    }
  }

  // 4. Interview / profile mismatch.
  if (student.interviewed && !student.hasProfile) {
    out.push({
      id: 'interview-no-profile',
      severity: 'watch',
      label: 'Interviewed but no Morrisby profile',
    });
  } else if (student.hasProfile && !student.interviewed) {
    out.push({
      id: 'profile-no-interview',
      severity: 'watch',
      label: 'Has a profile but no interview recorded',
    });
  }

  // 5. Consent stall — referred long ago, still pre-guidance.
  const referralDays = earliestReferralDays(events);
  if (referralDays !== null && referralDays > CONSENT_STALL_DAYS && inProgress && student.stageProgress < 3) {
    out.push({
      id: 'consent-stall',
      severity: 'watch',
      label: `Referred ${referralDays} days ago, not yet in guidance`,
    });
  }

  // 6. Deactivation recorded but still marked Active.
  if (student.studentDeactivation != null && student.status === 'Active') {
    out.push({
      id: 'deactivated-active',
      severity: 'action',
      label: 'Deactivation recorded but still marked Active',
      detail: student.studentDeactivationLabel ?? undefined,
    });
  }

  // 7. High absences.
  if (student.absenceCount > HIGH_ABSENCE_COUNT) {
    out.push({
      id: 'high-absences',
      severity: 'watch',
      label: `High absences (${student.absenceCount} recorded)`,
    });
  }

  // 8. In guidance with sessions but still no Career Action Plan.
  if (
    student.currentStage === 'career_guidance' &&
    sessions > 0 &&
    !insights.cap.yes
  ) {
    out.push({
      id: 'no-career-plan',
      severity: 'watch',
      label: 'No Career Action Plan yet',
    });
  }

  // ── AI-flag-derived signals (only when a rating has been generated) ──
  if (rating) {
    const lowConfidence = rating.confidence === 'low';
    const verifyHint = lowConfidence ? 'Limited data — verify first.' : undefined;

    if (rating.flags.includes('wellbeing_concern')) {
      out.push({
        id: 'wellbeing-concern',
        severity: 'action',
        label: 'Wellbeing concern flagged — review notes',
        detail: verifyHint,
      });
    }
    if (rating.flags.includes('disengaged')) {
      out.push({
        id: 'disengaged',
        severity: 'watch',
        label: 'Signs of disengagement',
        detail: verifyHint,
      });
    }
    if (rating.supportNeed === 'high' && rating.band === 'needs_attention') {
      out.push({
        id: 'equity-escalation',
        severity: 'action',
        label: 'Priority-cohort student tracking behind',
      });
    }
    const thriving = rating.flags.includes('thriving')
      || (rating.band === 'on_track' && rating.supportNeed === 'high');
    if (thriving) {
      out.push({
        id: 'thriving',
        severity: 'positive',
        label: rating.supportNeed === 'high'
          ? 'Priority-cohort student doing well'
          : 'Thriving',
      });
    }
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
