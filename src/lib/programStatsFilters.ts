import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import type { TeamMember, InactiveCounsellorOverride } from '../services/supabase';
import type { OwnerLookup } from '../services/dataverse';
import { getRoleGroup } from '../types/roles';

/** Schools excluded from programme KPI aggregates (test/demo/vendor entries). */
export function isExcludedFromProgramStats(
  school: Pick<School, 'name'> & { morrisbyId?: string },
): boolean {
  for (const raw of [school.name, school.morrisbyId ?? '']) {
    const text = raw.trim().toLowerCase();
    if (!text) continue;
    if (/secure\s*logic/i.test(text)) return true;
    if (/\btest\b/i.test(text)) return true;
    if (/\bdemo\b/i.test(text)) return true;
  }
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

export interface ViewableSchoolsOptions {
  /** School-role users may still see their own school when it is a test/demo entry. */
  retainSchoolId?: string | null;
}

/** Schools shown in directory views (excludes test/demo/vendor entries unless retained). */
export function filterViewableSchools<T extends Pick<School, 'id' | 'name'>>(
  schools: T[],
  options: ViewableSchoolsOptions = {},
): T[] {
  const retainId = options.retainSchoolId?.trim();
  return schools.filter(
    s => !isExcludedFromProgramStats(s) || (retainId !== undefined && retainId !== '' && s.id === retainId),
  );
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
  /** Normalized counsellor display names marked inactive (portal overrides + disabled Dataverse users). */
  names: ReadonlySet<string>;
}

export function emptyDeactivatedCounsellorKeys(): DeactivatedCounsellorKeys {
  return { ownerIds: new Set(), emails: new Set(), names: new Set() };
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

  return { ownerIds, emails, names: new Set() };
}

export function isDeactivatedCounsellor(
  identity: { ownerId?: string | null; email?: string | null; name?: string | null },
  deactivated: DeactivatedCounsellorKeys,
): boolean {
  const ownerId = identity.ownerId?.trim().toLowerCase();
  if (ownerId && deactivated.ownerIds.has(ownerId)) return true;
  const email = identity.email?.trim().toLowerCase();
  if (email && deactivated.emails.has(email)) return true;
  const name = identity.name?.trim().toLowerCase();
  if (name && deactivated.names.has(name)) return true;
  return false;
}

/** Dataverse-disabled counsellors (`systemuser.isdisabled = true`). */
export function buildDataverseDisabledCounsellorKeys(ownerMap: OwnerLookup): DeactivatedCounsellorKeys {
  const ownerIds = new Set<string>();
  const emails = new Set<string>();
  const names = new Set<string>();

  for (const [ownerId, identity] of ownerMap) {
    if (!identity.isDisabled) continue;
    ownerIds.add(ownerId);
    const email = identity.email?.trim().toLowerCase();
    if (email) emails.add(email);
    const name = identity.name?.trim().toLowerCase();
    if (name) names.add(name);
  }

  return { ownerIds, emails, names };
}

export function mergeDeactivatedCounsellorKeys(
  ...keys: DeactivatedCounsellorKeys[]
): DeactivatedCounsellorKeys {
  const ownerIds = new Set<string>();
  const emails = new Set<string>();
  const names = new Set<string>();
  for (const keySet of keys) {
    for (const id of keySet.ownerIds) ownerIds.add(id);
    for (const email of keySet.emails) emails.add(email);
    for (const name of keySet.names) names.add(name);
  }
  return { ownerIds, emails, names };
}

export function resolveInactiveCounsellorKeys(
  teamMembers?: TeamMember[],
  ownerMap?: OwnerLookup,
  inactiveOverrides?: InactiveCounsellorOverride[],
): DeactivatedCounsellorKeys {
  const parts: DeactivatedCounsellorKeys[] = [];
  if (teamMembers?.length) parts.push(buildDeactivatedCounsellorKeys(teamMembers));
  if (ownerMap?.size) parts.push(buildDataverseDisabledCounsellorKeys(ownerMap));
  if (inactiveOverrides?.length) parts.push(buildInactiveCounsellorOverrideKeys(inactiveOverrides));
  if (!parts.length) return emptyDeactivatedCounsellorKeys();
  return mergeDeactivatedCounsellorKeys(...parts);
}

/** Portal-managed inactive counsellor overrides from `emci_inactive_counsellors`. */
export function buildInactiveCounsellorOverrideKeys(
  overrides: InactiveCounsellorOverride[],
): DeactivatedCounsellorKeys {
  const ownerIds = new Set<string>();
  const names = new Set<string>();
  for (const row of overrides) {
    const ownerId = row.dataverse_owner_id?.trim().toLowerCase();
    if (ownerId) ownerIds.add(ownerId);
    const name = row.display_name?.trim().toLowerCase();
    if (name) names.add(name);
  }
  return { ownerIds, emails: new Set(), names };
}

export interface CounsellorRosterEntry {
  id: string;
  name: string;
  ownerId?: string;
  email?: string;
  isInactive: boolean;
}

/** Stable counsellor identity key — Dataverse owner GUID only. */
export function counsellorRosterKey(student: Student): string | null {
  const ownerId = student.counsellorOwnerId?.trim().toLowerCase();
  if (!ownerId) return null;
  return `id:${ownerId}`;
}

export function studentBelongsToCounsellorRoster(
  student: Student,
  rosterId: string,
): boolean {
  const key = counsellorRosterKey(student);
  return key !== null && key === rosterId;
}

export function filterStudentsForCounsellorRoster(
  students: Student[],
  rosterId: string,
): Student[] {
  return students.filter(s => studentBelongsToCounsellorRoster(s, rosterId));
}

function isCounsellorInactiveInDataverse(
  identity: { ownerId?: string; email?: string; name?: string },
  ownerMap: OwnerLookup,
  inactiveKeys: DeactivatedCounsellorKeys,
): boolean {
  if (isDeactivatedCounsellor(identity, inactiveKeys)) return true;
  const ownerId = identity.ownerId?.trim().toLowerCase();
  if (ownerId) {
    const entry = ownerMap.get(ownerId);
    if (entry?.isDisabled) return true;
  }
  const email = identity.email?.trim().toLowerCase();
  if (email) {
    for (const entry of ownerMap.values()) {
      if (entry.email === email && entry.isDisabled) return true;
    }
  }
  return false;
}

/** Unique counsellors from student assignments, excluding test/demo identities. */
export function deriveCounsellorRoster(
  students: Student[],
  ownerMap: OwnerLookup = new Map(),
  inactiveKeys: DeactivatedCounsellorKeys = emptyDeactivatedCounsellorKeys(),
): CounsellorRosterEntry[] {
  const byKey = new Map<string, CounsellorRosterEntry>();

  for (const student of students) {
    if (isExcludedTestCounsellor({ name: student.counsellor, email: student.counsellorEmail })) {
      continue;
    }

    const key = counsellorRosterKey(student);
    if (!key) continue;

    if (byKey.has(key)) continue;

    const ownerId = student.counsellorOwnerId!.trim().toLowerCase();
    const email = student.counsellorEmail?.trim().toLowerCase();
    const name =
      student.counsellor?.trim()
      ?? ownerMap.get(ownerId)?.name?.trim()
      ?? 'Unknown counsellor';
    const identity = { ownerId, email, name };

    byKey.set(key, {
      id: key,
      name,
      ownerId,
      email,
      isInactive: isCounsellorInactiveInDataverse(identity, ownerMap, inactiveKeys),
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.isInactive !== b.isInactive) return a.isInactive ? 1 : -1;
    return a.name.localeCompare(b.name, 'en-AU', { sensitivity: 'base' });
  });
}
