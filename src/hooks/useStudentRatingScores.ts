import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import type { RatingFlag } from '../lib/studentRating';

interface RatingScoreRow {
  student_id: string;
  overall:    number;
  flags?:     unknown;
}

const ALLOWED_FLAGS: ReadonlySet<string> = new Set([
  'sentiment_concern',
  'attendance_risk',
  'disengaged',
  'stalled',
  'no_career_plan',
  'thriving',
]);

function parseFlags(raw: unknown): RatingFlag[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is RatingFlag => typeof f === 'string' && ALLOWED_FLAGS.has(f));
}

interface BulkRatingData {
  scores: Map<string, number>;
  flags:  Map<string, RatingFlag[]>;
}

async function fetchRatingScores(ids: string[]): Promise<BulkRatingData> {
  const scores = new Map<string, number>();
  const flags  = new Map<string, RatingFlag[]>();
  if (ids.length === 0) return { scores, flags };

  const { data, error } = await supabase.rpc('list_student_rating_scores', {
    p_student_ids: ids,
  });
  if (error) throw error;

  if (Array.isArray(data)) {
    for (const row of data as RatingScoreRow[]) {
      if (!row.student_id) continue;
      if (typeof row.overall === 'number') {
        scores.set(row.student_id, row.overall);
      }
      const parsedFlags = parseFlags(row.flags);
      if (parsedFlags.length > 0) {
        flags.set(row.student_id, parsedFlags);
      }
    }
  }
  return { scores, flags };
}

/**
 * Bulk-loads cached tracking scores for a roster of students from Supabase
 * (student_analysis.rating, keyed by student_id).
 */
export function useStudentRatingScores(studentIds: string[]) {
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [ratingFlags, setRatingFlags] = useState<Map<string, RatingFlag[]>>(new Map());
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(
    () => [...new Set(studentIds)].sort().join(','),
    [studentIds],
  );

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setScores(new Map());
      setRatingFlags(new Map());
      return;
    }

    setLoading(true);
    try {
      const { scores: nextScores, flags: nextFlags } = await fetchRatingScores(ids);
      if (!signal?.cancelled) {
        setScores(nextScores);
        setRatingFlags(nextFlags);
      }
    } catch {
      if (!signal?.cancelled) {
        setScores(new Map());
        setRatingFlags(new Map());
      }
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [idsKey]);

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => { signal.cancelled = true; };
  }, [load]);

  // Refresh when the tab regains focus (e.g. after scoring on the journey page).
  useEffect(() => {
    const onFocus = () => { load(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  return { scores, ratingFlags, loading, refetch: load };
}
