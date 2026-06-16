import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

interface RatingScoreRow {
  student_id: string;
  overall:    number;
}

async function fetchRatingScores(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase.rpc('list_student_rating_scores', {
    p_student_ids: ids,
  });
  if (error) throw error;

  if (Array.isArray(data)) {
    for (const row of data as RatingScoreRow[]) {
      if (row.student_id && typeof row.overall === 'number') {
        map.set(row.student_id, row.overall);
      }
    }
  }
  return map;
}

/**
 * Bulk-loads cached tracking scores for a roster of students from Supabase
 * (student_analysis.rating, keyed by student_id).
 */
export function useStudentRatingScores(studentIds: string[]) {
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(
    () => [...new Set(studentIds)].sort().join(','),
    [studentIds],
  );

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setScores(new Map());
      return;
    }

    setLoading(true);
    try {
      const map = await fetchRatingScores(ids);
      if (!signal?.cancelled) setScores(map);
    } catch {
      if (!signal?.cancelled) setScores(new Map());
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

  return { scores, loading, refetch: load };
}
