import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import {
  computeQuickInsights,
  buildSurveyShifts,
  buildSessionDetails,
  buildTimelineNotes,
  buildAnalysisSourceFingerprint,
  ANALYSIS_MIN_STAGE_PROGRESS,
} from '../lib/studentInsights';
import {
  parseStoredSentiment,
  serializeSentiment,
  type SentimentQuote,
  type SentimentValue,
} from '../lib/studentSentimentStorage';

export type { SentimentQuote, SentimentValue };

export type SentimentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; sentiment: SentimentValue; summary: string; quotes: SentimentQuote[]; sourceHash: string | null }
  | { status: 'error'; message: string };

export type SentimentDisplayState =
  | 'too_early'
  | 'ready'
  | 'loading'
  | 'current'
  | 'stale'
  | 'error';

interface StoredSentimentRecord {
  sentiment?:   string;
  source_hash?: string | null;
}

function sanitizeQuotes(input: unknown): SentimentQuote[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((q): q is SentimentQuote => (
      q !== null &&
      typeof q === 'object' &&
      typeof (q as Record<string, unknown>).text      === 'string' &&
      typeof (q as Record<string, unknown>).context   === 'string' &&
      typeof (q as Record<string, unknown>).sentiment === 'string' &&
      ['positive', 'negative', 'neutral'].includes((q as Record<string, unknown>).sentiment as string)
    ))
    .slice(0, 4);
}

export function deriveSentimentDisplayState(
  stageProgress: number,
  state:         SentimentState,
  sourceHash:    string,
): SentimentDisplayState {
  if (state.status === 'loading') return 'loading';
  if (state.status === 'error')   return 'error';

  if (stageProgress < ANALYSIS_MIN_STAGE_PROGRESS) return 'too_early';

  if (state.status === 'idle') return 'ready';

  if (state.status === 'success') {
    if (state.sourceHash && state.sourceHash !== sourceHash) return 'stale';
    return 'current';
  }

  return 'ready';
}

export function useStudentSentiment(
  student:    Student | null,
  events:     TimelineEvent[],
  schoolName?: string,
) {
  const [state, setState] = useState<SentimentState>({ status: 'idle' });
  const [dbChecked, setDbChecked] = useState(false);
  const autoTriggeredRef = useRef<string | null>(null);

  const sourceHash = useMemo(
    () => (student ? buildAnalysisSourceFingerprint(student, events) : ''),
    [student, events],
  );

  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    setDbChecked(false);

    supabase
      .rpc('get_student_sentiment_record', { p_student_id: student.id })
      .then(({ data }) => {
        if (cancelled) return;
        setDbChecked(true);
        if (!data) return;

        const record = data as StoredSentimentRecord;
        if (!record.sentiment) return;

        const parsed = parseStoredSentiment(record.sentiment);
        if (!parsed) return;

        setState({
          status:     'success',
          sentiment:  parsed.sentiment,
          summary:    parsed.summary,
          quotes:     parsed.quotes,
          sourceHash: record.source_hash ?? null,
        });
      });

    return () => { cancelled = true; };
  }, [student?.id]);

  const generate = useCallback(async () => {
    if (!student) return;
    if (student.stageProgress < ANALYSIS_MIN_STAGE_PROGRESS) return;

    setState({ status: 'loading' });

    const insights       = computeQuickInsights(student, events);
    const surveyShifts   = buildSurveyShifts(events);
    const sessionDetails = buildSessionDetails(events);
    const timelineNotes  = buildTimelineNotes(student, events);
    const fingerprint    = buildAnalysisSourceFingerprint(student, events);

    const { data, error } = await supabase.functions.invoke('sentiment-student', {
      body: {
        student: {
          stage:          student.currentStage,
          stageProgress:  student.stageProgress,
          status:         student.status,
          absenceCount:   student.absenceCount,
          interviewed:    student.interviewed,
          hasProfile:     student.hasProfile,
          studentType:    student.studentType,
          yearLevel:      student.yearLevel,
          yearLevelLabel: student.yearLevelLabel,
        },
        schoolName:    schoolName ?? null,
        insights,
        surveyShifts,
        sessionDetails,
        timelineNotes,
      },
    });

    if (error) {
      setState({ status: 'error', message: error.message ?? 'Failed to generate sentiment analysis.' });
      return;
    }

    const payload   = data as { sentiment?: string; summary?: string; quotes?: unknown };
    const sentiment = payload?.sentiment as SentimentValue | undefined;

    if (!sentiment) {
      setState({ status: 'error', message: 'No sentiment data returned from service.' });
      return;
    }

    const summary = typeof payload.summary === 'string' ? payload.summary : '';
    const quotes  = sanitizeQuotes(payload.quotes);

    setState({
      status:     'success',
      sentiment,
      summary,
      quotes,
      sourceHash: fingerprint,
    });

    await supabase.rpc('upsert_student_sentiment', {
      p_student_id:  student.id,
      p_school_id:   student.schoolId ?? null,
      p_sentiment:   serializeSentiment({ sentiment, summary, quotes }),
      p_source_hash: fingerprint,
    });
  }, [student, events, schoolName]);

  const displayState = useMemo(
    () => deriveSentimentDisplayState(student?.stageProgress ?? 0, state, sourceHash),
    [student?.stageProgress, state, sourceHash],
  );

  useEffect(() => {
    if (!student) return;
    if (!dbChecked) return;
    if (displayState !== 'ready' && displayState !== 'stale') return;
    if (autoTriggeredRef.current === student.id) return;
    autoTriggeredRef.current = student.id;
    generate();
  }, [student, dbChecked, displayState, generate]);

  return { state, displayState, generate, sourceHash };
}
