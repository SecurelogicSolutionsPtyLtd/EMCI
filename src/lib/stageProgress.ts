import type { StageKey } from '../data/studentsData';

/** Visible programme stages: Consent → Career Guidance → Complete (referral excluded). */
export const PROGRAMME_STAGE_TOTAL = 3;

/**
 * Maps raw Dataverse stageProgress (0–4, includes referral) to the visible
 * step (0–3). Referral-only progress (1) counts as 0.
 */
export function programmeProgressStep(stageProgress: number): number {
  return Math.max(0, Math.min(PROGRAMME_STAGE_TOTAL, stageProgress - 1));
}

export function programmeProgressPct(stageProgress: number): number {
  return Math.round((programmeProgressStep(stageProgress) / PROGRAMME_STAGE_TOTAL) * 100);
}

export function formatProgrammeProgressScore(stageProgress: number): string {
  return `${programmeProgressStep(stageProgress)}/${PROGRAMME_STAGE_TOTAL}`;
}

/** Programme stage label for AI prompts — never mentions referral. */
export function formatProgrammeStageLabel(stage: StageKey): string {
  switch (stage) {
    case 'career_guidance':
      return 'Career Guidance (Stage 2 of 3)';
    case 'complete':
      return 'Complete (Stage 3 of 3)';
    case 'consent':
    case 'referral':
      return 'Consent (Stage 1 of 3)';
    default:
      return 'Not yet started';
  }
}

export function ratingOverallColorClass(overall: number): string {
  if (overall >= 80) return 'text-emerald-600';
  if (overall >= 65) return 'text-sky-600';
  if (overall >= 45) return 'text-amber-600';
  return 'text-rose-600';
}
