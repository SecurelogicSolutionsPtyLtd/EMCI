import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { ProfileSnapshot } from '../components/ProfileSnapshot';
import { TimelineCore } from '../components/TimelineCore';
import { ContextPanel } from '../components/ContextPanel';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, getRoleGroup } from '../types/roles';
import type { AppShellOutletContext } from './shellContext';
import { isPlausibleRecordIdParam } from '../lib/recordIdParam';

export function StudentJourneyRoute() {
  const { studentId: studentIdParam } = useParams();
  const navigate = useNavigate();
  const { students, schools, userRole, studentEventsMap } =
    useOutletContext<AppShellOutletContext>();
  const { schoolId: authSchoolId } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const selectedStudent = useMemo(() => {
    if (!isPlausibleRecordIdParam(studentIdParam)) return null;
    return students.find(s => s.id === studentIdParam) ?? null;
  }, [students, studentIdParam]);

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

  const selectedSchoolForStudent = selectedStudent
    ? schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId) ?? null
    : null;

  const studentSchoolName = selectedStudent
    ? (schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId)?.name ??
        selectedSchoolForStudent?.name ??
        undefined)
    : undefined;

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-emci-bg text-emci-primary overflow-hidden">
      <div className="shrink-0 bg-white border-b border-slate-100 px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors font-medium group shrink-0"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <button
            type="button"
            onClick={() =>
              selectedSchoolForStudent
                ? navigate(`/school/${selectedSchoolForStudent.id}`)
                : navigate('/schools')
            }
            className="text-sm text-slate-500 hover:text-primary transition-colors font-medium truncate"
          >
            {selectedSchoolForStudent?.name ?? 'School'}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-sm text-slate-800 font-semibold truncate">
            {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Student Journey'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canAccessPage(userRole, 'pdf') && selectedStudent && (
            <button
              type="button"
              onClick={() => navigate(`/student/${selectedStudent.id}/pdf`)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all rounded-lg shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              Export to PDF
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col min-h-0">
          <ProfileSnapshot student={selectedStudent} schoolName={studentSchoolName} />
        </div>
        <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 min-w-0">
          <TimelineCore
            student={selectedStudent}
            events={selectedStudent ? (studentEventsMap[selectedStudent.id] ?? []) : []}
            onSelectEvent={setSelectedEvent}
          />
        </div>
        <div className="w-[380px] shrink-0 border-l border-slate-200 flex flex-col min-h-0">
          <ContextPanel
            student={selectedStudent}
            selectedEvent={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      </div>
    </div>
  );
}
