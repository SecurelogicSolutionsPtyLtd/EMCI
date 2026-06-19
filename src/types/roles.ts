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
  | 'team'
  | 'de_analytics';

/** Dataverse counsellor identity used to scope acce_staff to their own students. */
export interface CounsellorScope {
  email:   string | null;
  ownerId: string | null;
}

export function hasCounsellorScope(scope: CounsellorScope | null | undefined): boolean {
  if (!scope) return false;
  return Boolean(scope.email?.trim() || scope.ownerId?.trim());
}

/** True when an ACCE user (not admin) is limited to their own counsellor-owned cohort. */
export function isCounsellorScoped(role: AppRole, scope: CounsellorScope | null | undefined): boolean {
  if (role === 'acce_admin') return false;
  if (getRoleGroup(role) !== 'acce') return false;
  return hasCounsellorScope(scope);
}

/** Whether a student belongs to the signed-in counsellor's scope. */
export function studentMatchesCounsellorScope(
  student: { counsellorEmail?: string; counsellorOwnerId?: string },
  scope: CounsellorScope,
): boolean {
  const scopeEmail = scope.email?.trim().toLowerCase();
  if (scopeEmail) {
    const studentEmail = student.counsellorEmail?.trim().toLowerCase();
    if (studentEmail && studentEmail === scopeEmail) return true;
  }

  const scopeOwnerId = scope.ownerId?.trim().toLowerCase();
  if (scopeOwnerId) {
    const studentOwnerId = student.counsellorOwnerId?.trim().toLowerCase();
    if (studentOwnerId && studentOwnerId === scopeOwnerId) return true;
  }

  return false;
}

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

export function canAccessPage(role: AppRole, page: Page, counsellorScope?: CounsellorScope | null): boolean {
  if (isCounsellorScoped(role, counsellorScope)) {
    switch (page) {
      case 'devlab':
      case 'surveysearch':
      case 'studentsearch':
        return false;
      default:
        break;
    }
  }

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
    // Aggregated, de-identified analytics for DE oversight (ACCE can preview).
    case 'de_analytics':  return group === 'de' || group === 'acce';
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

/** Only ACCE Admin may trigger AI-powered features (analysis, rating, sentiment, chat). */
export function canUseAiFeatures(role: AppRole): boolean {
  return role === 'acce_admin';
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
