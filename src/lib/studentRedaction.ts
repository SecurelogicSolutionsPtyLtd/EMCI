import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import type { SurveyField } from '../services/surveyFields';
import type { AppRole } from '../types/roles';
import { canSeeStudentNames } from '../types/roles';

export const REDACTED_TOKEN = '[Redacted]';
export const DE_STAFF_LABEL = 'EMCI Staff';

const FUZZY_MIN_TOKEN_LEN = 4;
const FUZZY_MAX_DISTANCE = 1;

const COMMON_WORD_ALLOWLIST = new Set([
  'about', 'after', 'again', 'being', 'could', 'every', 'first', 'found',
  'great', 'group', 'guidance', 'having', 'other', 'program', 'programme',
  'school', 'session', 'student', 'their', 'there', 'these', 'those',
  'through', 'under', 'where', 'which', 'while', 'would', 'career', 'consent',
  'referral', 'active', 'completed', 'notes', 'emci', 'morrisby', 'follow',
  'initial', 'parental', 'obtained', 'received', 'support', 'external',
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const row = Array.from({ length: bl + 1 }, (_, i) => i);
  for (let i = 1; i <= al; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= bl; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[bl];
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function addLiteral(literals: Set<string>, value: string | undefined | null): void {
  if (!value?.trim()) return;
  literals.add(value.trim());
}

/** Non-identifying label for roster, breadcrumbs, and profile header. */
export function studentPseudonym(studentId: string): string {
  const suffix = studentId.replace(/-/g, '').slice(-6).toUpperCase();
  return `Student · ${suffix}`;
}

export function buildRedactionLiterals(student: Student): string[] {
  const literals = new Set<string>();

  addLiteral(literals, student.firstName);
  addLiteral(literals, student.lastName);
  addLiteral(literals, student.preferredName);
  addLiteral(literals, student.studentName);
  addLiteral(literals, student.email);
  addLiteral(literals, student.morrisbyId);
  addLiteral(literals, student.yearLevelLabel);
  addLiteral(literals, student.studentDeactivationYearGroupSnapshot);
  addLiteral(literals, student.counsellor);

  const first = student.firstName?.trim() ?? '';
  const last = student.lastName?.trim() ?? '';
  if (first && last) {
    addLiteral(literals, `${first} ${last}`);
    addLiteral(literals, `${last}, ${first}`);
    addLiteral(literals, `${last} ${first}`);
    if (first.length >= 1 && last.length >= 1) {
      addLiteral(literals, `${first[0]}${last[0]}`);
      addLiteral(literals, `${first[0]}. ${last}`);
    }
  }

  return Array.from(literals).filter(s => s.length >= 2).sort((a, b) => b.length - a.length);
}

/** Name tokens used for fuzzy typo matching (tier B). */
export function buildFuzzyNameTokens(student: Student): string[] {
  const tokens = new Set<string>();
  const fields = [
    student.firstName,
    student.lastName,
    student.preferredName,
    student.studentName,
  ];
  for (const field of fields) {
    if (!field?.trim()) continue;
    for (const part of field.trim().split(/\s+/)) {
      const lower = part.toLowerCase();
      if (lower.length >= FUZZY_MIN_TOKEN_LEN && !COMMON_WORD_ALLOWLIST.has(lower)) {
        tokens.add(lower);
      }
    }
  }
  return Array.from(tokens);
}

function applyLiteralRedaction(text: string, literals: string[]): string {
  let out = text;
  for (const literal of literals) {
    const escaped = escapeRegExp(literal);
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    out = out.replace(re, REDACTED_TOKEN);
    const loose = new RegExp(escaped, 'gi');
    if (literal.length >= 5) {
      out = out.replace(loose, REDACTED_TOKEN);
    }
  }
  return out;
}

function applyFuzzyRedaction(text: string, nameTokens: string[]): string {
  if (nameTokens.length === 0) return text;

  return text.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
    const lower = word.toLowerCase();
    if (lower.length < FUZZY_MIN_TOKEN_LEN || COMMON_WORD_ALLOWLIST.has(lower)) {
      return word;
    }
    if (word.includes(REDACTED_TOKEN)) return word;
    for (const token of nameTokens) {
      if (levenshtein(lower, token) <= FUZZY_MAX_DISTANCE) {
        return REDACTED_TOKEN;
      }
    }
    return word;
  });
}

export function redactText(
  text: string | undefined | null,
  literals: string[],
  nameTokens: string[],
): string {
  if (!text?.trim()) return text ?? '';
  const plain = stripHtml(text);
  let out = applyLiteralRedaction(plain, literals);
  out = applyFuzzyRedaction(out, nameTokens);
  return out.replace(/\s+/g, ' ').trim();
}

function redactSurveyFields(
  fields: SurveyField[] | undefined,
  literals: string[],
  nameTokens: string[],
): SurveyField[] | undefined {
  if (!fields?.length) return fields;
  return fields.map(f => ({
    label: f.label,
    value: redactText(f.value, literals, nameTokens),
  }));
}

export function toRedactedStudentView(student: Student | null): Student | null {
  if (!student) return null;
  const suffix = student.id.replace(/-/g, '').slice(-6).toUpperCase();
  return {
    ...student,
    firstName: 'Student',
    lastName: suffix,
    preferredName: undefined,
    studentName: undefined,
    email: undefined,
    yearLevel: 0,
    yearLevelLabel: undefined,
    morrisbyId: '—',
    counsellor: '—',
    avatar: undefined,
    studentDeactivationYearGroupSnapshot: undefined,
  };
}

export function redactTimelineEvents(
  events: TimelineEvent[],
  student: Student | null,
  role: AppRole,
): TimelineEvent[] {
  if (!student || canSeeStudentNames(role)) return events;

  const literals = buildRedactionLiterals(student);
  const nameTokens = buildFuzzyNameTokens(student);

  return events.map(ev => ({
    ...ev,
    title: redactText(ev.title, literals, nameTokens),
    description: redactText(ev.description, literals, nameTokens),
    notes: redactText(ev.notes, literals, nameTokens),
    by: DE_STAFF_LABEL,
    sessionLength: ev.sessionLength,
    interventionType: ev.interventionType,
    surveyFields: redactSurveyFields(ev.surveyFields, literals, nameTokens),
    ...((() => {
      const linked = (ev as TimelineEvent & { linkedInterventions?: string[] }).linkedInterventions;
      return linked?.length
        ? { linkedInterventions: linked.map(i => redactText(i, literals, nameTokens)) }
        : {};
    })()),
    ...((() => {
      const actions = (ev as TimelineEvent & { recommendedActions?: string[] }).recommendedActions;
      return actions?.length
        ? { recommendedActions: actions.map(a => redactText(a, literals, nameTokens)) }
        : {};
    })()),
  }));
}

/** Generic overview prose for DE (no name or year cohort). */
export function buildRedactedOverview(student: Student | null): string {
  if (!student) return '—';
  const stageMap: Record<string, string> = {
    referral:        'has recently been referred into the programme',
    consent:         'has completed the referral and is awaiting consent',
    career_guidance: 'is actively engaged in career guidance sessions',
    complete:        'has completed the full EMCI programme',
  };
  const stageStr = student.currentStage
    ? stageMap[student.currentStage] ?? 'is progressing through the programme'
    : 'has not yet started the programme';
  const suffix = student.interviewed
    ? ' An interview has been conducted.'
    : ' An interview has not yet been conducted.';
  return `This student ${stageStr}.${suffix}`;
}
