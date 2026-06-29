/**
 * Computes a student's tracking rating via the `rate-student` edge function and
 * finalises it deterministically in code. Results are persisted encrypted in
 * Supabase (student_analysis.rating, alongside analysis and sentiment) and
 * restored on load when the source fingerprint still matches.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { supabase } from '../services/supabase';
import { buildAnalysisSourceFingerprint, ANALYSIS_MIN_STAGE_PROGRESS } from '../lib/studentInsights';
import { isInactiveStudent } from '../lib/inactiveStudentCopy';
import {
  buildRatingPacket,
  finaliseRating,
  isScoreEligible,
  type AiRating,
  type StudentRating,
} from '../lib/studentRating';
import {
  clearLegacyRatingCache,
  parseStoredRating,
  readLegacyRatingCache,
  serializeRating,
} from '../lib/studentRatingStorage';

export type RatingState =
  | { status: 'idle' }
  | { status: 'ineligible' }
  | { status: 'loading' }
  | { status: 'success'; rating: StudentRating; sourceHash: string | null }
  | { status: 'error'; message: string };

export interface UseStudentRating {
  state:    RatingState;
  generate: () => void;
}

interface StoredRatingRecord {
  rating?:       string;
  source_hash?:  string | null;
}

async function persistRatingToDb(
  student:     Student,
  rating:      StudentRating,
  fingerprint: string,
): Promise<void> {
  const { error } = await supabase.rpc('upsert_student_rating', {
    p_student_id:  student.id,
    p_school_id:   student.schoolId ?? null,
    p_rating:      serializeRating(rating),
    p_source_hash: fingerprint,
  });
  if (error) throw new Error(error.message ?? 'Failed to save tracking score');
}

export function useStudentRating(
  student: Student | null,
  events:  TimelineEvent[],
): UseStudentRating {
  const [state, setState] = useState<RatingState>({ status: 'idle' });
  const [dbChecked, setDbChecked] = useState(false);
  const cancelledRef = useRef(false);
  const autoTriggeredRef = useRef<string | null>(null);
  const migrateTriggeredRef = useRef<string | null>(null);

  const fingerprint = student ? buildAnalysisSourceFingerprint(student, events) : null;
  const scoreEligible = student ? isScoreEligible(events, student) : false;

  useEffect(() => {
    if (!student || !fingerprint) {
      setState({ status: 'idle' });
      setDbChecked(false);
      return;
    }
    if (!scoreEligible) {
      setState({ status: 'ineligible' });
      setDbChecked(true);
      return;
    }
    let cancelled = false;
    setDbChecked(false);

    (async () => {
      const { data, error } = await supabase.rpc('get_student_rating_record', {
        p_student_id: student.id,
      });
      if (cancelled) return;
      setDbChecked(true);

      if (error) return;

      if (data) {
        const record = data as StoredRatingRecord;
        if (record.rating) {
          const parsed = parseStoredRating(record.rating);
          if (parsed) {
            setState({
              status:     'success',
              rating:     parsed,
              sourceHash: record.source_hash ?? null,
            });
            return;
          }
        }
      }

      // One-time migration from legacy localStorage cache into Supabase.
      const legacy = readLegacyRatingCache(student.id, fingerprint);
      if (!legacy) return;
      const migrateKey = `${student.id}:${fingerprint}`;
      if (migrateTriggeredRef.current === migrateKey) return;
      migrateTriggeredRef.current = migrateKey;

      try {
        await persistRatingToDb(student, legacy, fingerprint);
        clearLegacyRatingCache(student.id);
        if (!cancelled) {
          setState({ status: 'success', rating: legacy, sourceHash: fingerprint });
        }
      } catch {
        // Keep legacy cache; user can regenerate manually.
      }
    })();

    return () => { cancelled = true; };
  }, [student, fingerprint, scoreEligible]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const generate = useCallback(() => {
    if (!student || !fingerprint) return;
    if (isInactiveStudent(student)) return;
    if (!isScoreEligible(events, student)) return;
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

        const rating = finaliseRating(aiRating);
        await persistRatingToDb(student, rating, fingerprint);
        clearLegacyRatingCache(student.id);

        if (cancelledRef.current) return;
        setState({ status: 'success', rating, sourceHash: fingerprint });
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to rate student';
        setState({ status: 'error', message });
      }
    })();
  }, [student, events, fingerprint]);

  useEffect(() => {
    if (!student || !fingerprint || !dbChecked) return;
    if (isInactiveStudent(student)) return;
    if (!scoreEligible) return;
    if (student.stageProgress < ANALYSIS_MIN_STAGE_PROGRESS) return;
    if (state.status === 'success' && state.sourceHash === fingerprint) return;
    const key = `${student.id}:${fingerprint}`;
    if (autoTriggeredRef.current === key) return;
    autoTriggeredRef.current = key;
    generate();
  }, [student, fingerprint, dbChecked, state, generate, scoreEligible]);

  return { state, generate };
}
