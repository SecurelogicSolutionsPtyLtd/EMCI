import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import type { AppRole } from '../types/roles';
import { getRoleGroup } from '../types/roles';

export interface ProgramKpiCard {
  label: string;
  value: string | number;
  highlight: boolean;
}

/** Same visibility rules as NetworkOverview: school roles see only their school cohort. */
export function getProgramVisibleScope(
  students: Student[],
  schools: School[],
  userRole: AppRole,
  authSchoolId: string | null,
): { visibleSchools: School[]; visibleStudents: Student[] } {
  const isSchoolRole = getRoleGroup(userRole) === 'school';
  const visibleSchools =
    isSchoolRole && authSchoolId ? schools.filter(s => s.id === authSchoolId) : schools;
  const visibleStudents =
    isSchoolRole && authSchoolId
      ? students.filter(s => (s as { schoolId?: string }).schoolId === authSchoolId)
      : students;
  return { visibleSchools, visibleStudents };
}

export function buildProgramKpiCards(
  visibleSchools: School[],
  visibleStudents: Student[],
): ProgramKpiCard[] {
  const totalSchools = visibleSchools.length;
  const totalStudents = visibleStudents.length;
  const totalActive = visibleStudents.filter(s => s.status === 'Active').length;
  const totalInProgress = visibleStudents.filter(
    s => s.stageProgress > 0 && s.currentStage !== 'complete',
  ).length;
  const totalCompleted = visibleStudents.filter(s => s.currentStage === 'complete').length;
  const completedPct = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;
  const totalCounsellors = Array.from(new Set(visibleStudents.map(s => s.counsellor).filter(Boolean))).length;

  return [
    { label: 'Total Schools', value: totalSchools, highlight: false },
    { label: 'Total Students', value: totalStudents.toLocaleString('en-AU'), highlight: false },
    { label: 'Active Students', value: totalActive.toLocaleString('en-AU'), highlight: false },
    { label: 'In Progress', value: totalInProgress.toLocaleString('en-AU'), highlight: false },
    { label: 'Completed %', value: `${completedPct}%`, highlight: true },
    { label: 'Counsellors', value: totalCounsellors, highlight: false },
  ];
}
