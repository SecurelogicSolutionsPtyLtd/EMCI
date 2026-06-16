/**
 * Student tracking rating — AI-core, code-finalised.
 *
 * The `rate-student` edge function applies a fixed rubric and returns bounded
 * category scores (0–100 or null) plus flags and a confidence read. This module
 * builds the compact input packet the AI grades, and deterministically turns the
 * AI's category scores into an overall score, band, support need and triage —
 * so the maths and ethics live in code, not in the model.
 */

import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import {
  computeQuickInsights,
  detectWorkExperienceCompleted,
  buildSurveyShifts,
  buildSessionDetails,
  buildTimelineNotes,
  isSessionFeedbackField,
  type QuickInsights,
  type SessionDetail,
  type TimelineNote,
} from './studentInsights';
import { formatProgrammeProgressScore, programmeProgressStep } from './stageProgress';

// ── AI output (mirrors the edge function schema) ───────────────────────────────

export const RATING_CATEGORY_KEYS = [
  'engagement',
  'career_outcomes',
  'work_readiness',
  'attendance_momentum',
  'growth_sentiment',
] as const;

export type RatingCategoryKey = typeof RATING_CATEGORY_KEYS[number];

export type RatingFlag =
  | 'sentiment_concern'
  | 'attendance_risk'
  | 'disengaged'
  | 'stalled'
  | 'no_career_plan'
  | 'thriving';

export type RatingConfidence = 'low' | 'medium' | 'high';

export interface AiRatingCategory {
  key:    RatingCategoryKey;
  score:  number | null;
  reason: string;
}

export interface AiRating {
  categories: AiRatingCategory[];
  flags:      RatingFlag[];
  confidence: RatingConfidence;
}

// ── Finalised output (what the UI consumes) ────────────────────────────────────

export type RatingBand = 'on_track' | 'progressing' | 'monitoring' | 'needs_attention';
export type SupportNeed = 'standard' | 'elevated' | 'high';

export interface FinalCategory {
  key:    RatingCategoryKey;
  label:  string;
  score:  number | null;
  weight: number;
  reason: string;
}

export interface StudentRating {
  overall:    number;
  band:       RatingBand;
  categories: FinalCategory[];
  flags:      RatingFlag[];
  supportNeed: SupportNeed;
  confidence: RatingConfidence;
}

// ── Rubric weights (must sum to 100) ───────────────────────────────────────────

const CATEGORY_WEIGHTS: Record<RatingCategoryKey, number> = {
  engagement:           20,
  career_outcomes:      25,
  work_readiness:       20,
  attendance_momentum:  15,
  growth_sentiment:     20,
};

const CATEGORY_LABELS: Record<RatingCategoryKey, string> = {
  engagement:          'Engagement',
  career_outcomes:     'Career outcomes',
  work_readiness:      'Work readiness',
  attendance_momentum: 'Attendance & momentum',
  growth_sentiment:    'Growth & sentiment',
};

// ── Packet builder (input the AI grades) ───────────────────────────────────────

export interface RatingPacket {
  programmeProgressScore: string;
  programmeStageProgress: number;
  status: string;
  interviewed:      boolean;
  hasProfile:       boolean;
  yearLevel:        number;
  sessionCount:     number;
  interventionAreas: {
    cap: boolean; wexPrep: boolean; morrisby: boolean; industry: boolean; workReadiness: boolean;
  };
  insights:        QuickInsights;
  surveys:         { stage: string; fields: Record<string, string> }[];
  /** Full per-session intervention detail (length, type, multiselect areas,
   *  student satisfaction, what the student found useful) — labels, not codes. */
  sessionDetails:  SessionDetail[];
  timelineNotes:   TimelineNote[];
  careerSignals:   { workExperienceCompleted: boolean };
  notesRedacted:   string;
}

const MAX_NOTES_CHARS   = 4000;

function detectInterventionAreas(events: TimelineEvent[]): RatingPacket['interventionAreas'] {
  const haystack = events
    .filter(e => e.type === 'session')
    .flatMap(e => [
      e.interventionType ?? '',
      ...(e.surveyFields ?? [])
        .filter(f => !isSessionFeedbackField(f.label))
        .map(f => `${f.label} ${f.value}`),
    ])
    .join(' ')
    .toLowerCase();
  return {
    cap:           /career\s*action\s*plan|\bcap\b/.test(haystack),
    wexPrep:       /work\s*experience|\bwex\b/.test(haystack),
    morrisby:      /morrisby|unpack/.test(haystack),
    industry:      /industry/.test(haystack),
    workReadiness: /work\s*readiness/.test(haystack),
  };
}

export function buildRatingPacket(student: Student, events: TimelineEvent[]): RatingPacket {
  const insights = computeQuickInsights(student, events);
  const surveys  = buildSurveyShifts(events).map(s => ({ stage: s.stage, fields: s.fields }));
  const sessionCount = events.reduce((n, e) => (e.type === 'session' ? n + 1 : n), 0);
  const timelineNotes = buildTimelineNotes(student, events);

  return {
    programmeProgressScore: formatProgrammeProgressScore(student.stageProgress),
    programmeStageProgress: programmeProgressStep(student.stageProgress),
    status:           student.status,
    interviewed:      !!student.interviewed,
    hasProfile:       !!student.hasProfile,
    yearLevel:        student.yearLevel,
    sessionCount,
    interventionAreas: detectInterventionAreas(events),
    insights,
    surveys,
    sessionDetails:   buildSessionDetails(events),
    timelineNotes,
    careerSignals:    { workExperienceCompleted: detectWorkExperienceCompleted(events) },
    notesRedacted:    timelineNotes.map(n => `${n.title}: ${n.note}`).join('\n').slice(0, MAX_NOTES_CHARS),
  };
}

// ── Support need (ethics: context only, never lowers the score) ─────────────────

const PRIORITY_COHORT_PATTERN = /disab|koorie|aborigin|torres|out[\s-]?of[\s-]?home|oohc|youth justice|refugee|eal\b|priority|at[\s-]?risk/i;

export function deriveSupportNeed(student: Student): SupportNeed {
  const type = student.studentType ?? '';
  const cohortMatches = (type.match(PRIORITY_COHORT_PATTERN) ? 1 : 0)
    + (/,|;|\band\b/.test(type) && PRIORITY_COHORT_PATTERN.test(type) ? 1 : 0);
  const yearPressure = student.yearLevel >= 11 ? 1 : 0;
  const weight = cohortMatches + yearPressure;
  if (weight >= 2) return 'high';
  if (weight >= 1) return 'elevated';
  return 'standard';
}

// ── Finalisation (deterministic; the maths lives here, not in the model) ────────

function clampScore(n: number | null): number | null {
  if (n === null || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bandFromScore(score: number): RatingBand {
  if (score >= 80) return 'on_track';
  if (score >= 65) return 'progressing';
  if (score >= 45) return 'monitoring';
  return 'needs_attention';
}

function normalizeCategoryKey(key: string): RatingCategoryKey {
  if (key === 'growth_wellbeing') return 'growth_sentiment';
  return key as RatingCategoryKey;
}

function normalizeFlag(flag: string): RatingFlag {
  if (flag === 'wellbeing_concern') return 'sentiment_concern';
  return flag as RatingFlag;
}

export function finaliseRating(ai: AiRating, student: Student): StudentRating {
  const byKey = new Map<RatingCategoryKey, AiRatingCategory>();
  for (const c of ai.categories) byKey.set(normalizeCategoryKey(c.key), c);

  const categories: FinalCategory[] = RATING_CATEGORY_KEYS.map(key => ({
    key,
    label:  CATEGORY_LABELS[key],
    score:  clampScore(byKey.get(key)?.score ?? null),
    weight: CATEGORY_WEIGHTS[key],
    reason: byKey.get(key)?.reason ?? '',
  }));

  let weightedSum = 0;
  let weightUsed  = 0;
  for (const c of categories) {
    if (c.score === null) continue;
    weightedSum += c.score * c.weight;
    weightUsed  += c.weight;
  }
  const overall = weightUsed > 0 ? Math.round(weightedSum / weightUsed) : 0;

  return {
    overall,
    band:        bandFromScore(overall),
    categories,
    flags:       (ai.flags ?? []).map(normalizeFlag),
    supportNeed: deriveSupportNeed(student),
    confidence:  ai.confidence ?? 'low',
  };
}
