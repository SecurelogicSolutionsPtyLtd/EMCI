/**
 * Smart sensitive-information redaction — tier 2 (AI deep scan).
 *
 * Sends event texts to the `redact-sensitive` Supabase Edge Function, which
 * returns verbatim sensitive spans the deterministic patterns may have
 * missed. Results are cached per text for the session, so each unique text
 * is only ever scanned once.
 *
 * Fail-safe: if the AI call errors, events stay tier-1 (pattern) redacted —
 * the UI never blocks on the AI pass.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import type { TimelineEvent } from '../services/dataverse';
import {
  applyAiSpansToEvents,
  collectEventTexts,
  SENSITIVE_TOKEN,
} from './smartRedaction';

const MIN_TEXT_LENGTH = 20;
const MAX_BATCH_SIZE = 80;
const MAX_TEXT_CHARS = 4000;

/** text → sensitive spans found by the AI (empty array = scanned, clean). */
const spanCache = new Map<string, string[]>();
const inFlight = new Set<string>();

interface RedactFinding {
  index: number;
  spans: string[];
}

function sanitizeFindings(data: unknown, batch: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const findings = (data as { results?: RedactFinding[] })?.results;
  if (!Array.isArray(findings)) return result;
  for (const f of findings) {
    if (typeof f?.index !== 'number' || !Array.isArray(f.spans)) continue;
    const text = batch[f.index];
    if (text === undefined) continue;
    result.set(text, f.spans.filter((s): s is string => typeof s === 'string'));
  }
  return result;
}

/**
 * Returns the given events with AI-detected sensitive spans redacted.
 * Events render immediately (already tier-1 redacted upstream) and update
 * in place once the AI scan resolves.
 */
export function useAiRedactedEvents(events: TimelineEvent[]): TimelineEvent[] {
  const [scanVersion, setScanVersion] = useState(0);

  useEffect(() => {
    const candidates = collectEventTexts(events).filter(t =>
      t.length >= MIN_TEXT_LENGTH &&
      t !== SENSITIVE_TOKEN &&
      !spanCache.has(t) &&
      !inFlight.has(t),
    );
    if (candidates.length === 0) return;

    const batch = candidates.slice(0, MAX_BATCH_SIZE);
    batch.forEach(t => inFlight.add(t));
    let cancelled = false;

    supabase.functions
      .invoke('redact-sensitive', {
        body: { texts: batch.map(t => t.slice(0, MAX_TEXT_CHARS)) },
      })
      .then(({ data, error }) => {
        const findings = error ? new Map<string, string[]>() : sanitizeFindings(data, batch);
        // Cache every batched text (empty = clean / failed-open to tier 1)
        // so we never re-scan or hammer the function in a loop.
        for (const text of batch) {
          spanCache.set(text, findings.get(text) ?? []);
          inFlight.delete(text);
        }
        if (!cancelled) setScanVersion(v => v + 1);
      });

    return () => { cancelled = true; };
  }, [events]);

  return useMemo(
    () => applyAiSpansToEvents(events, t => spanCache.get(t)),
    // scanVersion invalidates the memo when new AI results land.
    [events, scanVersion],
  );
}
