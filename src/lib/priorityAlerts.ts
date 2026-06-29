/**
 * Priority alert detection (P6-T3): No Career Plan, Disengaged, Stalled.
 *
 * Reuses {@link computeWatchouts} so deterministic and AI-derived signals stay
 * aligned with the student journey watch-out strip.
 */

import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import type { StudentRating } from './studentRating';
import { computeWatchouts, isPriorityWatchout, type Watchout } from './studentWatchouts';

function isEligibleForPriorityAlerts(student: Student): boolean {
  return student.status !== 'Inactive' && student.currentStage !== 'complete';
}

/** Priority watch-outs for one student (empty when inactive or complete). */
export function getPriorityWatchouts(
  student: Student,
  events: TimelineEvent[],
  rating: StudentRating | null = null,
): Watchout[] {
  if (!isEligibleForPriorityAlerts(student)) return [];
  return computeWatchouts(student, events, rating).filter(isPriorityWatchout);
}

export function hasPriorityAlert(
  student: Student,
  events: TimelineEvent[],
  rating: StudentRating | null = null,
): boolean {
  return getPriorityWatchouts(student, events, rating).length > 0;
}

import type { RatingFlag } from './studentRating';

function ratingStub(flags: RatingFlag[]): StudentRating | null {
  if (flags.length === 0) return null;
  return {
    overall: 0,
    band: 'monitoring',
    categories: [],
    flags,
    confidence: 'high',
  };
}

/** Priority alert check using bulk-loaded AI flags (roster / dashboard). */
export function hasPriorityAlertWithFlags(
  student: Student,
  events: TimelineEvent[],
  flags: RatingFlag[] | undefined,
): boolean {
  return hasPriorityAlert(student, events, ratingStub(flags ?? []));
}

export function countPriorityAlerts(
  students: Student[],
  eventsMap: Record<string, TimelineEvent[]>,
  flagsMap?: ReadonlyMap<string, RatingFlag[]>,
): number {
  return students.filter(s =>
    hasPriorityAlertWithFlags(s, eventsMap[s.id] ?? [], flagsMap?.get(s.id)),
  ).length;
}
