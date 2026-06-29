import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import type { AppRole, CounsellorScope } from '../types/roles';
import { getRoleGroup, isCounsellorScoped, studentMatchesCounsellorScope } from '../types/roles';
import {
  counsellorRosterKey,
  filterStatsSchools,
  filterStatsStudents,
  filterViewableSchools,
  isDeactivatedCounsellor,
  isExcludedFromProgramStats,
  isExcludedTestCounsellor,
  resolveInactiveCounsellorKeys,
  emptyDeactivatedCounsellorKeys,
  type DeactivatedCounsellorKeys,
} from './programStatsFilters';
import type { TeamMember, InactiveCounsellorOverride } from '../services/supabase';
import type { OwnerLookup } from '../services/dataverse';

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

  // Drop test/demo/vendor schools (and their students) from every program view —
  // roster, filters, and search — not just KPI aggregates.
  const baseSchools = filterStatsSchools(schools);
  const excludedSchoolIds = new Set(
    schools.filter(s => isExcludedFromProgramStats(s)).map(s => s.id),
  );

  let visibleStudents = students.filter(
    s => !excludedSchoolIds.has((s as { schoolId?: string }).schoolId ?? ''),
  );
  if (isSchoolRole && authSchoolId) {
    visibleStudents = visibleStudents.filter(s => (s as { schoolId?: string }).schoolId === authSchoolId);
  } else if (scopedCounsellor && counsellorScope) {
    visibleStudents = visibleStudents.filter(s => studentMatchesCounsellorScope(s, counsellorScope));
  }

  let visibleSchools = baseSchools;
  if (isSchoolRole && authSchoolId) {
    visibleSchools = baseSchools.filter(s => s.id === authSchoolId);
  } else if (scopedCounsellor) {
    const schoolIds = new Set(
      visibleStudents
        .map(s => (s as { schoolId?: string }).schoolId)
        .filter((id): id is string => Boolean(id)),
    );
    visibleSchools = baseSchools.filter(s => schoolIds.has(s.id));
  }

  const retainSchoolId = isSchoolRole && authSchoolId ? authSchoolId : null;
  visibleSchools = filterViewableSchools(visibleSchools, { retainSchoolId });
  const allowedSchoolIds = new Set(visibleSchools.map(s => s.id));
  visibleStudents = visibleStudents.filter(s => {
    const schoolId = (s as { schoolId?: string }).schoolId;
    return Boolean(schoolId && allowedSchoolIds.has(schoolId));
  });

  return { visibleSchools, visibleStudents };
}

interface CounsellorAssignment {
  ownerId?: string;
  email?: string;
  name?: string;
  hasActiveStudent: boolean;
}

function countActiveProgramCounsellors(
  students: Student[],
  deactivated: DeactivatedCounsellorKeys,
): number {
  const assignments = new Map<string, CounsellorAssignment>();

  for (const student of students) {
    if (isExcludedTestCounsellor({ name: student.counsellor, email: student.counsellorEmail })) {
      continue;
    }

    const key = counsellorRosterKey(student);
    if (!key) continue;

    const existing = assignments.get(key) ?? {
      ownerId: student.counsellorOwnerId ?? undefined,
      email: student.counsellorEmail ?? undefined,
      name: student.counsellor ?? undefined,
      hasActiveStudent: false,
    };
    if (student.status === 'Active') {
      existing.hasActiveStudent = true;
    }
    assignments.set(key, existing);
  }

  let activeCounsellors = 0;

  for (const assignment of assignments.values()) {
    if (
      assignment.hasActiveStudent &&
      !isDeactivatedCounsellor(assignment, deactivated)
    ) {
      activeCounsellors += 1;
    }
  }

  return activeCounsellors;
}

export function resolveProgramStatsOptions(
  teamMembers?: TeamMember[],
  ownerMap?: OwnerLookup,
  inactiveOverrides?: InactiveCounsellorOverride[],
): ProgramStatsOptions {
  const inactive = resolveInactiveCounsellorKeys(teamMembers, ownerMap, inactiveOverrides);
  if (!inactive.ownerIds.size && !inactive.emails.size && !inactive.names.size) return {};
  return { deactivatedCounsellors: inactive };
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
  const totalCompleted = statsStudents.filter(s => s.currentStage === 'complete').length;
  const completedPct = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;

  const deactivated = statsOptions.deactivatedCounsellors ?? emptyDeactivatedCounsellorKeys();
  const activeCounsellors = countActiveProgramCounsellors(statsStudents, deactivated);

  return [
    { label: 'Total Schools / Campuses (Pilot Lifetime)', value: totalSchoolsPilot, highlight: false },
    { label: 'Active Schools / Campuses', value: activeSchools, highlight: false },
    { label: 'Inactive Schools / Campuses', value: inactiveSchools, highlight: false },
    { label: 'Total Students (Pilot Lifetime)', value: totalStudents.toLocaleString('en-AU'), highlight: false },
    { label: 'Active Students', value: totalActive.toLocaleString('en-AU'), highlight: false },
    { label: 'Completed %', value: `${completedPct}%`, highlight: true },
    { label: 'Active Counsellors', value: activeCounsellors, highlight: false },
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
