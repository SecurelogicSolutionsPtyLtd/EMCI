import { useMemo } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { PdfPreview, type PdfStudentVoiceQuote, type PdfNextAction } from '../components/PdfPreview';
import { formatStudentTypeLabel, formatYearLevelLine, type StageKey } from '../data/studentsData';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, getRoleGroup } from '../types/roles';
import { computeQuickInsights } from '../lib/studentInsights';
import { computeWatchouts } from '../lib/studentWatchouts';
import { useStudentRating } from '../hooks/useStudentRating';
import { useStudentAnalysis } from '../hooks/useStudentAnalysis';
import { useStudentSentiment } from '../hooks/useStudentSentiment';
import type { AppShellOutletContext } from './shellContext';
import { isPlausibleRecordIdParam } from '../lib/recordIdParam';

const STAGE_LABELS: Record<Exclude<StageKey, null>, string> = {
  referral:        'Referral',
  consent:         'Consent',
  career_guidance: 'Career Guidance',
  complete:        'Complete',
};

export function PdfRoute() {
  const { studentId: studentIdParam } = useParams();
  const navigate = useNavigate();
  const { students, schools, userRole, studentEventsMap } = useOutletContext<AppShellOutletContext>();
  const { schoolId: authSchoolId } = useAuth();

  const selectedStudent = useMemo(() => {
    if (!isPlausibleRecordIdParam(studentIdParam)) return null;
    return students.find(s => s.id === studentIdParam) ?? null;
  }, [students, studentIdParam]);

  const events = useMemo(
    () => (selectedStudent ? (studentEventsMap[selectedStudent.id] ?? []) : []),
    [selectedStudent, studentEventsMap],
  );

  const studentSchoolName = selectedStudent
    ? (schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId)?.name ?? undefined)
    : undefined;

  // AI-derived data — restored from cache (auto-generated on the journey page).
  const insights = useMemo(
    () => (selectedStudent ? computeQuickInsights(selectedStudent, events) : null),
    [selectedStudent, events],
  );
  const { state: ratingState } = useStudentRating(selectedStudent, events);
  const { state: analysisState } = useStudentAnalysis(selectedStudent, events, studentSchoolName);
  const { state: sentimentState } = useStudentSentiment(selectedStudent, events, studentSchoolName);

  const rating = ratingState.status === 'success' ? ratingState.rating : null;
  const highlights = analysisState.status === 'success' ? analysisState.highlights : [];

  const careerInterest =
    highlights.find(h => /career|interest/i.test(h.label))?.value ??
    highlights[0]?.value ?? null;
  const strength =
    highlights.find(h => /strength/i.test(h.label))?.value ??
    highlights.find(h => h.value !== careerInterest)?.value ?? null;

  const studentVoice: PdfStudentVoiceQuote[] =
    sentimentState.status === 'success'
      ? sentimentState.quotes.slice(0, 3).map(q => {
          const [source, ...rest] = q.context.split(' — ');
          return { text: q.text, source, meta: rest.join(' — '), sentiment: q.sentiment };
        })
      : [];

  const watchouts = useMemo(
    () => (selectedStudent ? computeWatchouts(selectedStudent, events, rating) : []),
    [selectedStudent, events, rating],
  );
  const topWatchout =
    watchouts.find(w => w.severity === 'action') ??
    watchouts.find(w => w.severity === 'watch') ?? null;
  const nextAction: PdfNextAction | null = topWatchout
    ? { title: topWatchout.label, detail: topWatchout.detail ?? '' }
    : null;

  const absenceCount = selectedStudent?.absenceCount ?? 0;
  const attendancePct = absenceCount > 0 ? Math.max(60, 100 - absenceCount * 5) : 96;
  const workReadiness = rating?.categories.find(c => c.key === 'work_readiness')?.score ?? null;
  const stageLabel = selectedStudent?.currentStage
    ? STAGE_LABELS[selectedStudent.currentStage]
    : 'Not started';

  if (!isPlausibleRecordIdParam(studentIdParam)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canAccessPage(userRole, 'pdf')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (students.length > 0 && !selectedStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    selectedStudent &&
    getRoleGroup(userRole) === 'school' &&
    authSchoolId &&
    (selectedStudent as { schoolId?: string }).schoolId !== authSchoolId
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <PdfPreview
        studentName={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '—'}
        studentId={selectedStudent?.morrisbyId ?? '—'}
        schoolName={studentSchoolName ?? '—'}
        counsellor={selectedStudent?.counsellor ?? '—'}
        yearLevelDisplay={selectedStudent ? formatYearLevelLine(selectedStudent) : '—'}
        studentType={selectedStudent ? formatStudentTypeLabel(selectedStudent.studentType) : '—'}
        status={selectedStudent?.status ?? 'Inactive'}
        stageLabel={stageLabel}
        trackingScore={rating?.overall ?? null}
        attendancePct={attendancePct}
        absenceCount={absenceCount}
        sessionsCompleted={insights?.sessionCount ?? 0}
        workReadiness={workReadiness}
        careerInterest={careerInterest}
        strength={strength}
        counsellorSummary={analysisState.status === 'success' ? analysisState.analysis : null}
        studentVoice={studentVoice}
        nextAction={nextAction}
        onBack={() => navigate(`/student/${studentIdParam}`)}
      />
    </div>
  );
}
