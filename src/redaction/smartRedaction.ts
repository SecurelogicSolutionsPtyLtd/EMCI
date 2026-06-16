/**
 * Smart sensitive-information redaction — tier 1 (deterministic).
 *
 * Redacts sensitive student information (medications, health conditions,
 * disabilities, family/parent details, contact info, welfare matters) from
 * timeline content BEFORE it reaches any UI or AI prompt.
 *
 * - Identifier tokens (emails, phones, addresses, ID numbers) are replaced
 *   in place.
 * - Sentences containing a sensitive category match are replaced whole, so
 *   no surrounding context leaks.
 *
 * Tier 2 (AI deep scan) lives in useAiRedaction.ts and applies on top.
 */

import type { TimelineEvent } from '../services/dataverse';
import {
  ALLOWLIST_PHRASES,
  SENSITIVE_CATEGORIES,
  TOKEN_PATTERNS,
} from './sensitivePatterns';

export const SENSITIVE_TOKEN = '[Redacted — sensitive]';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSensitiveSentence(sentence: string): boolean {
  let probe = sentence;
  for (const allow of ALLOWLIST_PHRASES) {
    probe = probe.replace(allow, ' ');
  }
  return SENSITIVE_CATEGORIES.some(category =>
    category.patterns.some(pattern => pattern.test(probe)),
  );
}

/** Redact sensitive identifiers and sentences from a single text value. */
export function redactSensitiveText(text: string | undefined | null): string {
  if (!text?.trim()) return text ?? '';

  let out = text;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, SENSITIVE_TOKEN);
  }

  // Split keeping separators (odd indices) so structure is preserved.
  const parts = out.split(/((?<=[.!?])\s+|\n+|;\s+)/);
  const redacted = parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return isSensitiveSentence(part) ? SENSITIVE_TOKEN : part;
    })
    .join('');

  // Collapse runs of adjacent redaction tokens into one.
  const tokenRun = new RegExp(
    `${escapeRegExp(SENSITIVE_TOKEN)}(?:[\\s;.,]*${escapeRegExp(SENSITIVE_TOKEN)})+`,
    'g',
  );
  return redacted.replace(tokenRun, SENSITIVE_TOKEN);
}

/** Apply AI-detected sensitive spans (tier 2) to a text value. */
export function applyAiSpans(text: string, spans: string[]): string {
  let out = text;
  for (const span of spans) {
    if (span.trim().length < 2) continue;
    out = out.replace(new RegExp(escapeRegExp(span), 'gi'), SENSITIVE_TOKEN);
  }
  return out;
}

type TextTransform = (text: string) => string;

function transformEvent(ev: TimelineEvent, fn: TextTransform): TimelineEvent {
  return {
    ...ev,
    title: fn(ev.title),
    description: fn(ev.description),
    notes: fn(ev.notes),
    sessionSatisfaction: ev.sessionSatisfaction ? fn(ev.sessionSatisfaction) : ev.sessionSatisfaction,
    sessionUseful: ev.sessionUseful ? fn(ev.sessionUseful) : ev.sessionUseful,
    surveyFields: ev.surveyFields?.map(f => ({ label: f.label, value: fn(f.value) })),
  };
}

/** Tier-1 redaction over a list of timeline events. */
export function redactSensitiveEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.map(ev => transformEvent(ev, t => redactSensitiveText(t)));
}

/** Tier-1 redaction over the whole student→events map (the data choke point). */
export function redactSensitiveEventsMap(
  map: Record<string, TimelineEvent[]>,
): Record<string, TimelineEvent[]> {
  const out: Record<string, TimelineEvent[]> = {};
  for (const [studentId, events] of Object.entries(map)) {
    out[studentId] = redactSensitiveEvents(events);
  }
  return out;
}

/** Every text value in an event that the redaction system covers. */
export function collectEventTexts(events: TimelineEvent[]): string[] {
  const texts = new Set<string>();
  for (const ev of events) {
    for (const value of [
      ev.title,
      ev.description,
      ev.notes,
      ev.sessionSatisfaction,
      ev.sessionUseful,
      ...(ev.surveyFields?.map(f => f.value) ?? []),
    ]) {
      if (value?.trim()) texts.add(value);
    }
  }
  return Array.from(texts);
}

/** Apply tier-2 AI spans across events using a cache lookup. */
export function applyAiSpansToEvents(
  events: TimelineEvent[],
  lookup: (text: string) => string[] | undefined,
): TimelineEvent[] {
  return events.map(ev =>
    transformEvent(ev, text => {
      const spans = lookup(text);
      return spans?.length ? applyAiSpans(text, spans) : text;
    }),
  );
}
