// EMCI Role-Based Access Control
// Six roles across three groups — each with a staff and admin sub-role.

export type AppRole =
  | 'acce_admin'
  | 'acce_staff'
  | 'school_admin'
  | 'school_staff'
  | 'de_admin'
  | 'de_staff';

export type RoleGroup = 'acce' | 'school' | 'de';

export type Page =
  | 'network'
  | 'school'
  | 'student'
  | 'pdf'
  | 'counsellors'
  | 'devlab'
  | 'surveysearch'
  | 'studentsearch'
  | 'team';

// ── Group helpers ─────────────────────────────────────────────────────────────

export function getRoleGroup(role: AppRole): RoleGroup {
  if (role === 'acce_admin' || role === 'acce_staff') return 'acce';
  if (role === 'school_admin' || role === 'school_staff') return 'school';
  return 'de';
}

export function isAdminRole(role: AppRole): boolean {
  return role === 'acce_admin' || role === 'school_admin' || role === 'de_admin';
}

// ── Display labels ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<AppRole, string> = {
  acce_admin:   'ACCE Admin',
  acce_staff:   'ACCE Staff',
  school_admin: 'School Admin',
  school_staff: 'School Staff',
  de_admin:     'DE Admin',
  de_staff:     'DE Staff',
};

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  acce:   'ACCE',
  school: 'School',
  de:     'Department of Education',
};

// ── Page-level permission gate ────────────────────────────────────────────────

export function canAccessPage(role: AppRole, page: Page): boolean {
  const group = getRoleGroup(role);
  switch (page) {
    case 'network':       return true;
    case 'school':        return group === 'acce' || group === 'school';
    // School roles can VIEW the student journey for their own students (read-only).
    // PDF export and write actions remain ACCE-only via separate gates.
    // DE: read-only redacted journey (no write / PDF).
    case 'student':       return group === 'acce' || group === 'school' || group === 'de';
    case 'pdf':           return group === 'acce';
    case 'counsellors':   return group === 'acce';
    case 'devlab':        return group === 'acce';
    case 'surveysearch':  return group === 'acce';
    case 'studentsearch': return group === 'acce';
    case 'team':          return isAdminRole(role);
  }
}

// ── Data-level permission helpers ─────────────────────────────────────────────

/** Structured student PII (name, Morrisby, email, year line, counsellor on profile). */
export function canSeeStudentNames(role: AppRole): boolean {
  return getRoleGroup(role) !== 'de';
}

/** Student roster (anonymized for DE). */
export function canViewStudentRoster(role: AppRole): boolean {
  return true;
}

/** Only ACCE roles can access write operations. */
export function canWrite(role: AppRole): boolean {
  return getRoleGroup(role) === 'acce';
}

/** Roles that can manage team members. */
export function canManageTeam(role: AppRole): boolean {
  return isAdminRole(role);
}

/** Which roles a given admin can assign. acce_admin can assign any; scoped admins only their group. */
export function assignableRoles(role: AppRole): AppRole[] {
  if (role === 'acce_admin') {
    return ['acce_admin', 'acce_staff', 'school_admin', 'school_staff', 'de_admin', 'de_staff'];
  }
  if (role === 'school_admin') return ['school_admin', 'school_staff'];
  if (role === 'de_admin')     return ['de_admin', 'de_staff'];
  return [];
}
