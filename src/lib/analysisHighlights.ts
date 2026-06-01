/**
 * At-a-glance "highlight" chips that accompany a generated EMCI analysis
 * (e.g. Career Interest · Firefighter, Strength · Music, Current Work · KFC).
 *
 * The analyze-student edge function returns these alongside the prose. Each
 * highlight carries an `icon` key from a fixed allowlist so the UI can render
 * a minimal, instantly recognisable icon without generating images at runtime.
 *
 * The allowlist below MUST stay in sync with HIGHLIGHT_ICONS in
 * supabase/functions/analyze-student/index.ts and with ICON_MAP in
 * src/components/AnalysisHighlights.tsx.
 */

export const HIGHLIGHT_ICON_KEYS = [
  'briefcase', 'graduation-cap', 'target', 'compass', 'sparkles', 'star',
  'music', 'palette', 'camera', 'pen-tool', 'mic', 'gamepad',
  'dumbbell', 'trophy', 'utensils', 'chef-hat', 'coffee', 'shopping-bag',
  'flame', 'stethoscope', 'heart-pulse', 'laptop', 'code', 'cpu',
  'hammer', 'wrench', 'hard-hat', 'paw-print', 'flask', 'microscope',
  'leaf', 'sprout', 'car', 'truck', 'plane', 'banknote', 'calculator',
  'scale', 'scissors', 'book-open', 'baby', 'newspaper',
] as const;

export type HighlightIconKey = typeof HIGHLIGHT_ICON_KEYS[number];

export interface AnalysisHighlight {
  label: string;
  value: string;
  icon:  HighlightIconKey;
}

export interface ParsedAnalysis {
  text:       string;
  highlights: AnalysisHighlight[];
}

const ICON_KEY_SET = new Set<string>(HIGHLIGHT_ICON_KEYS);

function isValidHighlight(value: unknown): value is AnalysisHighlight {
  if (!value || typeof value !== 'object') return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.label === 'string' &&
    typeof h.value === 'string' &&
    typeof h.icon === 'string' &&
    ICON_KEY_SET.has(h.icon)
  );
}

export function sanitizeHighlights(input: unknown): AnalysisHighlight[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isValidHighlight).slice(0, 3);
}

/**
 * Serialises prose + highlights into the single text blob persisted (encrypted)
 * in `student_analysis.analysis`.
 */
export function serializeAnalysis(
  text:       string,
  highlights: AnalysisHighlight[],
): string {
  return JSON.stringify({ v: 2, text, highlights });
}

/**
 * Parses the stored analysis blob. Falls back gracefully to treating the raw
 * value as plain prose (legacy records had no highlights / JSON wrapper).
 */
export function parseStoredAnalysis(raw: string): ParsedAnalysis {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
      return {
        text:       parsed.text,
        highlights: sanitizeHighlights(parsed.highlights),
      };
    }
  } catch {
    // Not JSON — legacy plain-prose record.
  }
  return { text: raw, highlights: [] };
}
