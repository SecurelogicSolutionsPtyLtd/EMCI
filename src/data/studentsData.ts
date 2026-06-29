export type StageKey = 'referral' | 'consent' | 'career_guidance' | 'complete' | null;

/** Decoded bucket for Dataverse `cr89a_yearlevel` option **1003** ("15+"); filters with 9 and 10. */
export const YEAR_LEVEL_PLUS_BUCKET = 15;

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  /** Dataverse `cr89a_studentname` — used for redaction pattern matching. */
  studentName?: string;
  email?: string;
  /** Decoded from `cr89a_yearlevel` picklist (9, 10, or {@link YEAR_LEVEL_PLUS_BUCKET} for "15+"). */
  yearLevel: number;
  /** Dataverse formatted label (e.g. "Year 9", "15+", "EMCI 2025 Students (Y9)"). */
  yearLevelLabel?: string;
  morrisbyId: string;
  status: 'Active' | 'Inactive' | 'Pending';
  currentStage: StageKey;
  stageProgress: number; // 0-4
  riskLevel: 'low' | 'medium' | 'high' | 'none';
  /** Count of linked absence records (Dataverse). */
  absenceCount: number;
  /** Count of linked EMCI session records (Dataverse); set in enrichStudents. */
  sessionCount?: number;
  /** True when the student has ≥2 EMCI sessions and P5-T3 CRM creation grace period has elapsed; set in App. */
  scoreEligible?: boolean;
  counsellor: string;
  /** Dataverse `systemuser` GUID for the student record owner (`_ownerid_value`). */
  counsellorOwnerId?: string;
  /** Dataverse owner email when available (`internalemailaddress` / `domainname`). */
  counsellorEmail?: string;
  interviewed: boolean;
  hasProfile: boolean;
  studentType: string;
  lastActivity: string;
  /** Dataverse `createdon` — when the student record was created in the CRM. */
  createdAt?: string;
  avatar?: string;
  schoolId?: string;
  /** Dataverse choice value for deactivation reason (read-only in EMCI; maintained in Dataverse / automation). */
  studentDeactivation?: number | null;
  studentDeactivationLabel?: string | null;
  studentDeactivationAt?: string | null;
  /** Year group label captured at deactivation (flow-populated). */
  studentDeactivationYearGroupSnapshot?: string | null;
}

/** Single-line year / cohort for headers, PDF, and profile (prefers Dataverse label). */
export function formatYearLevelLine(
  student: Pick<Student, 'yearLevel' | 'yearLevelLabel'> | null | undefined,
): string {
  if (!student) return '—';
  const label = student.yearLevelLabel?.trim();
  if (label) return label;
  const y = student.yearLevel;
  if (!y) return '—';
  if (y === YEAR_LEVEL_PLUS_BUCKET) return '15+';
  return `Year ${y}`;
}

const AT_RISK_TYPE_PATTERN = /^at[\s-]?risk$/i;

/** User-facing studentType label; maps legacy "At Risk" values to Follow Up. */
export function formatStudentTypeLabel(studentType: string | undefined | null): string {
  if (!studentType?.trim()) return '—';
  return studentType
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => (AT_RISK_TYPE_PATTERN.test(part) ? 'Follow Up' : part))
    .join('; ');
}

/** User-facing label for follow-up severity (legacy `riskLevel` field). */
export function formatFollowUpLevelLabel(level: string | undefined | null): string {
  if (!level?.trim()) return '—';
  switch (level.trim().toLowerCase()) {
    case 'none':
      return 'None';
    case 'low':
      return 'Low';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
    default:
      return level.charAt(0).toUpperCase() + level.slice(1);
  }
}

export const schoolStudents: Student[] = [
  {
    id: 'stu-1',
    firstName: 'Aanya',
    lastName: 'Bhatt',
    preferredName: undefined,
    email: undefined,
    yearLevel: 9,
    morrisbyId: 'ASSM',
    status: 'Active',
    currentStage: 'complete',
    stageProgress: 4,
    riskLevel: 'none',
    absenceCount: 0,
    counsellor: 'Dr. Aris Thorne',
    interviewed: true,
    hasProfile: true,
    studentType: 'Standard',
    lastActivity: '2025-08-20',
    avatar: 'https://picsum.photos/seed/aanya/100/100',
  },
  {
    id: 'stu-2',
    firstName: 'Luca',
    lastName: 'Martino',
    yearLevel: 10,
    morrisbyId: 'ASLM',
    status: 'Active',
    currentStage: 'career_guidance',
    stageProgress: 3,
    riskLevel: 'medium',
    absenceCount: 3,
    counsellor: 'Dr. Aris Thorne',
    interviewed: true,
    hasProfile: true,
    studentType: 'Standard',
    lastActivity: '2025-11-03',
    avatar: 'https://picsum.photos/seed/luca/100/100',
  },
  {
    id: 'stu-3',
    firstName: 'Priya',
    lastName: 'Nair',
    preferredName: 'Pri',
    yearLevel: 9,
    morrisbyId: 'ASPN',
    status: 'Active',
    currentStage: 'consent',
    stageProgress: 2,
    riskLevel: 'low',
    absenceCount: 1,
    counsellor: 'Dr. Aris Thorne',
    interviewed: false,
    hasProfile: false,
    studentType: 'Standard',
    lastActivity: '2025-09-18',
    avatar: 'https://picsum.photos/seed/priya/100/100',
  },
  {
    id: 'stu-4',
    firstName: 'Ethan',
    lastName: 'Cole',
    yearLevel: 9,
    morrisbyId: 'ASEC',
    status: 'Active',
    currentStage: 'referral',
    stageProgress: 1,
    riskLevel: 'high',
    absenceCount: 6,
    counsellor: 'Dr. Aris Thorne',
    interviewed: false,
    hasProfile: false,
    studentType: 'At Risk',
    lastActivity: '2025-10-05',
    avatar: 'https://picsum.photos/seed/ethan/100/100',
  },
  {
    id: 'stu-5',
    firstName: 'Sofia',
    lastName: 'Andersson',
    yearLevel: 10,
    morrisbyId: 'ASSA',
    status: 'Active',
    currentStage: 'career_guidance',
    stageProgress: 3,
    riskLevel: 'low',
    absenceCount: 1,
    counsellor: 'Ms. Cleo Park',
    interviewed: true,
    hasProfile: true,
    studentType: 'Standard',
    lastActivity: '2025-11-20',
    avatar: 'https://picsum.photos/seed/sofia/100/100',
  },
  {
    id: 'stu-6',
    firstName: 'Remy',
    lastName: 'Dubois',
    preferredName: 'Rem',
    yearLevel: 9,
    morrisbyId: 'ASRD',
    status: 'Inactive',
    currentStage: null,
    stageProgress: 0,
    riskLevel: 'none',
    absenceCount: 0,
    counsellor: 'Ms. Cleo Park',
    interviewed: false,
    hasProfile: false,
    studentType: 'Standard',
    lastActivity: '2025-07-01',
    avatar: 'https://picsum.photos/seed/remy/100/100',
  },
  {
    id: 'stu-7',
    firstName: 'Mei',
    lastName: 'Zhang',
    yearLevel: 10,
    morrisbyId: 'ASMZ',
    status: 'Active',
    currentStage: 'complete',
    stageProgress: 4,
    riskLevel: 'none',
    absenceCount: 0,
    counsellor: 'Ms. Cleo Park',
    interviewed: true,
    hasProfile: true,
    studentType: 'Standard',
    lastActivity: '2025-12-10',
    avatar: 'https://picsum.photos/seed/mei/100/100',
  },
  {
    id: 'stu-8',
    firstName: 'Oliver',
    lastName: 'Mensah',
    yearLevel: 10,
    morrisbyId: 'ASOM',
    status: 'Pending',
    currentStage: null,
    stageProgress: 0,
    riskLevel: 'medium',
    absenceCount: 3,
    counsellor: 'Dr. Aris Thorne',
    interviewed: false,
    hasProfile: false,
    studentType: 'At Risk',
    lastActivity: '2025-08-15',
    avatar: 'https://picsum.photos/seed/oliver/100/100',
  },
];
