import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { type Student, formatYearLevelLine } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { studentPseudonym } from '../lib/studentRedaction';
import {
  INACTIVE_STUDENT_SUMMARY_PRIMARY,
  INACTIVE_STUDENT_SUMMARY_SECONDARY,
  isInactiveStudent,
} from '../lib/inactiveStudentCopy';
import { computeQuickInsights } from '../lib/studentInsights';
import { computeWatchouts } from '../lib/studentWatchouts';
import { useStudentRating } from '../hooks/useStudentRating';
import { QuickInsightsPanel } from './QuickInsightsPanel';
import { StudentTimeline } from './StudentTimeline';
import { StudentRatingBadge } from './StudentRatingBadge';
import { StudentRatingBreakdown } from './StudentRatingBreakdown';
import { StudentWatchouts } from './StudentWatchouts';
import { StudentSentimentCard } from './StudentSentimentCard';
import { StudentJourneyStepper } from './StudentJourneyStepper';
import { CompletedJourneyPanel } from './CompletedJourneyPanel';
import { ReportEyebrow } from './ReportCard';

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
  const inactive = isInactiveStudent(student);
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    setShowHistorical(false);
  }, [student.id]);

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

  const ratingStudent = hideAi || inactive ? null : student;
  const { state: ratingState, generate: generateRating } = useStudentRating(ratingStudent, events);

  const ratingForWatchouts = ratingState.status === 'success' ? ratingState.rating : null;
  const watchouts = useMemo(
    () => computeWatchouts(student, events, ratingForWatchouts),
    [student, events, ratingForWatchouts],
  );
  const isComplete = student.stageProgress >= 4;
  const showWatchouts = !hideAi && !inactive && watchouts.length > 0;

  const ratingBadge = !hideAi && !inactive
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

  if (inactive) {
    const historicalWatchouts = showHistorical && !hideAi ? watchouts : [];

    return (
      <div className="flex flex-col gap-5 p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          {identityBlock}
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3.5 space-y-2">
            <p className="text-[15px] text-slate-800 leading-relaxed">
              {INACTIVE_STUDENT_SUMMARY_PRIMARY}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {INACTIVE_STUDENT_SUMMARY_SECONDARY}
            </p>
          </div>
        </div>

        <QuickInsightsPanel insights={insights} events={events} />

        <button
          type="button"
          onClick={() => setShowHistorical(v => !v)}
          className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          aria-expanded={showHistorical}
        >
          <History className="w-4 h-4 text-slate-400 shrink-0" />
          {showHistorical ? 'Hide historical data' : 'Show historical data'}
          {showHistorical
            ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
        </button>

        {showHistorical && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <StudentJourneyStepper student={student} events={events} />
            </div>

            {!hideAi && (
              <StudentSentimentCard
                student={student}
                events={events}
                schoolName={schoolName}
                loadStoredOnly
                historical
              />
            )}

            {historicalWatchouts.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 px-6 py-5">
                <StudentWatchouts watchouts={historicalWatchouts} />
              </div>
            )}

            <StudentTimeline events={events} />
          </div>
        )}
      </div>
    );
  }

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

      {/* ── Student Voice & Sentiment + Quick Insights ── */}
      <div className="grid grid-cols-5 gap-5">
        {!hideAi && (
          <div className="col-span-3 h-full">
            <StudentSentimentCard
              student={student}
              events={events}
              schoolName={schoolName}
            />
          </div>
        )}
        <div className={hideAi ? 'col-span-5' : 'col-span-2'}>
          <QuickInsightsPanel insights={insights} events={events} />
        </div>
      </div>

      {/* ── Activity Timeline ── */}
      <StudentTimeline events={events} />
    </div>
  );
}
