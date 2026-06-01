/**
 * Deterministic Quick Insights + pilot survey shifts.
 *
 * Computes the categorised insight items shown alongside the AI Analysis
 * Summary (Career Action Plan, Morrisby Unpack, Morrisby Profile,
 * Work Experience, Absences) directly from the student's profile and
 * derived timeline events — no AI involvement.
 *
 * Also extracts start / mid / end pilot survey snapshots from the
 * timeline so the analyze-student edge function can narrate response
 * shifts across the programme.
 */

import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CountInsight {
  count: number;
  complete: boolean;
}

export interface YesNoInsight {
  yes: boolean;
}

export interface AbsenceInsight {
  count: number;
  flagged: boolean;
}

export interface QuickInsights {
  careerActionPlan: CountInsight;
  morrisbyUnpack:   CountInsight;
  morrisbyProfile:  YesNoInsight;
  workExperience:   YesNoInsight;
  absences:         AbsenceInsight;
}

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

// ── Constants ────────────────────────────────────────────────────────────────

const ABSENCE_FLAG_THRESHOLD = 3;

const CAP_PATTERN     = /career\s*action\s*plan|\bcap\b/i;
const UNPACK_PATTERN  = /unpack|morrisby/i;
const WORK_EXP_LABEL  = /work\s*experience/i;
const AFFIRMATIVE     = /^(yes|true|completed|done|y)\b/i;

// ── Internal helpers ─────────────────────────────────────────────────────────

function sessionMatches(ev: TimelineEvent, pattern: RegExp): boolean {
  if (ev.type !== 'session') return false;
  if (ev.interventionType && pattern.test(ev.interventionType)) return true;
  const linked = (ev as TimelineEvent & { linkedInterventions?: string[] }).linkedInterventions;
  if (linked?.some(l => pattern.test(l))) return true;
  return false;
}

function countSessions(events: TimelineEvent[], pattern: RegExp): number {
  return events.reduce((n, ev) => (sessionMatches(ev, pattern) ? n + 1 : n), 0);
}

function detectWorkExperience(events: TimelineEvent[]): boolean {
  for (const ev of events) {
    // A counselling session whose intervention is work experience.
    if (sessionMatches(ev, WORK_EXP_LABEL)) return true;
    // Or a survey field that affirms work experience.
    if (ev.type !== 'survey' || !ev.surveyFields) continue;
    for (const field of ev.surveyFields) {
      if (WORK_EXP_LABEL.test(field.label) && AFFIRMATIVE.test(field.value)) {
        return true;
      }
    }
  }
  return false;
}

function stageFromEvent(ev: TimelineEvent): SurveyStage | null {
  if (ev.type !== 'survey') return null;
  if (ev.id.startsWith('init-survey-')) return 'start';
  if (ev.id.startsWith('mid-survey-'))  return 'mid';
  if (ev.id.startsWith('end-survey-'))  return 'end';
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function computeQuickInsights(
  student: Student,
  events:  TimelineEvent[],
): QuickInsights {
  const capCount    = countSessions(events, CAP_PATTERN);
  const unpackCount = countSessions(events, UNPACK_PATTERN);

  return {
    careerActionPlan: { count: capCount,    complete: capCount    >= 1 },
    morrisbyUnpack:   { count: unpackCount, complete: unpackCount >= 1 },
    morrisbyProfile:  { yes: !!student.hasProfile },
    workExperience:   { yes: detectWorkExperience(events) },
    absences:         {
      count:   student.absenceCount,
      flagged: student.absenceCount > ABSENCE_FLAG_THRESHOLD,
    },
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
    eventCount:     events.length,
    latestEventDate,
  });
}
