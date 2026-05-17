import React, { useMemo } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { PdfPreview } from '../components/PdfPreview';
import { formatYearLevelLine } from '../data/studentsData';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, getRoleGroup } from '../types/roles';
import type { AppShellOutletContext } from './shellContext';
import { isPlausibleRecordIdParam } from '../lib/recordIdParam';

export function PdfRoute() {
  const { studentId: studentIdParam } = useParams();
  const navigate = useNavigate();
  const { students, schools, userRole, studentEventsMap } = useOutletContext<AppShellOutletContext>();
  const { schoolId: authSchoolId } = useAuth();

  const selectedStudent = useMemo(() => {
    if (!isPlausibleRecordIdParam(studentIdParam)) return null;
    return students.find(s => s.id === studentIdParam) ?? null;
  }, [students, studentIdParam]);

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

  const selectedSchool =
    selectedStudent && schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId);

  const studentSchoolName = selectedStudent
    ? (schools.find(s => s.id === (selectedStudent as { schoolId?: string }).schoolId)?.name ??
        selectedSchool?.name ??
        undefined)
    : undefined;

  return (
    <div className="h-full w-full overflow-hidden">
      <PdfPreview
        studentName={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '—'}
        morrisbyId={selectedStudent?.morrisbyId ?? '—'}
        schoolName={studentSchoolName ?? selectedSchool?.name ?? '—'}
        counsellor={selectedStudent?.counsellor ?? '—'}
        yearLevelDisplay={selectedStudent ? formatYearLevelLine(selectedStudent) : '—'}
        currentStage={selectedStudent?.currentStage ?? null}
        stageProgress={selectedStudent?.stageProgress ?? 0}
        events={selectedStudent ? (studentEventsMap[selectedStudent.id] ?? []) : []}
        onBack={() => navigate(`/student/${studentIdParam}`)}
      />
    </div>
  );
}
