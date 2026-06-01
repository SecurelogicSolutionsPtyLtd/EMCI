import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import {
  computeQuickInsights,
  buildSurveyShifts,
  buildSessionDetails,
  buildAnalysisSourceFingerprint,
  ANALYSIS_MIN_STAGE_PROGRESS,
  type QuickInsights,
} from '../lib/studentInsights';
import {
  parseStoredAnalysis,
  serializeAnalysis,
  sanitizeHighlights,
  type AnalysisHighlight,
} from '../lib/analysisHighlights';

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; analysis: string; highlights: AnalysisHighlight[]; sourceHash: string | null }
  | { status: 'error'; message: string };

export type AnalysisDisplayState =
  | 'too_early'
  | 'ready'
  | 'loading'
  | 'current'
  | 'stale'
  | 'error';

interface StoredAnalysisRecord {
  analysis:     string;
  source_hash?: string | null;
}

export function deriveAnalysisDisplayState(
  stageProgress: number,
  state:         AnalysisState,
  sourceHash:    string,
): AnalysisDisplayState {
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

export function useStudentAnalysis(
  student:    Student | null,
  events:     TimelineEvent[],
  schoolName?: string,
) {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });

  const sourceHash = useMemo(
    () => (student ? buildAnalysisSourceFingerprint(student, events) : ''),
    [student, events],
  );

  // Load any previously stored analysis for this student on mount / student change.
  useEffect(() => {
    if (!student) return;
    let cancelled = false;

    supabase
      .rpc('get_student_analysis_record', { p_student_id: student.id })
      .then(({ data }) => {
        if (cancelled || !data) return;
        const record = data as StoredAnalysisRecord;
        if (!record.analysis) return;
        const { text, highlights } = parseStoredAnalysis(record.analysis);
        setState({
          status:     'success',
          analysis:   text,
          highlights,
          sourceHash: record.source_hash ?? null,
        });
      });

    return () => { cancelled = true; };
  }, [student?.id]);

  const generate = useCallback(async () => {
    if (!student) return;
    setState({ status: 'loading' });

    const insights: QuickInsights = computeQuickInsights(student, events);
    const surveyShifts             = buildSurveyShifts(events);
    const sessionDetails           = buildSessionDetails(events);
    const fingerprint              = buildAnalysisSourceFingerprint(student, events);

    const { data, error } = await supabase.functions.invoke('analyze-student', {
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
        schoolName:   schoolName ?? null,
        insights,
        surveyShifts,
        sessionDetails,
      },
    });

    if (error) {
      setState({ status: 'error', message: error.message ?? 'Failed to generate analysis.' });
      return;
    }

    const payload   = data as { analysis?: string; highlights?: unknown };
    const analysis  = payload?.analysis;
    if (!analysis) {
      setState({ status: 'error', message: 'No analysis returned from service.' });
      return;
    }
    const highlights = sanitizeHighlights(payload.highlights);

    setState({ status: 'success', analysis, highlights, sourceHash: fingerprint });

    // Persist encrypted — key never leaves the Postgres server.
    await supabase.rpc('upsert_student_analysis', {
      p_student_id:  student.id,
      p_school_id:   (student as { schoolId?: string }).schoolId ?? null,
      p_analysis:    serializeAnalysis(analysis, highlights),
      p_source_hash: fingerprint,
    });
  }, [student, events, schoolName]);

  const displayState = useMemo(
    () => deriveAnalysisDisplayState(student?.stageProgress ?? 0, state, sourceHash),
    [student?.stageProgress, state, sourceHash],
  );

  return { state, displayState, generate, sourceHash };
}
