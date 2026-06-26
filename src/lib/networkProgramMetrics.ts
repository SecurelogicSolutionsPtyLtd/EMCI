import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import type { AppRole, CounsellorScope } from '../types/roles';
import { getRoleGroup, isCounsellorScoped, studentMatchesCounsellorScope } from '../types/roles';
import {
  buildDeactivatedCounsellorKeys,
  filterStatsSchools,
  filterStatsStudents,
  isDeactivatedCounsellor,
  isExcludedTestCounsellor,
  type DeactivatedCounsellorKeys,
} from './programStatsFilters';
import type { TeamMember } from '../services/supabase';

export interface ProgramKpiCard {
  label: string;
  value: string | number;
  highlight: boolean;
}

export interface ProgramStatsOptions {
  deactivatedCounsellors?: DeactivatedCounsellorKeys;
}

/** Same visibility rules as NetworkOverview: school roles see only their school cohort; scoped counsellors see only their students. */
export function getProgramVisibleScope(
  students: Student[],
  schools: School[],
  userRole: AppRole,
  authSchoolId: string | null,
  counsellorScope?: CounsellorScope | null,
): { visibleSchools: School[]; visibleStudents: Student[] } {
  const isSchoolRole = getRoleGroup(userRole) === 'school';
  const scopedCounsellor = isCounsellorScoped(userRole, counsellorScope);

  let visibleStudents = students;
  if (isSchoolRole && authSchoolId) {
    visibleStudents = students.filter(s => (s as { schoolId?: string }).schoolId === authSchoolId);
  } else if (scopedCounsellor && counsellorScope) {
    visibleStudents = students.filter(s => studentMatchesCounsellorScope(s, counsellorScope));
  }

  let visibleSchools = schools;
  if (isSchoolRole && authSchoolId) {
    visibleSchools = schools.filter(s => s.id === authSchoolId);
  } else if (scopedCounsellor) {
    const schoolIds = new Set(
      visibleStudents
        .map(s => (s as { schoolId?: string }).schoolId)
        .filter((id): id is string => Boolean(id)),
    );
    visibleSchools = schools.filter(s => schoolIds.has(s.id));
  }

  return { visibleSchools, visibleStudents };
}

function counsellorIdentityKey(student: Student): string | null {
  const ownerId = student.counsellorOwnerId?.trim().toLowerCase();
  if (ownerId) return `id:${ownerId}`;
  const email = student.counsellorEmail?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const name = student.counsellor?.trim().toLowerCase();
  if (name) return `name:${name}`;
  return null;
}

interface CounsellorAssignment {
  ownerId?: string;
  email?: string;
  hasActiveStudent: boolean;
}

function countProgramCounsellors(
  students: Student[],
  deactivated: DeactivatedCounsellorKeys,
): { activeCounsellors: number; totalCounsellors: number } {
  const assignments = new Map<string, CounsellorAssignment>();

  for (const student of students) {
    if (isExcludedTestCounsellor({ name: student.counsellor, email: student.counsellorEmail })) {
      continue;
    }

    const key = counsellorIdentityKey(student);
    if (!key) continue;

    const existing = assignments.get(key) ?? {
      ownerId: student.counsellorOwnerId ?? undefined,
      email: student.counsellorEmail ?? undefined,
      hasActiveStudent: false,
    };
    if (student.status === 'Active') {
      existing.hasActiveStudent = true;
    }
    assignments.set(key, existing);
  }

  let totalCounsellors = 0;
  let activeCounsellors = 0;

  for (const assignment of assignments.values()) {
    totalCounsellors += 1;
    if (
      assignment.hasActiveStudent &&
      !isDeactivatedCounsellor(assignment, deactivated)
    ) {
      activeCounsellors += 1;
    }
  }

  return { activeCounsellors, totalCounsellors };
}

export function resolveProgramStatsOptions(teamMembers?: TeamMember[]): ProgramStatsOptions {
  if (!teamMembers?.length) return {};
  return { deactivatedCounsellors: buildDeactivatedCounsellorKeys(teamMembers) };
}

export function buildProgramKpiCards(
  visibleSchools: School[],
  visibleStudents: Student[],
  statsOptions: ProgramStatsOptions = {},
): ProgramKpiCard[] {
  const statsSchools = filterStatsSchools(visibleSchools);
  const statsSchoolIds = new Set(statsSchools.map(s => s.id));
  const statsStudents = filterStatsStudents(visibleStudents, statsSchoolIds);

  const totalSchoolsPilot = statsSchools.length;
  const activeSchools = statsSchools.filter(s => s.status === 'Active').length;
  const inactiveSchools = statsSchools.filter(s => s.status === 'Inactive').length;

  const totalStudents = statsStudents.length;
  const totalActive = statsStudents.filter(s => s.status === 'Active').length;
  const totalInProgress = statsStudents.filter(
    s => s.stageProgress > 0 && s.currentStage !== 'complete',
  ).length;
  const totalCompleted = statsStudents.filter(s => s.currentStage === 'complete').length;
  const completedPct = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;

  const deactivated = statsOptions.deactivatedCounsellors ?? { ownerIds: new Set(), emails: new Set() };
  const { activeCounsellors, totalCounsellors } = countProgramCounsellors(statsStudents, deactivated);

  return [
    { label: 'Total Schools (Pilot Lifetime)', value: totalSchoolsPilot, highlight: false },
    { label: 'Active Schools', value: activeSchools, highlight: false },
    { label: 'Inactive Schools', value: inactiveSchools, highlight: false },
    { label: 'Total Students', value: totalStudents.toLocaleString('en-AU'), highlight: false },
    { label: 'Active Students', value: totalActive.toLocaleString('en-AU'), highlight: false },
    { label: 'In Progress', value: totalInProgress.toLocaleString('en-AU'), highlight: false },
    { label: 'Completed %', value: `${completedPct}%`, highlight: true },
    { label: 'Active Counsellors', value: activeCounsellors, highlight: false },
    { label: 'Total Counsellors', value: totalCounsellors, highlight: false },
  ];
}

/** Schools/students filtered for KPI aggregates (excludes test/demo schools). */
export function getProgramStatsScope(
  visibleSchools: School[],
  visibleStudents: Student[],
): { statsSchools: School[]; statsStudents: Student[] } {
  const statsSchools = filterStatsSchools(visibleSchools);
  const statsSchoolIds = new Set(statsSchools.map(s => s.id));
  return {
    statsSchools,
    statsStudents: filterStatsStudents(visibleStudents, statsSchoolIds),
  };
}
