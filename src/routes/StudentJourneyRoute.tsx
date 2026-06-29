import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ChevronRight, Eye, FileDown } from 'lucide-react';
import { StudentJourneySummary } from '../components/StudentJourneySummary';
import { StudentJourneyModal } from '../components/StudentJourneyModal';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, canSeeStudentNames, canUseAiFeatures, getRoleGroup, isCounsellorScoped, studentMatchesCounsellorScope } from '../types/roles';
import type { AppShellOutletContext } from './shellContext';
import { isPlausibleRecordIdParam } from '../lib/recordIdParam';
import {
  redactTimelineEvents,
  studentPseudonym,
  toRedactedStudentView,
} from '../lib/studentRedaction';
import { useAiRedactedEvents } from '../redaction';

export function StudentJourneyRoute() {
  const { studentId: studentIdParam } = useParams();
  const navigate = useNavigate();
  const { students, schools, userRole, studentEventsMap } =
    useOutletContext<AppShellOutletContext>();
  const { schoolId: authSchoolId, counsellorScope } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll to the top whenever the viewed student changes — the route's
  // scroll container is reused across `/student/:studentId` navigations, so
  // without this the next student opens scrolled down and the header card
  // (name + progress stepper) appears "missing".
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [studentIdParam]);

  const hidePii = !canSeeStudentNames(userRole);
  const hideAi  = !canUseAiFeatures(userRole);

  const selectedStudent = useMemo(() => {
    if (!isPlausibleRecordIdParam(studentIdParam)) return null;
    return students.find(s => s.id === studentIdParam) ?? null;
  }, [students, studentIdParam]);

  const displayStudent = useMemo(
    () => (hidePii ? toRedactedStudentView(selectedStudent) : selectedStudent),
    [hidePii, selectedStudent],
  );

  const baseEvents = useMemo(() => {
    if (!selectedStudent) return [];
    const raw = studentEventsMap[selectedStudent.id] ?? [];
    return redactTimelineEvents(raw, selectedStudent, userRole);
  }, [selectedStudent, studentEventsMap, userRole]);

  // AI deep scan (tier 2) for sensitive info the pattern tier missed.
  const studentEvents = useAiRedactedEvents(baseEvents);

  if (!isPlausibleRecordIdParam(studentIdParam)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canAccessPage(userRole, 'student')) {
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

  if (
    selectedStudent &&
    isCounsellorScoped(userRole, counsellorScope) &&
    counsellorScope &&
    !studentMatchesCounsellorScope(selectedStudent, counsellorScope)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const selectedSchoolForStudent = selectedStudent
    ? schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId) ?? null
    : null;

  const studentSchoolName = selectedStudent
    ? (schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId)?.name ??
        selectedSchoolForStudent?.name ??
        undefined)
    : undefined;

  const breadcrumbStudentLabel = selectedStudent
    ? (hidePii ? studentPseudonym(selectedStudent.id) : `${selectedStudent.firstName} ${selectedStudent.lastName}`)
    : 'Student Journey';

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden">

      {/* ── Header bar (fixed — never scrolls) ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="text-sm text-slate-500 hover:text-primary transition-colors font-medium shrink-0 cursor-pointer"
          >
            Students
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-sm text-slate-700 font-medium truncate">
            {breadcrumbStudentLabel}
          </span>
          {selectedStudent?.yearLevelLabel && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-sm text-slate-500 truncate">
                {selectedStudent.yearLevelLabel}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 transition-all rounded-lg cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
          {canAccessPage(userRole, 'pdf') && selectedStudent && (
            <button
              type="button"
              onClick={() => navigate(`/student/${selectedStudent.id}/pdf`)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all rounded-lg shadow-sm cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable content (header card + analysis + timeline) ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        {displayStudent && (
          <StudentJourneySummary
            student={displayStudent}
            events={studentEvents}
            schoolName={studentSchoolName}
            hidePii={hidePii}
            hideAi={hideAi}
          />
        )}
      </div>

      {/* ── Details modal ── */}
      <AnimatePresence>
        {showModal && displayStudent && (
          <StudentJourneyModal
            key="journey-modal"
            displayStudent={displayStudent}
            schoolName={studentSchoolName}
            hidePii={hidePii}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
