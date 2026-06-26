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
  filterStatsSchools,
  isExcludedFromProgramStats,
  isExcludedTestCounsellor,
} from './programStatsFilters.js';

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
    assert.equal(isExcludedFromProgramStats({ name: 'Ashwood School' }), false);
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
    assert.equal(byLabel['Total Schools (Pilot Lifetime)'], 3);
    assert.equal(byLabel['Active Schools'], 1);
    assert.equal(byLabel['Inactive Schools'], 1);
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
    const kpis = buildProgramKpiCards(
      schools,
      students,
      resolveProgramStatsOptions([inactiveMember]),
    );
    const byLabel = Object.fromEntries(kpis.map(k => [k.label, k.value]));
    assert.equal(byLabel['Active Counsellors'], 1);
    assert.equal(byLabel['Total Counsellors'], 3);
  });
});
