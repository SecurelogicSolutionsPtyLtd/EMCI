import { useMemo } from 'react';
import { Sparkles, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
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
import { StudentJourneyStepper } from './StudentJourneyStepper';
import { CompletedJourneyPanel } from './CompletedJourneyPanel';
import { ReportCardHeader, ReportSectionHeading, ReportFooter, ReportEyebrow } from './ReportCard';

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
  hideAi:      boolean;
}

function AnalysisCard({ student, events, schoolName, hideAi }: AnalysisCardProps) {
  const { state, displayState, generate } = useStudentAnalysis(
    hideAi ? null : student,
    events,
    schoolName,
  );

  return (
    <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      <ReportCardHeader
        title="Analysis Summary"
        subtitle="EMCI practitioner analysis of programme engagement"
      >
        {displayState === 'current' && !hideAi && (
          <button
            onClick={generate}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </ReportCardHeader>

      <div className="p-6 flex-1">

      {hideAi && (
          <p className="text-sm text-slate-700 leading-relaxed">
            {buildFallbackSummary(student)}
          </p>
      )}

      {!hideAi && displayState === 'too_early' && (
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

      {!hideAi && displayState === 'ready' && (
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
            strengths, sentiment and engagement.
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

      {!hideAi && displayState === 'loading' && (
        <div className="flex items-center gap-3 px-4 py-5 rounded-xl bg-slate-50 border border-slate-100">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-slate-500">Generating analysis…</span>
        </div>
      )}

      {!hideAi && displayState === 'error' && state.status === 'error' && (
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

      {!hideAi && displayState === 'stale' && state.status === 'success' && (
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
          <div className="opacity-80 space-y-6">
            {state.highlights.length > 0 && (
              <div className="space-y-3">
                <ReportSectionHeading>Key Indicators</ReportSectionHeading>
                <AnalysisHighlights highlights={state.highlights} />
              </div>
            )}
            <div className="space-y-3">
              <ReportSectionHeading>Summary of Findings</ReportSectionHeading>
              <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3.5">
                <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {state.analysis}
                </p>
              </div>
            </div>
            <ReportFooter
              left="AI-Generated · Out of Date · For Guidance Purposes Only"
              right="Not an Official Assessment"
            />
          </div>
        </>
      )}

      {!hideAi && displayState === 'current' && state.status === 'success' && (
        <div className="space-y-6">
          {state.highlights.length > 0 && (
            <div className="space-y-3">
              <ReportSectionHeading>Key Indicators</ReportSectionHeading>
              <AnalysisHighlights highlights={state.highlights} />
            </div>
          )}
          <div className="space-y-3">
            <ReportSectionHeading>Summary of Findings</ReportSectionHeading>
            <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3.5">
              <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                {state.analysis}
              </p>
            </div>
          </div>
          <ReportFooter
            left="AI-Generated · For Guidance Purposes Only"
            right="Not an Official Assessment"
          />
        </div>
      )}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface StudentJourneySummaryProps {
  student:    Student;
  events:     TimelineEvent[];
  schoolName?: string;
  hidePii?:   boolean;
  hideAi?:    boolean;
}

export function StudentJourneySummary({
  student,
  events,
  schoolName,
  hidePii = false,
  hideAi  = false,
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
    hideAi ? null : student,
    events,
  );
  const ratingForWatchouts = ratingState.status === 'success' ? ratingState.rating : null;
  const watchouts = useMemo(
    () => computeWatchouts(student, events, ratingForWatchouts),
    [student, events, ratingForWatchouts],
  );
  const isComplete = student.stageProgress >= 4;
  const showWatchouts = !hideAi && watchouts.length > 0;

  const ratingBadge = !hideAi
    ? <StudentRatingBadge state={ratingState} generate={generateRating} />
    : null;

  const identityBlock = (
    <>
      <div className="flex flex-col gap-1.5 min-w-0">
        <ReportEyebrow>EMCI Student Record</ReportEyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 truncate">
          {displayName}
        </h1>
      </div>
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
    </>
  );

  return (
    <div className="flex flex-col gap-5 p-6">

      {isComplete ? (
        /* ── Completed: identity card (left) + programme record card (right) ── */
        <div className="grid grid-cols-5 gap-5 items-start">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-3 min-w-0">
            {identityBlock}
          </div>

          <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <CompletedJourneyPanel
              events={events}
              watchouts={showWatchouts ? watchouts : []}
              ratingBadge={ratingBadge ?? undefined}
            />
            {!hideAi && ratingState.status === 'success' && (
              <div className="mt-auto px-6 py-5 border-t border-slate-100 space-y-2.5">
                <ReportEyebrow right="Weighted rubric · 0–100">Tracking Indicators</ReportEyebrow>
                <StudentRatingBreakdown
                  rating={ratingState.rating}
                  columnsClass="grid-cols-2 sm:grid-cols-3"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── In progress: single full-width header card ── */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-3 min-w-0">
                {identityBlock}
              </div>
              {ratingBadge}
            </div>

            {!hideAi && ratingState.status === 'success' && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                <ReportEyebrow right="Weighted rubric · 0–100">Tracking Indicators</ReportEyebrow>
                <StudentRatingBreakdown rating={ratingState.rating} />
              </div>
            )}

            {showWatchouts && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <StudentWatchouts watchouts={watchouts} />
              </div>
            )}
          </div>

          <StudentJourneyStepper student={student} events={events} />
        </div>
      )}

      {/* ── Analysis + Quick Insights ── */}
      <div className="grid grid-cols-5 gap-5">
        <AnalysisCard
          student={student}
          events={events}
          schoolName={schoolName}
          hideAi={hideAi}
        />
        <div className="col-span-2">
          <QuickInsightsPanel insights={insights} events={events} />
        </div>
      </div>

      {/* ── Student Voice & Sentiment ── */}
      {!hideAi && (
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
