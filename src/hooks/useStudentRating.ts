/**
 * Computes a student's tracking rating via the `rate-student` edge function and
 * finalises it deterministically in code. Results are cached in localStorage,
 * keyed by a source fingerprint, so the AI is only re-run when the underlying
 * student record actually changes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { supabase } from '../services/supabase';
import { buildAnalysisSourceFingerprint, ANALYSIS_MIN_STAGE_PROGRESS } from '../lib/studentInsights';
import {
  buildRatingPacket,
  finaliseRating,
  type AiRating,
  type StudentRating,
} from '../lib/studentRating';

export type RatingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; rating: StudentRating }
  | { status: 'error'; message: string };

export interface UseStudentRating {
  state:    RatingState;
  generate: () => void;
}

interface CachedRating {
  fingerprint: string;
  rating:      StudentRating;
}

// v8: added dedicated Work Readiness category; weights now 25/20/20/15/20.
const CACHE_PREFIX = 'emci-rating:v8:';

function readCache(studentId: string, fingerprint: string): StudentRating | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + studentId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRating;
    return parsed.fingerprint === fingerprint ? parsed.rating : null;
  } catch {
    return null;
  }
}

function writeCache(studentId: string, value: CachedRating): void {
  try {
    localStorage.setItem(CACHE_PREFIX + studentId, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable / full — caching is best-effort.
  }
}

/**
 * @param student  the student to rate, or null to disable (e.g. redacted view)
 * @param events   the student's derived timeline events
 *
 * Scoring is manually triggered via `generate()`. On mount (and whenever the
 * student record changes) any previously generated score for the current
 * fingerprint is restored from cache; otherwise the badge stays in its empty
 * state until the user asks for a score.
 */
export function useStudentRating(
  student: Student | null,
  events:  TimelineEvent[],
): UseStudentRating {
  const [state, setState] = useState<RatingState>({ status: 'idle' });
  const cancelledRef = useRef(false);
  const autoTriggeredRef = useRef<string | null>(null);

  const fingerprint = student ? buildAnalysisSourceFingerprint(student, events) : null;

  // Restore a cached score (or reset to empty) when the student/record changes.
  useEffect(() => {
    if (!student || !fingerprint) {
      setState({ status: 'idle' });
      return;
    }
    const cached = readCache(student.id, fingerprint);
    setState(cached ? { status: 'success', rating: cached } : { status: 'idle' });
  }, [student, fingerprint]);

  // Cancel any in-flight request on unmount.
  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const generate = useCallback(() => {
    if (!student || !fingerprint) return;
    setState({ status: 'loading' });

    (async () => {
      try {
        const packet = buildRatingPacket(student, events);
        const { data, error } = await supabase.functions.invoke('rate-student', {
          body: { packet },
        });
        if (cancelledRef.current) return;
        if (error) throw error;

        const aiRating = (data as { rating?: AiRating } | null)?.rating;
        if (!aiRating || !Array.isArray(aiRating.categories)) {
          throw new Error('No rating returned');
        }

        const rating = finaliseRating(aiRating, student);
        writeCache(student.id, { fingerprint, rating });
        setState({ status: 'success', rating });
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to rate student';
        setState({ status: 'error', message });
      }
    })();
  }, [student, events, fingerprint]);

  // Auto-generate on load for any student who has reached Career Guidance or
  // beyond (stageProgress >= 3) and has no cached score for their current
  // fingerprint. Runs once per student/fingerprint combination.
  useEffect(() => {
    if (!student || !fingerprint) return;
    if (student.stageProgress < ANALYSIS_MIN_STAGE_PROGRESS) return;
    if (readCache(student.id, fingerprint)) return;
    const key = `${student.id}:${fingerprint}`;
    if (autoTriggeredRef.current === key) return;
    autoTriggeredRef.current = key;
    generate();
  }, [student, fingerprint, generate]);

  return { state, generate };
}
