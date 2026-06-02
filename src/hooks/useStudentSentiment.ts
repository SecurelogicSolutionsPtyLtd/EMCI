import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import {
  computeQuickInsights,
  buildSurveyShifts,
  buildSessionDetails,
  buildTimelineNotes,
  ANALYSIS_MIN_STAGE_PROGRESS,
} from '../lib/studentInsights';

export type SentimentValue = 'positive' | 'negative' | 'mixed' | 'insufficient_data';

export interface SentimentQuote {
  text:      string;
  context:   string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export type SentimentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; sentiment: SentimentValue; summary: string; quotes: SentimentQuote[] }
  | { status: 'error'; message: string };

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

export function useStudentSentiment(
  student:    Student | null,
  events:     TimelineEvent[],
  schoolName?: string,
) {
  const [state, setState] = useState<SentimentState>({ status: 'idle' });

  const generate = useCallback(async () => {
    if (!student) return;
    if (student.stageProgress < ANALYSIS_MIN_STAGE_PROGRESS) return;

    setState({ status: 'loading' });

    const insights       = computeQuickInsights(student, events);
    const surveyShifts   = buildSurveyShifts(events);
    const sessionDetails = buildSessionDetails(events);
    const timelineNotes  = buildTimelineNotes(student, events);

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

    setState({
      status:    'success',
      sentiment,
      summary:   typeof payload.summary === 'string' ? payload.summary : '',
      quotes:    sanitizeQuotes(payload.quotes),
    });
  }, [student, events, schoolName]);

  useEffect(() => {
    if (!student) return;
    if (student.stageProgress < ANALYSIS_MIN_STAGE_PROGRESS) return;
    generate();
  // Run once per student — generate is intentionally excluded so a student
  // switch triggers a fresh call without reacting to every event list update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  return { state, generate };
}
