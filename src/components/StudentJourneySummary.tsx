import React, { useMemo } from 'react';
import {
  Check, Sparkles, AlertTriangle, RotateCcw, Loader2,
  ClipboardCheck, Compass, Flag, type LucideIcon,
} from 'lucide-react';
import { type Student, formatYearLevelLine } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { studentPseudonym } from '../lib/studentRedaction';
import { computeQuickInsights } from '../lib/studentInsights';
import { computeWatchouts } from '../lib/studentWatchouts';
import { useStudentAnalysis } from '../hooks/useStudentAnalysis';
import { useStudentRating } from '../hooks/useStudentRating';
import { QuickInsightsPanel } from './QuickInsightsPanel';
import { AnalysisHighlights } from './AnalysisHighlights';
import { StudentTimeline } from './StudentTimeline';
import { StudentRatingBadge } from './StudentRatingBadge';
import { StudentRatingBreakdown } from './StudentRatingBreakdown';
import { StudentWatchouts } from './StudentWatchouts';
import { StudentSentimentCard } from './StudentSentimentCard';

// ── Stepper ──────────────────────────────────────────────────────────────────

const STEPS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'consent',         label: 'Consent',         Icon: ClipboardCheck },
  { key: 'career_guidance', label: 'Career Guidance', Icon: Compass },
  { key: 'complete',        label: 'Complete',        Icon: Flag },
];

type StepStatus = 'done' | 'current' | 'pending';

/**
 * Derives each visual step's status from the numeric `stageProgress` (0–4)
 * rather than the nullable `currentStage`. This is the same value the AI
 * analysis reports as "X/4", so the stepper always matches the narrative and
 * renders consistently for every student — including completed and inactive
 * ones whose `currentStage` may be cleared.
 *
 * Progress scale: 0 not started · 1–2 consent · 3 career guidance · 4 complete.
 * The referral data stage (1) is folded into the visual "Consent" step.
 */
function getStepStatus(stepKey: string, stageProgress: number): StepStatus {
  switch (stepKey) {
    case 'consent':
      if (stageProgress >= 3) return 'done';
      if (stageProgress >= 1) return 'current';
      return 'pending';
    case 'career_guidance':
      if (stageProgress >= 4) return 'done';
      if (stageProgress === 3) return 'current';
      return 'pending';
    case 'complete':
      return stageProgress >= 4 ? 'done' : 'pending';
    default:
      return 'pending';
  }
}

// ── Fallback static summary (used in PII-restricted mode) ────────────────────

function buildFallbackSummary(student: Student): string {
  const stageDescriptions: Partial<Record<string, string>> = {
    referral:        'has recently been referred into the EMCI programme and initial assessments are underway',
    consent:         'has completed the referral stage and is awaiting confirmation of parental consent',
    career_guidance: 'is actively engaged in career guidance sessions',
    complete:        'has successfully completed the full EMCI programme',
  };
  const stageStr = student.currentStage
    ? (stageDescriptions[student.currentStage] ?? 'is progressing through the programme')
    : 'has been enrolled in the programme';
  const attendancePart = student.absenceCount > 5
    ? `Attendance has been noted as a focus area this term, with ${student.absenceCount} recorded absences.`
    : student.absenceCount > 0
    ? `Attendance has been generally consistent, with ${student.absenceCount} recorded absence${student.absenceCount !== 1 ? 's' : ''} noted.`
    : 'Attendance has been consistent throughout the programme.';
  const interviewPart = student.interviewed
    ? 'A career interview has been conducted and outcomes are reflected in their guidance plan.'
    : 'A career interview has not yet been conducted.';
  return `This student ${stageStr}. ${attendancePart} ${interviewPart}`;
}

// ── Analysis card (AI-driven prose) ──────────────────────────────────────────

interface AnalysisCardProps {
  student:     Student;
  events:      TimelineEvent[];
  schoolName?: string;
  hidePii:     boolean;
}

function AnalysisCard({ student, events, schoolName, hidePii }: AnalysisCardProps) {
  const { state, displayState, generate } = useStudentAnalysis(
    hidePii ? null : student,
    events,
    schoolName,
  );

  return (
    <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Analysis Summary
        </h3>
        {displayState === 'current' && !hidePii && (
          <button
            onClick={generate}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {hidePii && (
          <p className="text-sm text-slate-700 leading-relaxed">
            {buildFallbackSummary(student)}
          </p>
      )}

      {!hidePii && displayState === 'too_early' && (
        <div className="flex flex-col items-center text-center px-4 py-6">
          <img
            src="/analysis-not-yet-available.png"
            alt=""
            aria-hidden="true"
            className="w-28 h-28 mb-4 select-none pointer-events-none"
          />
          <p className="text-base font-semibold text-slate-900">
            Analysis not yet available
          </p>
          <p className="mt-1.5 text-sm text-slate-600 max-w-sm leading-relaxed">
            This student is still in the consent stage. Only consent information is
            on record so far — an EMCI analysis will become available once they enter
            Career Guidance.
          </p>
        </div>
      )}

      {!hidePii && displayState === 'ready' && (
        <div className="flex flex-col items-center text-center px-4 py-6">
          <img
            src="/analysis-empty-state.png"
            alt=""
            aria-hidden="true"
            className="w-28 h-28 mb-4 select-none pointer-events-none"
          />
          <p className="text-base font-semibold text-slate-900">
            No analysis generated yet
          </p>
          <p className="mt-1.5 mb-5 text-sm text-slate-600 max-w-xs leading-relaxed">
            Generate an EMCI analysis to see insights about this student&apos;s
            strengths, wellbeing and engagement.
          </p>
          <button
            onClick={generate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-sm font-semibold text-white shadow-sm shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate EMCI Analysis
          </button>
        </div>
      )}

      {!hidePii && displayState === 'loading' && (
        <div className="flex items-center gap-3 px-4 py-5 rounded-xl bg-slate-50 border border-slate-100">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-slate-500">Generating analysis…</span>
        </div>
      )}

      {!hidePii && displayState === 'error' && state.status === 'error' && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700 font-medium">{state.message}</p>
            <button onClick={generate} className="text-xs text-red-600 underline mt-1 cursor-pointer">
              Try again
            </button>
          </div>
        </div>
      )}

      {!hidePii && displayState === 'stale' && state.status === 'success' && (
        <>
          <div className="flex flex-col items-center text-center px-4 pt-6 pb-4">
            <img
              src="/analysis-needs-regenerate.png"
              alt=""
              aria-hidden="true"
              className="w-28 h-28 mb-4 select-none pointer-events-none"
            />
            <p className="text-base font-semibold text-slate-900">
              Analysis needs to be regenerated
            </p>
            <p className="mt-1.5 mb-5 text-sm text-slate-600 max-w-sm leading-relaxed">
              Student information has changed since this analysis was last generated.
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-sm font-semibold text-white shadow-sm shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate EMCI Analysis
            </button>
          </div>
          <div className="opacity-80">
            <AnalysisHighlights highlights={state.highlights} />
            <div className="px-4 py-4 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                {state.analysis}
              </p>
              <p className="text-[11px] text-slate-400 mt-3 uppercase tracking-wide">
                AI-generated · Out of date · For guidance purposes only
              </p>
            </div>
          </div>
        </>
      )}

      {!hidePii && displayState === 'current' && state.status === 'success' && (
        <>
          <AnalysisHighlights highlights={state.highlights} />
          <div className="px-4 py-4 rounded-xl bg-primary/5 border border-primary/15">
            <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
              {state.analysis}
            </p>
            <p className="text-[11px] text-slate-400 mt-3 uppercase tracking-wide">
              AI-generated · For guidance purposes only
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface StudentJourneySummaryProps {
  student: Student;
  events: TimelineEvent[];
  schoolName?: string;
  hidePii?: boolean;
}

export function StudentJourneySummary({
  student,
  events,
  schoolName,
  hidePii = false,
}: StudentJourneySummaryProps) {
  const displayName = hidePii
    ? studentPseudonym(student.id)
    : `${student.firstName} ${student.lastName}`;

  const statusStyles = student.status === 'Active'
    ? { pill: 'bg-emerald-50/90 border-emerald-200/70 text-emerald-700', dot: 'bg-emerald-500' }
    : student.status === 'Pending'
    ? { pill: 'bg-amber-50/90 border-amber-200/70 text-amber-700', dot: 'bg-amber-500' }
    : { pill: 'bg-slate-50 border-slate-200/80 text-slate-500', dot: 'bg-slate-400' };
  const yearBadge = formatYearLevelLine(student);
  const insights  = useMemo(() => computeQuickInsights(student, events), [student, events]);
  const { state: ratingState, generate: generateRating } = useStudentRating(
    hidePii ? null : student,
    events,
  );
  const ratingForWatchouts = ratingState.status === 'success' ? ratingState.rating : null;
  const watchouts = useMemo(
    () => computeWatchouts(student, events, ratingForWatchouts),
    [student, events, ratingForWatchouts],
  );

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* ── Student header card ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

        {/* Name + status + school */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-3 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${statusStyles.pill}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyles.dot}`} />
                  {student.status}
                </span>
                {schoolName && (
                  <span className="text-sm font-medium text-slate-600">{schoolName}</span>
                )}
                {yearBadge !== '—' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200/80 bg-slate-50/80 text-xs font-medium text-slate-600">
                    {yearBadge}
                  </span>
                )}
              </div>
            </div>
            {!hidePii && <StudentRatingBadge state={ratingState} generate={generateRating} />}
          </div>

          {!hidePii && ratingState.status === 'success' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <StudentRatingBreakdown rating={ratingState.rating} />
            </div>
          )}

          {!hidePii && watchouts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <StudentWatchouts watchouts={watchouts} />
            </div>
          )}
        </div>

        {/* ── Progress stepper ── */}
        <div className="border-t border-slate-100 px-8 py-5">
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const status = getStepStatus(step.key, student.stageProgress);
              const StepIcon = status === 'done' ? Check : step.Icon;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      status === 'done'
                        ? 'bg-primary shadow-sm shadow-primary/30'
                        : status === 'current'
                        ? 'bg-primary ring-4 ring-primary/15 shadow-sm shadow-primary/30'
                        : 'border-2 border-slate-300 bg-white'
                    }`}>
                      <StepIcon
                        className={`w-4 h-4 ${status === 'pending' ? 'text-slate-400' : 'text-white'}`}
                        strokeWidth={2.25}
                      />
                    </div>
                    <span className={`text-xs font-medium tracking-tight transition-colors duration-300 ${
                      status === 'pending'
                        ? 'text-slate-400'
                        : status === 'current'
                        ? 'text-slate-900'
                        : 'text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 mx-2 rounded-full transition-colors duration-300 ${
                      status === 'done' ? 'bg-primary' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Analysis + Quick Insights ── */}
      <div className="grid grid-cols-5 gap-5">
        <AnalysisCard
          student={student}
          events={events}
          schoolName={schoolName}
          hidePii={hidePii}
        />
        <div className="col-span-2">
          <QuickInsightsPanel insights={insights} />
        </div>
      </div>

      {/* ── Student Voice & Sentiment ── */}
      {!hidePii && (
        <StudentSentimentCard
          student={student}
          events={events}
          schoolName={schoolName}
        />
      )}

      {/* ── Activity Timeline ── */}
      <StudentTimeline events={events} />
    </div>
  );
}
