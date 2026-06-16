import type { StudentRating } from './studentRating';

/**
 * Serialises a finalised tracking rating into the encrypted blob stored in
 * `student_analysis.rating` (keyed by student_id), alongside analysis and
 * sentiment on the same row.
 */
export function serializeRating(rating: StudentRating): string {
  return JSON.stringify({ v: 1, ...rating });
}

/** Maps legacy wellbeing keys/flags from pre-sentiment rename blobs. */
function migrateStoredRating(rating: StudentRating): StudentRating {
  return {
    ...rating,
    categories: rating.categories.map(c => {
      if ((c.key as string) === 'growth_wellbeing') {
        return { ...c, key: 'growth_sentiment', label: 'Growth & sentiment' };
      }
      return c;
    }),
    flags: rating.flags.map(f => {
      if ((f as string) === 'wellbeing_concern') return 'sentiment_concern';
      return f;
    }),
  };
}

/**
 * Parses the decrypted rating blob from the database.
 */
export function parseStoredRating(raw: string): StudentRating | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.overall !== 'number') return null;
    if (typeof parsed.band !== 'string') return null;
    if (!Array.isArray(parsed.categories)) return null;
    return migrateStoredRating(parsed as unknown as StudentRating);
  } catch {
    return null;
  }
}

/** Legacy browser cache prefix (pre-DB persistence). */
export const LEGACY_RATING_CACHE_PREFIX = 'emci-rating:v8:';

interface LegacyCachedRating {
  fingerprint: string;
  rating:      StudentRating;
}

/**
 * Reads a score from the old localStorage cache (if present).
 * Used once to migrate into Supabase when the DB row is missing.
 */
export function readLegacyRatingCache(
  studentId: string,
  fingerprint: string,
): StudentRating | null {
  try {
    const raw = localStorage.getItem(LEGACY_RATING_CACHE_PREFIX + studentId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyCachedRating;
    if (parsed.fingerprint !== fingerprint) return null;
    if (typeof parsed.rating?.overall !== 'number') return null;
    return migrateStoredRating(parsed.rating);
  } catch {
    return null;
  }
}

export function clearLegacyRatingCache(studentId: string): void {
  try {
    localStorage.removeItem(LEGACY_RATING_CACHE_PREFIX + studentId);
  } catch {
    // best-effort
  }
}
