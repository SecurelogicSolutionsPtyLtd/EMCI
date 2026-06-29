import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { School } from '../data/networkData.js';
import type { Student } from '../data/studentsData.js';
import type { TeamMember } from '../services/supabase.js';
import {
  buildProgramKpiCards,
  getProgramStatsScope,
  resolveProgramStatsOptions,
} from './networkProgramMetrics.js';
import {
  buildDeactivatedCounsellorKeys,
  buildDataverseDisabledCounsellorKeys,
  buildInactiveCounsellorOverrideKeys,
  deriveCounsellorRoster,
  filterStudentsForCounsellorRoster,
  filterStatsSchools,
  filterViewableSchools,
  isExcludedFromProgramStats,
  isExcludedTestCounsellor,
} from './programStatsFilters.js';
import { getProgramVisibleScope } from './networkProgramMetrics.js';

const baseSchool = (overrides: Partial<School>): School => ({
  id: 'school-1',
  name: 'Ashwood School',
  morrisbyId: 'ASH',
  region: 'Inner East',
  principalContact: 'Contact',
  status: 'Active',
  joinedYear: 2024,
  avatar: '',
  ...overrides,
});

const baseStudent = (overrides: Partial<Student> & { schoolId?: string }): Student & { schoolId: string } => ({
  id: 'stu-1',
  schoolId: 'school-1',
  firstName: 'Alex',
  lastName: 'Student',
  yearLevel: 9,
  morrisbyId: 'M001',
  status: 'Active',
  currentStage: 'referral',
  stageProgress: 1,
  riskLevel: 'none',
  absenceCount: 0,
  counsellor: 'Dr. Aris Thorne',
  counsellorEmail: 'a.thorne@emci.edu.au',
  counsellorOwnerId: 'owner-1',
  interviewed: false,
  hasProfile: false,
  studentType: 'Standard',
  lastActivity: '2025-01-01',
  ...overrides,
});

describe('programStatsFilters', () => {
  it('excludes Secure Logic and test schools from stats', () => {
    assert.equal(isExcludedFromProgramStats({ name: 'Secure Logic Demo School' }), true);
    assert.equal(isExcludedFromProgramStats({ name: 'EMCI Test School' }), true);
    assert.equal(isExcludedFromProgramStats({ name: 'Demo Schools' }), true);
    assert.equal(isExcludedFromProgramStats({ name: 'test acce' }), true);
    assert.equal(isExcludedFromProgramStats({ name: 'Ashwood School' }), false);
  });

  it('filterViewableSchools hides test schools but can retain one school id', () => {
    const schools = [
      baseSchool({ id: 'real-1', name: 'Ashwood School' }),
      baseSchool({ id: 'demo-1', name: 'Demo Schools' }),
      baseSchool({ id: 'test-1', name: 'Secure Logic' }),
    ];
    assert.equal(filterViewableSchools(schools).length, 1);
    assert.equal(
      filterViewableSchools(schools, { retainSchoolId: 'demo-1' }).map(s => s.id).sort().join(','),
      'demo-1,real-1',
    );
  });

  it('excludes test counsellor identities', () => {
    assert.equal(isExcludedTestCounsellor({ email: 'dev@securelogic.com.au' }), true);
    assert.equal(isExcludedTestCounsellor({ name: 'Test Counsellor' }), true);
    assert.equal(isExcludedTestCounsellor({ name: 'Dr. Aris Thorne', email: 'a.thorne@emci.edu.au' }), false);
  });

  it('builds deactivated counsellor keys from inactive team members', () => {
    const members: TeamMember[] = [
      {
        id: '1',
        user_id: 'u1',
        email: 'inactive@emci.edu.au',
        display_name: 'Inactive Counsellor',
        role: 'acce_staff',
        school_id: null,
        counsellor_email: 'inactive@emci.edu.au',
        dataverse_owner_id: 'owner-inactive',
        is_active: false,
        created_at: '2025-01-01',
      },
    ];
    const keys = buildDeactivatedCounsellorKeys(members);
    assert.equal(keys.ownerIds.has('owner-inactive'), true);
    assert.equal(keys.emails.has('inactive@emci.edu.au'), true);
  });

  it('builds deactivated counsellor keys from Dataverse-disabled system users', () => {
    const ownerMap = new Map([
      ['owner-active', { email: 'active@emci.edu.au', name: 'Active Counsellor', isDisabled: false }],
      ['owner-disabled', { email: 'disabled@emci.edu.au', name: 'Disabled Counsellor', isDisabled: true }],
    ]);
    const keys = buildDataverseDisabledCounsellorKeys(ownerMap);
    assert.equal(keys.ownerIds.has('owner-disabled'), true);
    assert.equal(keys.emails.has('disabled@emci.edu.au'), true);
    assert.equal(keys.ownerIds.has('owner-active'), false);
  });

  it('builds inactive counsellor keys from portal overrides', () => {
    const keys = buildInactiveCounsellorOverrideKeys([
      {
        id: '1',
        dataverse_owner_id: '13684b43-6127-ee11-9965-0022489334a7',
        display_name: 'Patricia Crilly',
        notes: null,
        created_at: '2025-01-01',
      },
    ]);
    assert.equal(keys.ownerIds.has('13684b43-6127-ee11-9965-0022489334a7'), true);
    assert.equal(keys.names.has('patricia crilly'), true);
  });

  it('marks counsellor inactive when a duplicate Dataverse name is disabled', () => {
    const students = [
      baseStudent({
        counsellor: 'Patricia Crilly',
        counsellorOwnerId: '7cbb0112-034e-ef11-a316-6045bde53c6c',
      }),
    ];
    const ownerMap = new Map([
      ['13684b43-6127-ee11-9965-0022489334a7', { email: '', name: 'Patricia Crilly', isDisabled: true }],
      ['7cbb0112-034e-ef11-a316-6045bde53c6c', { email: '', name: 'Patricia Crilly', isDisabled: false }],
    ]);
    const inactiveKeys = buildDataverseDisabledCounsellorKeys(ownerMap);
    const roster = deriveCounsellorRoster(students, ownerMap, inactiveKeys);
    assert.equal(roster.length, 1);
    assert.equal(roster[0]?.isInactive, true);
  });

  it('deriveCounsellorRoster splits active and inactive counsellors', () => {
    const students = [
      baseStudent({ counsellor: 'Active One', counsellorOwnerId: 'owner-1' }),
      baseStudent({
        id: 'stu-2',
        counsellor: 'Inactive One',
        counsellorOwnerId: 'owner-2',
        counsellorEmail: 'inactive@emci.edu.au',
      }),
    ];
    const ownerMap = new Map([
      ['owner-1', { email: 'active@emci.edu.au', name: 'Active One', isDisabled: false }],
      ['owner-2', { email: 'inactive@emci.edu.au', name: 'Inactive One', isDisabled: true }],
    ]);
    const roster = deriveCounsellorRoster(students, ownerMap);
    assert.equal(roster.length, 2);
    assert.equal(roster[0]?.name, 'Active One');
    assert.equal(roster[0]?.isInactive, false);
    assert.equal(roster[1]?.name, 'Inactive One');
    assert.equal(roster[1]?.isInactive, true);
  });

  it('filterStudentsForCounsellorRoster matches by owner GUID not display name', () => {
    const sharedName = 'Patricia Crilly';
    const students = [
      baseStudent({ id: 'stu-a', counsellor: sharedName, counsellorOwnerId: 'owner-a' }),
      baseStudent({ id: 'stu-b', counsellor: sharedName, counsellorOwnerId: 'owner-b' }),
    ];
    const roster = deriveCounsellorRoster(students);
    const ownerA = roster.find(c => c.ownerId === 'owner-a');
    assert.ok(ownerA);
    const matched = filterStudentsForCounsellorRoster(students, ownerA!.id);
    assert.equal(matched.length, 1);
    assert.equal(matched[0]?.id, 'stu-a');
  });
});

describe('getProgramVisibleScope', () => {
  const schools: School[] = [
    baseSchool({ id: 'school-1', name: 'Ashwood School' }),
    baseSchool({ id: 'school-demo', name: 'Demo Schools' }),
    baseSchool({ id: 'school-test', name: 'Secure Logic' }),
    baseSchool({ id: 'school-test2', name: 'test acce' }),
  ];

  const students: (Student & { schoolId: string })[] = [
    baseStudent({ id: 's1', schoolId: 'school-1' }),
    baseStudent({ id: 's2', schoolId: 'school-demo' }),
    baseStudent({ id: 's3', schoolId: 'school-test' }),
  ];

  it('hides test/demo schools from network-wide ACCE views', () => {
    const { visibleSchools, visibleStudents } = getProgramVisibleScope(
      students,
      schools,
      'acce_admin',
      null,
    );
    assert.equal(visibleSchools.length, 1);
    assert.equal(visibleSchools[0].name, 'Ashwood School');
    assert.equal(visibleStudents.length, 1);
    assert.equal(visibleStudents[0].id, 's1');
  });

  it('retains a school-role user own test school', () => {
    const { visibleSchools, visibleStudents } = getProgramVisibleScope(
      students,
      schools,
      'school_admin',
      'school-demo',
    );
    assert.equal(visibleSchools.length, 1);
    assert.equal(visibleSchools[0].id, 'school-demo');
    assert.equal(visibleStudents.length, 1);
    assert.equal(visibleStudents[0].id, 's2');
  });

  it('hides test/demo schools for securelogic_admin too', () => {
    const { visibleSchools } = getProgramVisibleScope(
      students,
      schools,
      'securelogic_admin',
      null,
    );
    assert.equal(visibleSchools.length, 1);
    assert.equal(visibleSchools[0].name, 'Ashwood School');
  });
});

describe('buildProgramKpiCards', () => {
  const schools: School[] = [
    baseSchool({ id: 'school-1', status: 'Active' }),
    baseSchool({ id: 'school-2', name: 'Northgate High', status: 'Inactive' }),
    baseSchool({ id: 'school-3', name: 'Secure Logic Test School', status: 'Active' }),
    baseSchool({ id: 'school-4', name: 'Bayside Grammar', status: 'Onboarding' }),
  ];

  const students: (Student & { schoolId: string })[] = [
    baseStudent({ id: 's1', schoolId: 'school-1', status: 'Active' }),
    baseStudent({
      id: 's2',
      schoolId: 'school-2',
      status: 'Inactive',
      counsellor: 'Ms. Rachel Kim',
      counsellorEmail: 'r.kim@emci.edu.au',
      counsellorOwnerId: 'owner-2',
    }),
    baseStudent({
      id: 's3',
      schoolId: 'school-3',
      counsellor: 'Test Counsellor',
      counsellorEmail: 'test@securelogic.com.au',
      counsellorOwnerId: 'owner-test',
    }),
    baseStudent({
      id: 's4',
      schoolId: 'school-1',
      status: 'Active',
      counsellor: 'Ms. Cleo Park',
      counsellorEmail: 'c.park@emci.edu.au',
      counsellorOwnerId: 'owner-3',
    }),
  ];

  it('reports school counts excluding test schools', () => {
    const kpis = buildProgramKpiCards(schools, students);
    const byLabel = Object.fromEntries(kpis.map(k => [k.label, k.value]));
    assert.equal(byLabel['Total Schools / Campuses (Pilot Lifetime)'], 3);
    assert.equal(byLabel['Active Schools / Campuses'], 1);
    assert.equal(byLabel['Inactive Schools / Campuses'], 1);
    assert.equal(byLabel['Total Students (Pilot Lifetime)'], '3');
    assert.equal(byLabel['In Progress'], undefined);
  });

  it('excludes students at test schools from student totals', () => {
    const { statsStudents } = getProgramStatsScope(schools, students);
    assert.equal(statsStudents.length, 3);
    assert.equal(filterStatsSchools(schools).length, 3);
  });

  it('counts active counsellors by assignment, excluding test and deactivated', () => {
    const inactiveMember: TeamMember = {
      id: '2',
      user_id: 'u2',
      email: 'c.park@emci.edu.au',
      display_name: 'Ms. Cleo Park',
      role: 'acce_staff',
      school_id: null,
      counsellor_email: 'c.park@emci.edu.au',
      dataverse_owner_id: 'owner-3',
      is_active: false,
      created_at: '2025-01-01',
    };
    const ownerMap = new Map([
      ['owner-3', { email: 'c.park@emci.edu.au', name: 'Ms. Cleo Park', isDisabled: false }],
    ]);
    const kpis = buildProgramKpiCards(
      schools,
      students,
      resolveProgramStatsOptions([inactiveMember], ownerMap),
    );
    const byLabel = Object.fromEntries(kpis.map(k => [k.label, k.value]));
    assert.equal(byLabel['Active Counsellors'], 1);
    assert.equal(byLabel['Total Counsellors'], undefined);
  });

  it('excludes Dataverse-disabled counsellors from Active Counsellors KPI', () => {
    const ownerMap = new Map([
      ['owner-1', { email: 'a.thorne@emci.edu.au', name: 'Dr. Aris Thorne', isDisabled: false }],
      ['owner-3', { email: 'c.park@emci.edu.au', name: 'Ms. Cleo Park', isDisabled: true }],
    ]);
    const kpis = buildProgramKpiCards(schools, students, resolveProgramStatsOptions([], ownerMap));
    const byLabel = Object.fromEntries(kpis.map(k => [k.label, k.value]));
    assert.equal(byLabel['Active Counsellors'], 1);
  });

  it('excludes portal inactive overrides from Active Counsellors KPI', () => {
    const kpis = buildProgramKpiCards(
      schools,
      students,
      resolveProgramStatsOptions([], undefined, [
        {
          id: '1',
          dataverse_owner_id: 'owner-3',
          display_name: 'Ms. Cleo Park',
          notes: null,
          created_at: '2025-01-01',
        },
      ]),
    );
    const byLabel = Object.fromEntries(kpis.map(k => [k.label, k.value]));
    assert.equal(byLabel['Active Counsellors'], 1);
  });
});
