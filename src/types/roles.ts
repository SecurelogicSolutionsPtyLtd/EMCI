// EMCI Role-Based Access Control
// Seven roles — ACCE, School, DE groups plus SecureLogic super-admin.

export type AppRole =
  | 'securelogic_admin'
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

/** SecureLogic super-admin — full platform access including maintenance bypass. */
export function isSecureLogicAdmin(role: AppRole): boolean {
  return role === 'securelogic_admin';
}

/** ACCE Admin or SecureLogic Admin — network-wide team and settings access. */
export function isPlatformWideAdmin(role: AppRole): boolean {
  return role === 'acce_admin' || role === 'securelogic_admin';
}

/** Only SecureLogic Admin may toggle maintenance mode in Team Management. */
export function canManageMaintenance(role: AppRole): boolean {
  return role === 'securelogic_admin';
}

/** Only SecureLogic Admin bypasses the maintenance lockout. */
export function canBypassMaintenance(role: AppRole | null | undefined): boolean {
  return role === 'securelogic_admin';
}

/** True when an ACCE user (not admin) is limited to their own counsellor-owned cohort. */
export function isCounsellorScoped(role: AppRole, scope: CounsellorScope | null | undefined): boolean {
  if (isPlatformWideAdmin(role)) return false;
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
  if (role === 'securelogic_admin' || role === 'acce_admin' || role === 'acce_staff') return 'acce';
  if (role === 'school_admin' || role === 'school_staff') return 'school';
  return 'de';
}

export function isAdminRole(role: AppRole): boolean {
  return isPlatformWideAdmin(role) || role === 'school_admin' || role === 'de_admin';
}

// ── Display labels ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<AppRole, string> = {
  securelogic_admin: 'SecureLogic Admin',
  acce_admin:        'ACCE Admin',
  acce_staff:        'ACCE Staff',
  school_admin:      'School Admin',
  school_staff:      'School Staff',
  de_admin:          'DE Admin',
  de_staff:          'DE Staff',
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
    case 'student':       return group === 'acce' || group === 'school' || group === 'de';
    case 'pdf':           return group === 'acce';
    case 'counsellors':   return group === 'acce';
    case 'devlab':        return group === 'acce';
    case 'surveysearch':  return group === 'acce';
    case 'studentsearch': return group === 'acce';
    case 'team':          return isAdminRole(role);
    case 'de_analytics':  return group === 'de' || group === 'acce';
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
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

/** Only ACCE-tier roles can access write operations. */
export function canWrite(role: AppRole): boolean {
  return getRoleGroup(role) === 'acce';
}

/** Roles that can manage team members. */
export function canManageTeam(role: AppRole): boolean {
  return isAdminRole(role);
}

/** Platform admins may trigger AI-powered features (analysis, rating, sentiment, chat). */
export function canUseAiFeatures(role: AppRole): boolean {
  return isPlatformWideAdmin(role);
}

/** Which roles a given admin can assign. */
export function assignableRoles(role: AppRole): AppRole[] {
  if (role === 'securelogic_admin') {
    return [
      'securelogic_admin',
      'acce_admin',
      'acce_staff',
      'school_admin',
      'school_staff',
      'de_admin',
      'de_staff',
    ];
  }
  if (role === 'acce_admin') {
    return ['acce_admin', 'acce_staff', 'school_admin', 'school_staff', 'de_admin', 'de_staff'];
  }
  if (role === 'school_admin') return ['school_admin', 'school_staff'];
  if (role === 'de_admin')     return ['de_admin', 'de_staff'];
  return [];
}
