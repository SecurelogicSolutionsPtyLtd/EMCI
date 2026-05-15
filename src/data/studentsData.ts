export type StageKey = 'referral' | 'consent' | 'career_guidance' | 'complete' | null;

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  yearLevel: number;       // Numeric year (9, 10, 11, 12) decoded from raw picklist code
  yearLevelLabel?: string; // Raw Dataverse formatted label, e.g. "EMCI 2024 Students (Y9)"
  morrisbyId: string;
  status: 'Active' | 'Inactive' | 'Pending';
  currentStage: StageKey;
  stageProgress: number; // 0-4
  riskLevel: 'low' | 'medium' | 'high' | 'none';
  /** Count of linked absence records (Dataverse); demo seeds align with risk tiers. */
  absenceCount: number;
  counsellor: string;
  interviewed: boolean;
  hasProfile: boolean;
  studentType: string;
  lastActivity: string;
  avatar?: string;
  schoolId?: string;
  /** Dataverse choice value for deactivation reason (read-only in EMCI; maintained in Dataverse / automation). */
  studentDeactivation?: number | null;
  studentDeactivationLabel?: string | null;
  studentDeactivationAt?: string | null;
  /** Year group label captured at deactivation (flow-populated). */
  studentDeactivationYearGroupSnapshot?: string | null;
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
