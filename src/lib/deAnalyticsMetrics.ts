/**
 * DE Analytics — aggregate, de-identified programme metrics.
 *
 * Every export here returns counts, rates and cohort/region rollups only.
 * No student rows, names, Morrisby IDs, year levels or counsellor identities
 * ever leave this module, so the output is safe for Department of Education
 * oversight users. All inputs are the already-loaded `students` / `schools`
 * arrays and the derived `studentEventsMap`.
 */

import type { Student } from '../data/studentsData';
import type { School } from '../data/networkData';
import type { TimelineEvent } from '../services/dataverse';
import { computeQuickInsights } from './studentInsights';

// ── Cohorts ────────────────────────────────────────────────────────────────

export type Cohort =
  | 'Disability'
  | 'Koorie'
  | 'Out-of-Home Care'
  | 'Youth Justice'
  | 'At Risk'
  | 'Standard';

/** Priority equity cohorts (everything except the Standard baseline). */
export const PRIORITY_COHORTS: Cohort[] = [
  'Disability',
  'Koorie',
  'Out-of-Home Care',
  'Youth Justice',
  'At Risk',
];

export const ALL_COHORTS: Cohort[] = [...PRIORITY_COHORTS, 'Standard'];

/** Tailwind-friendly hex colours per cohort (aligned with app tokens). */
export const COHORT_COLORS: Record<Cohort, string> = {
  Disability:         '#2563EB', // emci-accent (blue)
  Koorie:             '#ec5b13', // primary (orange)
  'Out-of-Home Care': '#8B5CF6', // violet
  'Youth Justice':    '#F59E0B', // amber
  'At Risk':          '#EF4444', // risk (red)
  Standard:           '#64748B', // slate
};

const COHORT_MATCHERS: { cohort: Cohort; pattern: RegExp }[] = [
  { cohort: 'Disability',       pattern: /disab/i },
  { cohort: 'Koorie',           pattern: /koorie|aborigin|torres|first\s*nations|indigenous/i },
  { cohort: 'Out-of-Home Care', pattern: /out[\s-]?of[\s-]?home|oohc/i },
  { cohort: 'Youth Justice',    pattern: /youth\s*justice|justice/i },
  { cohort: 'At Risk',          pattern: /at[\s-]?risk|priority|refugee|eal\b/i },
];

/**
 * Map a free-form, semicolon-delimited `studentType` to the canonical cohort
 * set. A student can belong to multiple priority cohorts. When no priority tag
 * is recognised the student counts as `Standard`.
 */
export function parseCohorts(studentType: string | undefined | null): Cohort[] {
  const raw = studentType ?? '';
  const matched = COHORT_MATCHERS.filter(m => m.pattern.test(raw)).map(m => m.cohort);
  return matched.length > 0 ? matched : ['Standard'];
}

// ── Shared helpers ───────────────────────────────────────────────────────────

/** In-progress: started a stage but not yet complete. */
export function isInProgress(s: Student): boolean {
  return s.stageProgress > 0 && s.currentStage !== 'complete';
}

export function isComplete(s: Student): boolean {
  return s.currentStage === 'complete';
}

export function daysSinceLastActivity(s: Student): number | null {
  if (!s.lastActivity) return null;
  const then = Date.parse(s.lastActivity);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

/** A journey that has started but gone quiet for too long. */
export const STALL_DAYS = 60;

export function isStalled(s: Student): boolean {
  if (!isInProgress(s)) return false;
  const days = daysSinceLastActivity(s);
  return days !== null && days > STALL_DAYS;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ── Dashboard filters (user-settable, applied across every view) ────────────

export type StatusFilter = 'all' | 'Active' | 'Inactive' | 'Pending';

export interface DeFilters {
  region: string;       // 'all' or a region name
  status: StatusFilter;
}

export const DEFAULT_DE_FILTERS: DeFilters = { region: 'all', status: 'all' };

/** Distinct, sorted region names present in the visible schools. */
export function listRegions(schools: School[]): string[] {
  return Array.from(new Set(schools.map(s => s.region).filter(Boolean))).sort();
}

/**
 * Scope the visible students + schools by the user's chosen region and status.
 * Region filtering narrows schools first, then students to those schools so the
 * "active schools" overview stat stays consistent with the rest of the views.
 */
export function applyDeFilters(
  students: Student[],
  schools: School[],
  filters: DeFilters,
): { students: Student[]; schools: School[] } {
  const scopedSchools =
    filters.region === 'all' ? schools : schools.filter(s => s.region === filters.region);
  const schoolIds = new Set(scopedSchools.map(s => s.id));

  let scopedStudents = students;
  if (filters.region !== 'all') {
    scopedStudents = scopedStudents.filter(s => schoolIds.has(s.schoolId ?? ''));
  }
  if (filters.status !== 'all') {
    scopedStudents = scopedStudents.filter(s => s.status === filters.status);
  }
  return { students: scopedStudents, schools: scopedSchools };
}

// ── 1. Programme Overview ──────────────────────────────────────────────────

export interface ProgrammeOverview {
  totalEnrolled:    number;
  activeSchools:    number;
  completionRate:   number; // %
  inCareerGuidance: number;
  needingFollowUp:  number;
}

export function buildProgrammeOverview(
  students: Student[],
  schools: School[],
): ProgrammeOverview {
  const totalEnrolled = students.length;
  const activeSchools = schools.filter(s => s.status === 'Active').length;
  const completed     = students.filter(isComplete).length;
  return {
    totalEnrolled,
    activeSchools,
    completionRate:   pct(completed, totalEnrolled),
    inCareerGuidance: students.filter(s => s.currentStage === 'career_guidance').length,
    needingFollowUp:  students.filter(isStalled).length,
  };
}

// ── 2. Outcomes by Cohort ──────────────────────────────────────────────────

export interface CohortOutcome {
  cohort:         Cohort;
  count:          number;
  completionRate: number; // %
  capRate:        number; // % with a Career Action Plan
  wexRate:        number; // % with work experience
  morrisbyRate:   number; // % with a Morrisby profile
}

export function buildCohortOutcomes(
  students: Student[],
  eventsMap: Record<string, TimelineEvent[]>,
): CohortOutcome[] {
  const buckets = new Map<Cohort, Student[]>();
  for (const cohort of ALL_COHORTS) buckets.set(cohort, []);
  for (const student of students) {
    for (const cohort of parseCohorts(student.studentType)) {
      buckets.get(cohort)!.push(student);
    }
  }

  return ALL_COHORTS.map(cohort => {
    const members = buckets.get(cohort)!;
    const count   = members.length;
    let cap = 0, wex = 0, morrisby = 0;
    for (const s of members) {
      const insights = computeQuickInsights(s, eventsMap[s.id] ?? []);
      if (insights.careerActionPlan.complete) cap++;
      if (insights.workExperience.yes)        wex++;
      if (insights.morrisbyProfile.yes)       morrisby++;
    }
    return {
      cohort,
      count,
      completionRate: pct(members.filter(isComplete).length, count),
      capRate:        pct(cap, count),
      wexRate:        pct(wex, count),
      morrisbyRate:   pct(morrisby, count),
    };
  }).filter(o => o.count > 0);
}

// ── 3. Stage Progress Funnel ───────────────────────────────────────────────

export type FunnelStage = 'Referral' | 'Consent' | 'Career Guidance' | 'Complete';

export interface FunnelStep {
  stage: FunnelStage;
  count: number;
}

const FUNNEL_THRESHOLDS: { stage: FunnelStage; minProgress: number }[] = [
  { stage: 'Referral',        minProgress: 1 },
  { stage: 'Consent',         minProgress: 2 },
  { stage: 'Career Guidance', minProgress: 3 },
  { stage: 'Complete',        minProgress: 4 },
];

/**
 * Cumulative funnel: each step counts students who reached at least that stage.
 * Pass a cohort to scope the funnel; omit (or 'All') for the whole population.
 */
export function buildStageFunnel(
  students: Student[],
  cohortFilter: Cohort | 'All' = 'All',
): FunnelStep[] {
  const scoped = cohortFilter === 'All'
    ? students
    : students.filter(s => parseCohorts(s.studentType).includes(cohortFilter));
  return FUNNEL_THRESHOLDS.map(({ stage, minProgress }) => ({
    stage,
    count: scoped.filter(s => s.stageProgress >= minProgress).length,
  }));
}

// ── 4. Completion Gap Analysis ─────────────────────────────────────────────

export interface CompletionGapRow {
  cohort:          Cohort;
  count:           number;
  completionRate:  number; // %
  overallRate:     number; // %
  delta:           number; // cohort - overall (percentage points)
}

export function buildCompletionGap(students: Student[]): CompletionGapRow[] {
  const overallRate = pct(students.filter(isComplete).length, students.length);
  return PRIORITY_COHORTS.map(cohort => {
    const members = students.filter(s => parseCohorts(s.studentType).includes(cohort));
    const rate    = pct(members.filter(isComplete).length, members.length);
    return {
      cohort,
      count:          members.length,
      completionRate: rate,
      overallRate,
      delta:          rate - overallRate,
    };
  }).filter(r => r.count > 0);
}

// ── 5. Regional Performance ────────────────────────────────────────────────

export interface RegionalPerformanceRow {
  region:         string;
  count:          number;
  completionRate: number; // %
  engagementRate: number; // % interviewed or with recent activity
  stalledRate:    number; // % stalled
}

export function buildRegionalPerformance(
  students: Student[],
  schools: School[],
): RegionalPerformanceRow[] {
  const regionBySchool = new Map<string, string>();
  for (const school of schools) regionBySchool.set(school.id, school.region);

  const buckets = new Map<string, Student[]>();
  for (const student of students) {
    const region = regionBySchool.get(student.schoolId ?? '') ?? 'Unknown';
    if (!buckets.has(region)) buckets.set(region, []);
    buckets.get(region)!.push(student);
  }

  return Array.from(buckets.entries())
    .map(([region, members]) => {
      const count = members.length;
      const engaged = members.filter(
        s => s.interviewed || (daysSinceLastActivity(s) ?? Infinity) <= STALL_DAYS,
      ).length;
      return {
        region,
        count,
        completionRate: pct(members.filter(isComplete).length, count),
        engagementRate: pct(engaged, count),
        stalledRate:    pct(members.filter(isStalled).length, count),
      };
    })
    .sort((a, b) => b.count - a.count);
}
