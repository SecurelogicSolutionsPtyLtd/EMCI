import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import type { TeamMember } from '../services/supabase';
import { getRoleGroup } from '../types/roles';

/** Schools excluded from programme KPI aggregates (test/demo/vendor entries). */
export function isExcludedFromProgramStats(school: Pick<School, 'name'>): boolean {
  const name = school.name.trim().toLowerCase();
  if (!name) return false;
  if (/secure\s*logic/i.test(name)) return true;
  if (/\btest\b/i.test(name)) return true;
  if (/\bdemo\b/i.test(name)) return true;
  return false;
}

/** Counsellor identities excluded from programme KPI aggregates. */
export function isExcludedTestCounsellor(identity: {
  name?: string | null;
  email?: string | null;
}): boolean {
  const email = (identity.email ?? '').trim().toLowerCase();
  const name = (identity.name ?? '').trim().toLowerCase();
  if (email.includes('securelogic')) return true;
  if (/\btest\b/i.test(name) || /\btest\b/i.test(email)) return true;
  if (/\bdemo\b/i.test(name) || /\bdemo\b/i.test(email)) return true;
  return false;
}

export function filterStatsSchools<T extends Pick<School, 'id' | 'name'>>(schools: T[]): T[] {
  return schools.filter(s => !isExcludedFromProgramStats(s));
}

export function filterStatsStudents<T extends Student>(
  students: T[],
  statsSchoolIds: ReadonlySet<string>,
): T[] {
  return students.filter(s => {
    const schoolId = (s as { schoolId?: string }).schoolId;
    return Boolean(schoolId && statsSchoolIds.has(schoolId));
  });
}

export interface DeactivatedCounsellorKeys {
  ownerIds: ReadonlySet<string>;
  emails: ReadonlySet<string>;
}

/** Platform-deactivated counsellors (inactive team members with a counsellor scope). */
export function buildDeactivatedCounsellorKeys(members: TeamMember[]): DeactivatedCounsellorKeys {
  const ownerIds = new Set<string>();
  const emails = new Set<string>();

  for (const member of members) {
    if (member.is_active) continue;
    const isCounsellorRole =
      getRoleGroup(member.role) === 'acce' &&
      member.role !== 'acce_admin' &&
      member.role !== 'securelogic_admin';
    const hasCounsellorScope = Boolean(
      member.counsellor_email?.trim() || member.dataverse_owner_id?.trim(),
    );
    if (!isCounsellorRole && !hasCounsellorScope) continue;

    const ownerId = member.dataverse_owner_id?.trim().toLowerCase();
    if (ownerId) ownerIds.add(ownerId);
    const email = (member.counsellor_email ?? member.email)?.trim().toLowerCase();
    if (email) emails.add(email);
  }

  return { ownerIds, emails };
}

export function isDeactivatedCounsellor(
  identity: { ownerId?: string | null; email?: string | null },
  deactivated: DeactivatedCounsellorKeys,
): boolean {
  const ownerId = identity.ownerId?.trim().toLowerCase();
  if (ownerId && deactivated.ownerIds.has(ownerId)) return true;
  const email = identity.email?.trim().toLowerCase();
  if (email && deactivated.emails.has(email)) return true;
  return false;
}
