/**
 * Deterministic Quick Insights + pilot survey shifts.
 *
 * Computes the eight EMCI session intervention areas shown alongside the AI
 * Analysis Summary (Unpack, CAP, Work Readiness, Industry Engagement,
 * External Support, WEX Preparation, Introduction, Other) directly from
 * counselling session records — no AI involvement.
 *
 * Also extracts start / mid / end pilot survey snapshots from the
 * timeline so the analyze-student edge function can narrate response
 * shifts across the programme.
 */

import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import {
  buildRedactionLiterals,
  buildFuzzyNameTokens,
  redactText,
} from './studentRedaction';

// ── Types ────────────────────────────────────────────────────────────────────

export interface YesNoInsight {
  yes: boolean;
}

export const QUICK_INSIGHT_AREAS = [
  { key: 'unpack',             label: 'Unpack',              pattern: /\bunpack\b|morrisby/i },
  { key: 'cap',                label: 'CAP',                 pattern: /career\s*action\s*plan|\bcap\b/i },
  { key: 'workReadiness',      label: 'Work Readiness',      pattern: /work\s*readiness/i },
  { key: 'industryEngagement', label: 'Industry Engagement', pattern: /industry\s*engagement|\bindustry\b/i },
  { key: 'externalSupport',    label: 'External Support',    pattern: /external\s*support/i },
  { key: 'wexPreparation',     label: 'WEX Preparation',     pattern: /wex\s*preparation|work\s*experience\s*prep|\bwex\b/i },
  { key: 'introduction',       label: 'Introduction',        pattern: /\bintroduction\b/i },
  { key: 'other',              label: 'Other',               pattern: /\bother\b/i },
] as const;

export type QuickInsightAreaKey = typeof QUICK_INSIGHT_AREAS[number]['key'];

export interface QuickInsightCounts {
  sessionCount:    number;
  absenceCount:    number;
  absencesFlagged: boolean;
}

export type QuickInsights = Record<QuickInsightAreaKey, YesNoInsight> & QuickInsightCounts;

export type SurveyStage = 'start' | 'mid' | 'end';

export interface SurveyShift {
  stage: SurveyStage;
  date:  string;
  title: string;
  fields: Record<string, string>;
}

export interface SessionDetail {
  date:             string;
  title:            string;
  interventionType?: string;
  sessionLength?:   string;
  fields:           Record<string, string>;
}

export interface TimelineNote {
  date:  string;
  type:  TimelineEvent['type'];
  title: string;
  note:  string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ABSENCE_FLAG_THRESHOLD = 3;

const WORK_EXP_LABEL = /work\s*experience/i;
const AFFIRMATIVE    = /^(yes|true|completed|done|y)\b/i;
const NOTE_LABEL     = /note|support|comment|reflection|goal|next step/i;
const MAX_TIMELINE_NOTES = 20;
const MAX_TIMELINE_NOTE_CHARS = 1000;

const PLACEHOLDER_NOTES = new Set([
  '',
  'Session notes not recorded.',
]);

const DEDICATED_FIELD_LABELS: Partial<Record<QuickInsightAreaKey, string>> = {
  unpack:             'Morrisby Activities',
  cap:                'Career Action Plan',
  industryEngagement: 'Industry Engagement',
  wexPreparation:     'Work Experience Prep',
  workReadiness:      'Work Readiness',
  externalSupport:    'External Support',
  other:              'Other Intervention',
};

function emptyQuickInsights(): QuickInsights {
  return Object.fromEntries(
    QUICK_INSIGHT_AREAS.map(a => [a.key, { yes: false }]),
  ) as QuickInsights;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function sessionTextParts(ev: TimelineEvent): string[] {
  if (ev.type !== 'session') return [];
  const parts: string[] = [];
  if (ev.interventionType) parts.push(ev.interventionType);
  if (ev.description)      parts.push(ev.description);
  const linked = (ev as TimelineEvent & { linkedInterventions?: string[] }).linkedInterventions;
  if (linked) parts.push(...linked);
  for (const f of ev.surveyFields ?? []) {
    parts.push(f.label, f.value);
  }
  return parts;
}

function dedicatedFieldPresent(ev: TimelineEvent, key: QuickInsightAreaKey): boolean {
  const label = DEDICATED_FIELD_LABELS[key];
  if (!label) return false;
  return (ev.surveyFields ?? []).some(
    f => f.label === label && f.value.trim().length > 0,
  );
}

function interventionAreasMatch(ev: TimelineEvent, pattern: RegExp): boolean {
  const areas = (ev.surveyFields ?? []).find(f => f.label === 'Intervention Areas');
  if (!areas?.value.trim()) return false;
  return areas.value.split(';').some(token => pattern.test(token.trim()));
}

function sessionHasArea(ev: TimelineEvent, key: QuickInsightAreaKey, pattern: RegExp): boolean {
  const haystack = sessionTextParts(ev).join(' ');
  if (pattern.test(haystack)) return true;
  if (interventionAreasMatch(ev, pattern)) return true;
  return dedicatedFieldPresent(ev, key);
}

function detectInterventionAreas(events: TimelineEvent[]): QuickInsights {
  const insights = emptyQuickInsights();
  for (const ev of events) {
    if (ev.type !== 'session') continue;
    for (const area of QUICK_INSIGHT_AREAS) {
      if (insights[area.key].yes) continue;
      if (sessionHasArea(ev, area.key, area.pattern)) {
        insights[area.key].yes = true;
      }
    }
  }
  return insights;
}

function countSessions(events: TimelineEvent[]): number {
  return events.reduce((n, ev) => (ev.type === 'session' ? n + 1 : n), 0);
}

function stageFromEvent(ev: TimelineEvent): SurveyStage | null {
  if (ev.type !== 'survey') return null;
  if (ev.id.startsWith('init-survey-')) return 'start';
  if (ev.id.startsWith('mid-survey-'))  return 'mid';
  if (ev.id.startsWith('end-survey-'))  return 'end';
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Completed work experience — used by rating and DE analytics, separate from WEX prep. */
export function detectWorkExperienceCompleted(events: TimelineEvent[]): boolean {
  for (const ev of events) {
    if (ev.type === 'session') {
      const haystack = sessionTextParts(ev).join(' ');
      if (WORK_EXP_LABEL.test(haystack) && !/prep/i.test(haystack)) return true;
      if (WORK_EXP_LABEL.test(ev.interventionType ?? '')) return true;
    }
    if (ev.type !== 'survey' || !ev.surveyFields) continue;
    for (const field of ev.surveyFields) {
      if (WORK_EXP_LABEL.test(field.label) && AFFIRMATIVE.test(field.value)) {
        return true;
      }
    }
  }
  return false;
}

export function computeQuickInsights(
  student: Student,
  events:  TimelineEvent[],
): QuickInsights {
  const absenceCount = student.absenceCount;
  return {
    ...detectInterventionAreas(events),
    sessionCount:    countSessions(events),
    absenceCount,
    absencesFlagged: absenceCount > ABSENCE_FLAG_THRESHOLD,
  };
}

export function buildSurveyShifts(events: TimelineEvent[]): SurveyShift[] {
  const shifts: SurveyShift[] = [];
  for (const ev of events) {
    const stage = stageFromEvent(ev);
    if (!stage) continue;
    const fields: Record<string, string> = {};
    for (const f of ev.surveyFields ?? []) fields[f.label] = f.value;
    shifts.push({ stage, date: ev.date, title: ev.title, fields });
  }
  shifts.sort((a, b) => a.date.localeCompare(b.date));
  return shifts;
}

/**
 * Extracts each counselling session's full intervention detail from the
 * timeline so the AI analysis can reference what actually happened in sessions
 * (intervention areas, Morrisby/CAP/industry/work-readiness activities, notes).
 */
export function buildSessionDetails(events: TimelineEvent[]): SessionDetail[] {
  const details: SessionDetail[] = [];
  for (const ev of events) {
    if (ev.type !== 'session') continue;
    const fields: Record<string, string> = {};
    for (const f of ev.surveyFields ?? []) fields[f.label] = f.value;
    if (
      ev.notes &&
      ev.notes !== 'Session notes not recorded.' &&
      !fields['Notes']
    ) {
      fields['Notes'] = ev.notes;
    }
    // Per-session student feedback — read from dedicated event fields rather than
    // surveyFields so the deterministic detectors never see (and mis-match) them.
    if (ev.sessionSatisfaction) fields['Session Satisfaction'] = ev.sessionSatisfaction;
    if (ev.sessionUseful)       fields['Found Useful']         = ev.sessionUseful;
    details.push({
      date:             ev.date,
      title:            ev.title,
      interventionType: ev.interventionType,
      sessionLength:    ev.sessionLength,
      fields,
    });
  }
  details.sort((a, b) => a.date.localeCompare(b.date));
  return details;
}

export function buildTimelineNotes(student: Student, events: TimelineEvent[]): TimelineNote[] {
  const literals = buildRedactionLiterals(student);
  const tokens   = buildFuzzyNameTokens(student);
  const seen = new Set<string>();
  const notes: TimelineNote[] = [];

  const addNote = (ev: TimelineEvent, raw: string | null | undefined) => {
    if (!raw?.trim()) return;
    const redacted = redactText(raw, literals, tokens).slice(0, MAX_TIMELINE_NOTE_CHARS).trim();
    if (PLACEHOLDER_NOTES.has(redacted)) return;
    const key = `${ev.date}|${ev.type}|${ev.title}|${redacted}`;
    if (seen.has(key)) return;
    seen.add(key);
    notes.push({
      date:  ev.date,
      type:  ev.type,
      title: ev.title,
      note:  redacted,
    });
  };

  for (const ev of events) {
    addNote(ev, ev.notes);
    for (const field of ev.surveyFields ?? []) {
      if (NOTE_LABEL.test(field.label)) {
        addNote(ev, `${field.label}: ${field.value}`);
      }
    }
  }

  return notes
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_TIMELINE_NOTES);
}

/** Minimum stage progress before an EMCI analysis is meaningful (career guidance). */
export const ANALYSIS_MIN_STAGE_PROGRESS = 3;

/**
 * Stable fingerprint of the inputs fed to analyze-student. Used to detect when
 * a stored analysis is out of date relative to the student's current record.
 */
export function buildAnalysisSourceFingerprint(
  student: Student,
  events:  TimelineEvent[],
): string {
  const insights       = computeQuickInsights(student, events);
  const surveyShifts   = buildSurveyShifts(events);
  const sessionDetails = buildSessionDetails(events);
  const timelineNotes  = buildTimelineNotes(student, events);
  const latestEventDate = events.reduce(
    (max, ev) => (ev.date && ev.date > max ? ev.date : max),
    '',
  );

  return JSON.stringify({
    stageProgress:  student.stageProgress,
    currentStage:   student.currentStage,
    status:         student.status,
    absenceCount:   student.absenceCount,
    interviewed:    student.interviewed,
    hasProfile:     student.hasProfile,
    studentType:    student.studentType,
    yearLevel:      student.yearLevel,
    insights,
    surveyStages:   surveyShifts.map(s => s.stage),
    sessionDetails,
    timelineNotes,
    eventCount:     events.length,
    latestEventDate,
  });
}
