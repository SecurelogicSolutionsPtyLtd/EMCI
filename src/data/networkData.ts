import type { Student } from './studentsData';

export interface School {
  id: string;
  name: string;
  morrisbyId: string;
  region: string;
  principalContact: string;
  status: 'Active' | 'Onboarding' | 'Inactive';
  joinedYear: number;
  avatar: string;
}

export interface Counsellor {
  id: string;
  name: string;
  role: string;
  schoolIds: string[];
  avatar: string;
  email: string;
}

export const schools: School[] = [
  {
    id: 'school-1',
    name: 'Ashwood School',
    morrisbyId: 'ASSM',
    region: 'Inner East',
    principalContact: 'Ms. Helena Ward',
    status: 'Active',
    joinedYear: 2024,
    avatar: 'https://picsum.photos/seed/ashwood/80/80',
  },
  {
    id: 'school-2',
    name: 'Riverside Secondary College',
    morrisbyId: 'RSCO',
    region: 'Northern',
    principalContact: 'Mr. James Okoro',
    status: 'Active',
    joinedYear: 2024,
    avatar: 'https://picsum.photos/seed/riverside/80/80',
  },
  {
    id: 'school-3',
    name: 'St. Jude\'s Academy',
    morrisbyId: 'STJA',
    region: 'Southern',
    principalContact: 'Dr. Fiona Cheng',
    status: 'Active',
    joinedYear: 2023,
    avatar: 'https://picsum.photos/seed/stjudes/80/80',
  },
  {
    id: 'school-4',
    name: 'Bayside Grammar',
    morrisbyId: 'BAYG',
    region: 'South East',
    principalContact: 'Mr. Tom Russo',
    status: 'Onboarding',
    joinedYear: 2025,
    avatar: 'https://picsum.photos/seed/bayside/80/80',
  },
  {
    id: 'school-5',
    name: 'Greenfield College',
    morrisbyId: 'GRNF',
    region: 'Western',
    principalContact: 'Ms. Preethi Saran',
    status: 'Active',
    joinedYear: 2023,
    avatar: 'https://picsum.photos/seed/greenfield/80/80',
  },
  {
    id: 'school-6',
    name: 'Northgate High School',
    morrisbyId: 'NRTH',
    region: 'Northern',
    principalContact: 'Mr. Callum Brooks',
    status: 'Inactive',
    joinedYear: 2023,
    avatar: 'https://picsum.photos/seed/northgate/80/80',
  },
];

export const counsellors: Counsellor[] = [
  {
    id: 'coun-1',
    name: 'Dr. Aris Thorne',
    role: 'Senior EMCI Counsellor',
    schoolIds: ['school-1', 'school-2'],
    avatar: 'https://picsum.photos/seed/counsellor/100/100',
    email: 'a.thorne@emci.edu.au',
  },
  {
    id: 'coun-2',
    name: 'Ms. Cleo Park',
    role: 'EMCI Counsellor',
    schoolIds: ['school-1', 'school-3'],
    avatar: 'https://picsum.photos/seed/cleo/100/100',
    email: 'c.park@emci.edu.au',
  },
  {
    id: 'coun-3',
    name: 'Mr. Ben Osei',
    role: 'EMCI Counsellor',
    schoolIds: ['school-2', 'school-4'],
    avatar: 'https://picsum.photos/seed/benosei/100/100',
    email: 'b.osei@emci.edu.au',
  },
  {
    id: 'coun-4',
    name: 'Ms. Rachel Kim',
    role: 'Senior EMCI Counsellor',
    schoolIds: ['school-3', 'school-5', 'school-6'],
    avatar: 'https://picsum.photos/seed/rachelkim/100/100',
    email: 'r.kim@emci.edu.au',
  },
];

// Extended students across all schools (school-1 = Ashwood = existing students)
export interface NetworkStudent extends Omit<Student, 'avatar'> {
  schoolId: string;
  avatar?: string;
}

export const networkStudents: NetworkStudent[] = [
  // Ashwood (school-1) — existing 8
  { id: 'stu-1',  schoolId: 'school-1', firstName: 'Aanya',   lastName: 'Bhatt',      yearLevel: 9,  morrisbyId: 'ASSM', status: 'Active',   currentStage: 'complete',        stageProgress: 4, riskLevel: 'none',   absenceCount: 0, counsellor: 'Dr. Aris Thorne', interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-08-20', avatar: 'https://picsum.photos/seed/aanya/100/100'   },
  { id: 'stu-2',  schoolId: 'school-1', firstName: 'Luca',    lastName: 'Martino',    yearLevel: 10, morrisbyId: 'ASLM', status: 'Active',   currentStage: 'career_guidance', stageProgress: 3, riskLevel: 'medium', absenceCount: 3, counsellor: 'Dr. Aris Thorne', interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-11-03', avatar: 'https://picsum.photos/seed/luca/100/100'    },
  { id: 'stu-3',  schoolId: 'school-1', firstName: 'Priya',   lastName: 'Nair',       yearLevel: 9,  morrisbyId: 'ASPN', status: 'Active',   currentStage: 'consent',         stageProgress: 2, riskLevel: 'low',    absenceCount: 1, counsellor: 'Dr. Aris Thorne', interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-09-18', avatar: 'https://picsum.photos/seed/priya/100/100'   },
  { id: 'stu-4',  schoolId: 'school-1', firstName: 'Ethan',   lastName: 'Cole',       yearLevel: 9,  morrisbyId: 'ASEC', status: 'Active',   currentStage: 'referral',        stageProgress: 1, riskLevel: 'high',   absenceCount: 6, counsellor: 'Dr. Aris Thorne', interviewed: false, hasProfile: false, studentType: 'At Risk',  lastActivity: '2025-10-05', avatar: 'https://picsum.photos/seed/ethan/100/100'   },
  { id: 'stu-5',  schoolId: 'school-1', firstName: 'Sofia',   lastName: 'Andersson',  yearLevel: 10, morrisbyId: 'ASSA', status: 'Active',   currentStage: 'career_guidance', stageProgress: 3, riskLevel: 'low',    absenceCount: 1, counsellor: 'Ms. Cleo Park',   interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-11-20', avatar: 'https://picsum.photos/seed/sofia/100/100'   },
  { id: 'stu-6',  schoolId: 'school-1', firstName: 'Remy',    lastName: 'Dubois',     yearLevel: 9,  morrisbyId: 'ASRD', status: 'Inactive', currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Cleo Park',   interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-07-01', avatar: 'https://picsum.photos/seed/remy/100/100'    },
  { id: 'stu-7',  schoolId: 'school-1', firstName: 'Mei',     lastName: 'Zhang',      yearLevel: 10, morrisbyId: 'ASMZ', status: 'Active',   currentStage: 'complete',        stageProgress: 4, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Cleo Park',   interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-12-10', avatar: 'https://picsum.photos/seed/mei/100/100'     },
  { id: 'stu-8',  schoolId: 'school-1', firstName: 'Oliver',  lastName: 'Mensah',     yearLevel: 10, morrisbyId: 'ASOM', status: 'Pending',  currentStage: null,              stageProgress: 0, riskLevel: 'medium', absenceCount: 3, counsellor: 'Dr. Aris Thorne', interviewed: false, hasProfile: false, studentType: 'At Risk',  lastActivity: '2025-08-15', avatar: 'https://picsum.photos/seed/oliver/100/100'  },
  // Riverside (school-2)
  { id: 'stu-9',  schoolId: 'school-2', firstName: 'Jasmine', lastName: 'Torres',     yearLevel: 9,  morrisbyId: 'RSJT', status: 'Active',   currentStage: 'complete',        stageProgress: 4, riskLevel: 'none',   absenceCount: 0, counsellor: 'Dr. Aris Thorne', interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-09-01', avatar: 'https://picsum.photos/seed/jasmine/100/100' },
  { id: 'stu-10', schoolId: 'school-2', firstName: 'Noah',    lastName: 'Williams',   yearLevel: 10, morrisbyId: 'RSNW', status: 'Active',   currentStage: 'career_guidance', stageProgress: 3, riskLevel: 'low',    absenceCount: 1, counsellor: 'Dr. Aris Thorne', interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-10-14', avatar: 'https://picsum.photos/seed/noah/100/100'    },
  { id: 'stu-11', schoolId: 'school-2', firstName: 'Isla',    lastName: 'Nguyen',     yearLevel: 9,  morrisbyId: 'RSIN', status: 'Active',   currentStage: 'consent',         stageProgress: 2, riskLevel: 'medium', absenceCount: 3, counsellor: 'Mr. Ben Osei',    interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-11-05', avatar: 'https://picsum.photos/seed/isla/100/100'    },
  { id: 'stu-12', schoolId: 'school-2', firstName: 'Kai',     lastName: 'Murphy',     yearLevel: 10, morrisbyId: 'RSKM', status: 'Pending',  currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Mr. Ben Osei',    interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-08-20', avatar: 'https://picsum.photos/seed/kaimurphy/100/100'},
  { id: 'stu-13', schoolId: 'school-2', firstName: 'Amara',   lastName: 'Diallo',     yearLevel: 9,  morrisbyId: 'RSAD', status: 'Active',   currentStage: 'referral',        stageProgress: 1, riskLevel: 'high',   absenceCount: 6, counsellor: 'Mr. Ben Osei',    interviewed: false, hasProfile: false, studentType: 'At Risk',  lastActivity: '2025-12-01', avatar: 'https://picsum.photos/seed/amara/100/100'   },
  // St. Jude's (school-3)
  { id: 'stu-14', schoolId: 'school-3', firstName: 'Hugo',    lastName: 'Fernandez',  yearLevel: 10, morrisbyId: 'SJHF', status: 'Active',   currentStage: 'complete',        stageProgress: 4, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Cleo Park',   interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-07-30', avatar: 'https://picsum.photos/seed/hugo/100/100'    },
  { id: 'stu-15', schoolId: 'school-3', firstName: 'Zara',    lastName: 'Ahmed',      yearLevel: 9,  morrisbyId: 'SJZA', status: 'Active',   currentStage: 'career_guidance', stageProgress: 3, riskLevel: 'low',    absenceCount: 1, counsellor: 'Ms. Rachel Kim',  interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-11-18', avatar: 'https://picsum.photos/seed/zara/100/100'    },
  { id: 'stu-16', schoolId: 'school-3', firstName: 'Marcus',  lastName: 'Hall',       yearLevel: 9,  morrisbyId: 'SJMH', status: 'Active',   currentStage: 'consent',         stageProgress: 2, riskLevel: 'low',    absenceCount: 1, counsellor: 'Ms. Rachel Kim',  interviewed: true,  hasProfile: false, studentType: 'Standard', lastActivity: '2025-10-22', avatar: 'https://picsum.photos/seed/marcus/100/100'  },
  { id: 'stu-17', schoolId: 'school-3', firstName: 'Nina',    lastName: 'Petrov',     yearLevel: 10, morrisbyId: 'SJNP', status: 'Inactive', currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Cleo Park',   interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-06-15', avatar: 'https://picsum.photos/seed/nina/100/100'    },
  // Bayside (school-4) — onboarding, fewer students
  { id: 'stu-18', schoolId: 'school-4', firstName: 'Caleb',   lastName: 'Jensen',     yearLevel: 9,  morrisbyId: 'BYCJ', status: 'Pending',  currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Mr. Ben Osei',    interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-12-01', avatar: 'https://picsum.photos/seed/caleb/100/100'   },
  { id: 'stu-19', schoolId: 'school-4', firstName: 'Lily',    lastName: 'Tran',       yearLevel: 10, morrisbyId: 'BYLT', status: 'Pending',  currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Mr. Ben Osei',    interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-12-01', avatar: 'https://picsum.photos/seed/lily/100/100'    },
  { id: 'stu-20', schoolId: 'school-4', firstName: 'Sam',     lastName: 'O\'Brien',   yearLevel: 9,  morrisbyId: 'BYSO', status: 'Pending',  currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Mr. Ben Osei',    interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-12-01', avatar: 'https://picsum.photos/seed/samob/100/100'   },
  // Greenfield (school-5)
  { id: 'stu-21', schoolId: 'school-5', firstName: 'Fatima',  lastName: 'Hassan',     yearLevel: 9,  morrisbyId: 'GRFH', status: 'Active',   currentStage: 'complete',        stageProgress: 4, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Rachel Kim',  interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-08-10', avatar: 'https://picsum.photos/seed/fatima/100/100'  },
  { id: 'stu-22', schoolId: 'school-5', firstName: 'Dylan',   lastName: 'Ross',       yearLevel: 10, morrisbyId: 'GRDR', status: 'Active',   currentStage: 'career_guidance', stageProgress: 3, riskLevel: 'medium', absenceCount: 3, counsellor: 'Ms. Rachel Kim',  interviewed: true,  hasProfile: true,  studentType: 'Standard', lastActivity: '2025-11-30', avatar: 'https://picsum.photos/seed/dylan/100/100'   },
  { id: 'stu-23', schoolId: 'school-5', firstName: 'Aiden',   lastName: 'Lee',        yearLevel: 9,  morrisbyId: 'GRAL', status: 'Active',   currentStage: 'referral',        stageProgress: 1, riskLevel: 'low',    absenceCount: 1, counsellor: 'Ms. Rachel Kim',  interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-10-03', avatar: 'https://picsum.photos/seed/aiden/100/100'   },
  // Northgate (school-6) — inactive school
  { id: 'stu-24', schoolId: 'school-6', firstName: 'Sara',    lastName: 'Eriksen',    yearLevel: 10, morrisbyId: 'NRSE', status: 'Inactive', currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Rachel Kim',  interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-05-20', avatar: 'https://picsum.photos/seed/sara/100/100'    },
  { id: 'stu-25', schoolId: 'school-6', firstName: 'Jonah',   lastName: 'Blake',      yearLevel: 9,  morrisbyId: 'NRJB', status: 'Inactive', currentStage: null,              stageProgress: 0, riskLevel: 'none',   absenceCount: 0, counsellor: 'Ms. Rachel Kim',  interviewed: false, hasProfile: false, studentType: 'Standard', lastActivity: '2025-05-20', avatar: 'https://picsum.photos/seed/jonah/100/100'   },
];
