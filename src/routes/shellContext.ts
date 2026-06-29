import type { Student } from '../data/studentsData';
import type { School } from '../data/networkData';
import type { AppRole } from '../types/roles';
import type { TimelineEvent, OwnerLookup } from '../services/dataverse';
import type { TeamMember, InactiveCounsellorOverride } from '../services/supabase';

export interface AppShellOutletContext {
  students: Student[];
  schools: School[];
  userRole: AppRole;
  token: string;
  loadData: (tok: string) => Promise<Student[] | null>;
  dataError: string | null;
  studentEventsMap: Record<string, TimelineEvent[]>;
  teamMembers: TeamMember[];
  ownerMap: OwnerLookup;
  inactiveCounsellorOverrides: InactiveCounsellorOverride[];
}
