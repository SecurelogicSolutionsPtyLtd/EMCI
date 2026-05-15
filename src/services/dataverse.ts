import type { Student, StageKey } from '../data/studentsData';
import type { School } from '../data/networkData';
export type {
  RawInitialSurvey,
  RawInitialSurvey2026,
  RawMidPilotStudentSurvey,
  RawMidPilotSchoolSurvey,
  RawEndOfPilotSurveyLegacy,
  RawEndOfPilotSurvey2026,
} from './surveyTypes';
import type {
  RawInitialSurvey,
  RawInitialSurvey2026,
  RawMidPilotStudentSurvey,
  RawMidPilotSchoolSurvey,
  RawEndOfPilotSurveyLegacy,
  RawEndOfPilotSurvey2026,
} from './surveyTypes';
export type { SurveyField } from './surveyFields';
import {
  buildSessionFields,
  buildInitialSurveyLegacyFields,
  buildInitialSurvey2026Fields,
  buildMidPilotStudentFields,
  buildEndOfPilotLegacyFields,
  buildEndOfPilotSurvey2026Fields,
} from './surveyFields';
import type { SurveyField } from './surveyFields';

const BASE_URL = '/dataverse/api/data/v9.2';

// ── Option set decoders ────────────────────────────────────────────
// cr89a_yearlevel is a Picklist. The raw option code is the only reliable source
// for the numeric year — the FormattedValue label can be a cohort name like
// "EMCI 2024 Students (Y9)" which cannot be safely parsed for a year number.
//
// Known codes observed in production data:
//   1000 → Year 9
//   1001 → Year 10
//   1002 → EMCI 2024 Students (Y10) → 10
//   1003 → (Year 11, assumed)        → 11
//   1004 → EMCI 2025 Students (Y10) → 10
//   1005 → EMCI 2024 Students (Y9)  → 9
//
// Any unmapped code falls back to code - 1000 as a best-effort estimate.
const YEAR_LEVEL_CODE_MAP: Record<number, number> = {
  1000: 9,
  1001: 10,
  1002: 10,
  1003: 11,
  1004: 10,
  1005: 9,
};

function decodeYearLevel(val: number | null): number {
  if (val === null || val === undefined) return 0;
  if (val in YEAR_LEVEL_CODE_MAP) return YEAR_LEVEL_CODE_MAP[val];
  if (val >= 1000 && val <= 1099) return val - 1000;
  return val;
}

function decodeStatus(statecode: number, statuscode: number): 'Active' | 'Inactive' | 'Pending' {
  if (statecode === 0) {
    if (statuscode === 2) return 'Inactive';
    if (statuscode === 3) return 'Pending';
    return 'Active';
  }
  return 'Inactive';
}

function deriveStage(raw: RawStudent): StageKey {
  if (raw.cr89a_guidancecomplete)   return 'complete';
  if (raw.cr89a_guidanceinprogress) return 'career_guidance';
  if (raw.cr89a_consentobtained)    return 'consent';
  if (raw.cr89a_referralobtained)   return 'referral';
  return null;
}

function deriveProgress(raw: RawStudent): number {
  if (raw.cr89a_guidancecomplete)   return 4;
  if (raw.cr89a_guidanceinprogress) return 3;
  if (raw.cr89a_consentobtained)    return 2;
  if (raw.cr89a_referralobtained)   return 1;
  return 0;
}

// ── Raw Dataverse record shapes ────────────────────────────────────

interface RawStudent {
  cr89a_wlpcstudentid: string;
  cr89a_firstname: string | null;
  cr89a_lastname: string | null;
  cr89a_preferredname: string | null;
  cr89a_studentname: string | null;
  emailaddress: string | null;
  cr89a_yearlevel: number | null;
  'cr89a_yearlevel@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_registrationcode: string | null;
  _cr89a_wlpcschool_value: string | null;
  _ownerid_value: string | null;
  '_ownerid_value@OData.Community.Display.V1.FormattedValue'?: string | null;
  statecode: number;
  statuscode: number;
  cr89a_studentinterviewed: boolean;
  cr89a_studenthasaprofile: boolean;
  cr89a_referralobtained: boolean;
  cr89a_consentobtained: boolean;
  cr89a_guidanceinprogress: boolean;
  cr89a_guidancecomplete: boolean;
  new_studenttypemultiselect: string | null;
  'new_studenttypemultiselect@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_studenttype: string | null;
  cr89a_prioritycohort: string | null;
  cr89a_studentdeactivation: number | null;
  'cr89a_studentdeactivation@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_studentdeactivationtimestamp: string | null;
  cr89a_studentdeactivationyeargroup: string | null;
  modifiedon: string | null;
  createdon: string | null;
}

interface RawSchool {
  cr89a_wlpcschoolid: string;
  cr89a_name?: string | null;
  cr89a_schoolname?: string | null;
  cr89a_wlpcschoolname?: string | null;
  [key: string]: unknown;
  cr89a_region: string | null;
  cr89a_principalcontact: string | null;
  cr89a_morrisbyid: string | null;
  statecode: number;
  statuscode: number;
  createdon: string | null;
}

// All Activity-type entities share a common shape.
// The student is linked via _regardingobjectid_value (polymorphic activity lookup).
// The owner (counsellor) name is in the OData annotation on _ownerid_value.
// Exported so surveyTypes.ts can extend it without duplicating the base shape.
export interface RawActivity {
  activityid: string;
  subject: string | null;
  _regardingobjectid_value: string | null;
  '_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname'?: string | null;
  '_ownerid_value@OData.Community.Display.V1.FormattedValue'?: string | null;
  statecode: number;
  statuscode: number;
  createdon: string | null;
  modifiedon: string | null;
  actualend?: string | null;
  [key: string]: unknown;
}

// cr89a_wlpcsession specific fields
export interface RawSession extends RawActivity {
  cr89a_sessionlength: number | null;
  'cr89a_sessionlength@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_typeofintervention: number | null;
  'cr89a_typeofintervention@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_internalnotes: string | null;
  cr89a_externalsupportdetails: string | null;
  cr89a_intervention_ms: string | null;
  cr89a_interventionmorrisby_ms: string | null;
  cr89a_interventioncap_ms: string | null;
  cr89a_interventionindustryengagement_ms: string | null;
  cr89a_interventionwexpreparation_ms: string | null;
  cr89a_interventionworkreadiness_ms: string | null;
  cr89a_interventionother_ms: string | null;
}

// cr89a_emcistudentabsence specific fields
export interface RawAbsence extends RawActivity {
  cr89a_absencedate: string | null;
  cr89a_reasondropdown: number | null;
  'cr89a_reasondropdown@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_reasonifknown: string | null;
  cr89a_emcischoolnamedisplay: string | null;
}

// Survey type interfaces have been moved to ./surveyTypes.ts for readability.
// They are imported and re-exported at the top of this file.

// cr89a_wlpcstudentjourney — a Business Process Flow instance
export interface RawJourney {
  businessprocessflowinstanceid: string;
  bpf_name: string | null;
  _bpf_cr89a_wlpcstudentid_value: string | null;
  activestagestartedon: string | null;
  completedon: string | null;
  bpf_duration: number | null;
  statecode: number;
  statuscode: number;
  createdon: string | null;
  modifiedon: string | null;
}

// ── Helper: extract student ID from an activity record ─────────────
// Activity records link to a student via _regardingobjectid_value when
// the lookuplogicalname annotation confirms the target is cr89a_wlpcstudent.
function studentIdFromActivity(raw: RawActivity): string | null {
  const logicalName = raw['_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname'];
  if (logicalName === 'cr89a_wlpcstudent' || logicalName == null) {
    return raw._regardingobjectid_value ?? null;
  }
  return null;
}

// ── Mapper: RawStudent → Student ──────────────────────────────────
function mapStudent(raw: RawStudent): Student & { schoolId: string } {
  const stage = deriveStage(raw);

  const yearLevel      = decodeYearLevel(raw.cr89a_yearlevel);
  const yearLevelLabel = raw['cr89a_yearlevel@OData.Community.Display.V1.FormattedValue'] ?? undefined;

  return {
    id:            raw.cr89a_wlpcstudentid,
    firstName:     raw.cr89a_firstname  ?? '',
    lastName:      raw.cr89a_lastname   ?? '',
    preferredName: raw.cr89a_preferredname ?? undefined,
    email:         raw.emailaddress     ?? undefined,
    yearLevel,
    yearLevelLabel,
    morrisbyId:    raw.cr89a_registrationcode ?? raw.cr89a_wlpcstudentid.slice(0, 8).toUpperCase(),
    status:        decodeStatus(raw.statecode, raw.statuscode),
    currentStage:  stage,
    stageProgress: deriveProgress(raw),
    riskLevel:     'none',
    absenceCount:  0,
    counsellor:    raw['_ownerid_value@OData.Community.Display.V1.FormattedValue'] ?? '',
    interviewed:   raw.cr89a_studentinterviewed,
    hasProfile:    raw.cr89a_studenthasaprofile,
    studentType:   raw['new_studenttypemultiselect@OData.Community.Display.V1.FormattedValue'] ?? raw.new_studenttypemultiselect ?? 'Standard',
    lastActivity:  raw.modifiedon ?? raw.createdon ?? '',
    schoolId:      raw._cr89a_wlpcschool_value ?? '',
    studentDeactivation: raw.cr89a_studentdeactivation ?? null,
    studentDeactivationLabel:
      raw['cr89a_studentdeactivation@OData.Community.Display.V1.FormattedValue'] ?? null,
    studentDeactivationAt: raw.cr89a_studentdeactivationtimestamp ?? null,
    studentDeactivationYearGroupSnapshot: raw.cr89a_studentdeactivationyeargroup ?? null,
  };
}

// ── Mapper: RawSchool → School ────────────────────────────────────
function mapSchool(raw: RawSchool): School {
  const name: string =
    (raw.cr89a_name as string | null) ??
    (raw.cr89a_schoolname as string | null) ??
    (raw.cr89a_wlpcschoolname as string | null) ??
    (Object.entries(raw).find(
      ([k, v]) => k.toLowerCase().endsWith('name') && typeof v === 'string' && v.length > 0
    )?.[1] as string | undefined) ??
    'Unknown School';

  return {
    id:               raw.cr89a_wlpcschoolid,
    name,
    morrisbyId:       raw.cr89a_morrisbyid      ?? '',
    region:           raw.cr89a_region           ?? '',
    principalContact: raw.cr89a_principalcontact ?? '',
    status:           raw.statecode === 0 ? 'Active' : 'Inactive',
    joinedYear:       raw.createdon ? new Date(raw.createdon).getFullYear() : new Date().getFullYear(),
    avatar:           '',
  };
}

// ── API headers helper ─────────────────────────────────────────────
function dvHeaders(token: string): HeadersInit {
  return {
    'Authorization':    `Bearer ${token}`,
    'Accept':           'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version':    '4.0',
    'Prefer':           'odata.include-annotations="*"',
  };
}

// ── Generic activity fetch helper ─────────────────────────────────
// requireStudentLink:
//   true  (default) — keep only records with a non-null _regardingobjectid_value
//                     (safe for sessions/absences which always set "Regarding")
//   false           — return all records; let the per-student filter in App.tsx
//                     handle matching (needed for survey entities whose Dataverse
//                     forms may leave "Regarding" unpopulated)
async function fetchActivity<T extends RawActivity>(
  token: string,
  entitySet: string,
  errorLabel: string,
  requireStudentLink = true,
): Promise<T[]> {
  const all: T[] = [];
  let url: string | undefined = `${BASE_URL}/${entitySet}`;

  // Follow OData nextLink pages so large entity sets aren't truncated
  while (url) {
    const res = await fetch(url, { headers: dvHeaders(token) });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[EMCI] ${errorLabel} fetch failed (${res.status}): ${text.slice(0, 200)}`);
      return all;
    }
    const data = await res.json() as { value: T[]; '@odata.nextLink'?: string };
    all.push(...(data.value ?? []));
    url = data['@odata.nextLink'];
  }

  if (requireStudentLink) {
    return all.filter(row => row._regardingobjectid_value != null);
  }

  // Diagnostic: warn when ALL records lack a student link so the dev can spot it
  const linked = all.filter(r => r._regardingobjectid_value != null);
  console.log(
    `[EMCI] ${errorLabel}: ${all.length} records fetched, ${linked.length} have _regardingobjectid_value`,
  );
  if (all.length > 0 && linked.length === 0) {
    const sample = all[0];
    const candidateKeys = Object.keys(sample).filter(
      k => k.toLowerCase().includes('student') || k.toLowerCase().includes('regarding') || k.toLowerCase().includes('id'),
    );
    console.warn(
      `[EMCI] ${errorLabel}: no records have _regardingobjectid_value — possible custom student link field. Candidate keys:`,
      candidateKeys,
    );
  }

  return all;
}

// ── Fetch all students ─────────────────────────────────────────────
// new_studenttypemultiselect and cr89a_prioritycohort were removed — they use
// a different Dataverse solution publisher prefix (new_) or don't exist on all
// instances and cause 0x80060888 (unsupported query parameter) on $select.
// The mapper defaults gracefully: studentType falls back to 'Standard'.
const STUDENT_SELECT = [
  'cr89a_wlpcstudentid',
  'cr89a_firstname',
  'cr89a_lastname',
  'cr89a_preferredname',
  'cr89a_studentname',
  'emailaddress',
  'cr89a_yearlevel',
  'cr89a_registrationcode',
  '_cr89a_wlpcschool_value',
  '_ownerid_value',
  'statecode',
  'statuscode',
  'cr89a_studentinterviewed',
  'cr89a_studenthasaprofile',
  'cr89a_referralobtained',
  'cr89a_consentobtained',
  'cr89a_guidanceinprogress',
  'cr89a_guidancecomplete',
  'modifiedon',
  'createdon',
  'cr89a_studentdeactivation',
  'cr89a_studentdeactivationtimestamp',
  'cr89a_studentdeactivationyeargroup',
].join(',');

export async function fetchStudents(token: string): Promise<(Student & { schoolId: string })[]> {
  const url = `${BASE_URL}/cr89a_wlpcstudents?$select=${STUDENT_SELECT}`;
  const res  = await fetch(url, { headers: dvHeaders(token) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Students fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { value: RawStudent[] };
  return (data.value ?? []).map(mapStudent);
}

// ── Fetch all schools ──────────────────────────────────────────────
// No $select — the school name field varies across Dataverse environments
// (cr89a_schoolname vs cr89a_wlpcschoolname vs cr89a_name). The mapper
// resolves whichever field is present. See DATAVERSE_CONNECTION_REFERENCE.md §Entity 2.
export async function fetchSchools(token: string): Promise<School[]> {
  const url = `${BASE_URL}/cr89a_wlpcschools`;
  const res  = await fetch(url, { headers: dvHeaders(token) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Schools fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { value: RawSchool[] };
  return (data.value ?? []).map(mapSchool);
}

// ── Fetch sessions (cr89a_wlpcsessions) ───────────────────────────
export async function fetchSessions(token: string): Promise<RawSession[]> {
  return fetchActivity<RawSession>(token, 'cr89a_wlpcsessions', 'Sessions');
}

// ── Fetch absences (cr89a_emcistudentabsences) ────────────────────
export async function fetchAbsences(token: string): Promise<RawAbsence[]> {
  return fetchActivity<RawAbsence>(token, 'cr89a_emcistudentabsences', 'Absences');
}

// ── Fetch initial surveys (legacy + 2026) ─────────────────────────
export async function fetchInitialSurveys(token: string): Promise<RawInitialSurvey[]> {
  return fetchActivity<RawInitialSurvey>(token, 'cr89a_emcistudentinitialsurveies', 'InitialSurveys', false);
}

export async function fetchInitialSurveys2026(token: string): Promise<RawInitialSurvey2026[]> {
  return fetchActivity<RawInitialSurvey2026>(token, 'cr89a_emcistudentinitialsurvey2026s', 'InitialSurveys2026', false);
}

// ── Fetch end-of-pilot surveys (legacy + 2026) ────────────────────
export async function fetchEndOfPilotSurveysLegacy(token: string): Promise<RawEndOfPilotSurveyLegacy[]> {
  return fetchActivity<RawEndOfPilotSurveyLegacy>(token, 'cr89a_emciendofpilotstudentsurveies', 'EndOfPilotSurveysLegacy', false);
}

export async function fetchEndOfPilotSurveys2026(token: string): Promise<RawEndOfPilotSurvey2026[]> {
  return fetchActivity<RawEndOfPilotSurvey2026>(token, 'cr89a_emcistudentendofpilotsurvey2026s', 'EndOfPilotSurveys2026', false);
}

// ── Fetch mid-pilot student surveys (student-level) ───────────────
export async function fetchMidPilotStudentSurveys(token: string): Promise<RawMidPilotStudentSurvey[]> {
  return fetchActivity<RawMidPilotStudentSurvey>(token, 'cr89a_emcimidpilotschoolinitialsurveies', 'MidPilotStudentSurveys', false);
}

// ── Fetch mid-pilot school surveys (school-level, not student-level)
export async function fetchMidPilotSchoolSurveys(token: string): Promise<RawMidPilotSchoolSurvey[]> {
  return fetchActivity<RawMidPilotSchoolSurvey>(token, 'cr89a_midpilotschoolsurveies', 'MidPilotSchoolSurveys');
}

// ── Fetch student journeys (BPF instances) ─────────────────────────
export async function fetchJourneys(token: string): Promise<RawJourney[]> {
  const url = `${BASE_URL}/cr89a_wlpcstudentjourneies`;
  const res  = await fetch(url, { headers: dvHeaders(token) });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`Journeys fetch failed (${res.status}): ${text.slice(0, 200)}`);
    return [];
  }
  const data = await res.json() as { value: RawJourney[] };
  return (data.value ?? []).filter(j => j._bpf_cr89a_wlpcstudentid_value != null);
}

// ── Enrich students with data from all related tables ─────────────
export function enrichStudents(
  students: (Student & { schoolId: string })[],
  journeys: RawJourney[],
  sessions: RawSession[],
  absences: RawAbsence[],
): (Student & { schoolId: string })[] {
  // Build per-student maps for fast lookup
  const journeyByStudent = new Map<string, RawJourney>();
  for (const j of journeys) {
    const sid = j._bpf_cr89a_wlpcstudentid_value;
    if (!sid) continue;
    const existing = journeyByStudent.get(sid);
    // Keep the most recently modified journey
    if (!existing || (j.modifiedon ?? '') > (existing.modifiedon ?? '')) {
      journeyByStudent.set(sid, j);
    }
  }

  const sessionsByStudent = new Map<string, RawSession[]>();
  for (const s of sessions) {
    const sid = studentIdFromActivity(s);
    if (!sid) continue;
    if (!sessionsByStudent.has(sid)) sessionsByStudent.set(sid, []);
    sessionsByStudent.get(sid)!.push(s);
  }

  const absencesByStudent = new Map<string, RawAbsence[]>();
  for (const a of absences) {
    const sid = studentIdFromActivity(a);
    if (!sid) continue;
    if (!absencesByStudent.has(sid)) absencesByStudent.set(sid, []);
    absencesByStudent.get(sid)!.push(a);
  }

  return students.map(student => {
    const sid = student.id;
    const studentSessions = sessionsByStudent.get(sid) ?? [];
    const studentAbsences = absencesByStudent.get(sid) ?? [];

    // ── counsellor: student record owner is the primary source; most recent
    // session owner overrides if present (reflects any reassignment).
    const sortedSessions = [...studentSessions].sort(
      (a, b) => (b.createdon ?? '').localeCompare(a.createdon ?? ''),
    );
    const counsellor =
      (sortedSessions[0]?.['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? student.counsellor;

    // ── riskLevel: derived from absence count (unexplained/frequent) ─
    // No explicit risk field in journeys — derive from absence frequency.
    // > 5 absences in the data → high, > 2 → medium, else low (or none if zero).
    const absenceCount = studentAbsences.length;
    let riskLevel: Student['riskLevel'] = 'none';
    if (absenceCount > 5)      riskLevel = 'high';
    else if (absenceCount > 2) riskLevel = 'medium';
    else if (absenceCount > 0) riskLevel = 'low';

    // ── lastActivity: most recent date across sessions, absences, and student record ─
    const dates: string[] = [student.lastActivity].filter(Boolean) as string[];
    for (const s of studentSessions) if (s.createdon) dates.push(s.createdon);
    for (const a of studentAbsences) if (a.cr89a_absencedate) dates.push(a.cr89a_absencedate);
    dates.sort((a, b) => b.localeCompare(a));
    const lastActivity = dates[0] ?? student.lastActivity;

    return { ...student, counsellor, riskLevel, absenceCount, lastActivity };
  });
}

// ── Timeline event type ────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  date: string;
  modifiedDate: string;
  type: 'referral' | 'consent' | 'session' | 'survey' | 'absence';
  title: string;
  status: string;
  by: string;
  description: string;
  notes: string;
  track: string;
  sessionLength?: string;
  interventionType?: string;
  surveyFields?: SurveyField[];
}

// ── Build real timeline events for a student ───────────────────────
export function deriveStudentEvents(
  student: Student & { schoolId?: string },
  sessions?: RawSession[],
  initialSurveys?: RawInitialSurvey[],
  initialSurveys2026?: RawInitialSurvey2026[],
  endOfPilotSurveysLegacy?: RawEndOfPilotSurveyLegacy[],
  endOfPilotSurveys2026?: RawEndOfPilotSurvey2026[],
  midStudentSurveys?: RawMidPilotStudentSurvey[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const displayName = `${student.firstName} ${student.lastName}`.trim() || 'Student';
  const fallbackDate = student.lastActivity || new Date().toISOString();
  const counsellor = student.counsellor || 'EMCI Counsellor';

  // ── Stage milestone events (referral / consent) ────────────────
  if (
    student.currentStage === 'referral' ||
    student.currentStage === 'consent' ||
    student.currentStage === 'career_guidance' ||
    student.currentStage === 'complete'
  ) {
    events.push({
      id:           'step-1',
      date:         fallbackDate,
      modifiedDate: fallbackDate,
      type:         'referral',
      title:        'EMCI Referral',
      status:       'Completed',
      by:           counsellor,
      description:  `Initial referral received for ${displayName}.`,
      notes:        `Initial referral received for ${displayName}.`,
      track:        'above',
      surveyFields: [],
    });
  }

  if (
    student.currentStage === 'consent' ||
    student.currentStage === 'career_guidance' ||
    student.currentStage === 'complete'
  ) {
    events.push({
      id:           'step-2',
      date:         fallbackDate,
      modifiedDate: fallbackDate,
      type:         'consent',
      title:        'EMCI Consent',
      status:       'Completed',
      by:           counsellor,
      description:  `Parental consent obtained for ${displayName}.`,
      notes:        `Parental consent obtained for ${displayName}.`,
      track:        'above',
      surveyFields: [],
    });
  }

  // ── Real session events ────────────────────────────────────────
  if (sessions && sessions.length > 0) {
    const sorted = [...sessions].sort(
      (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
    );
    sorted.forEach((s, i) => {
      const sessionLength =
        (s['cr89a_sessionlength@OData.Community.Display.V1.FormattedValue'] as string | undefined)
        ?? (s.cr89a_sessionlength ? `${s.cr89a_sessionlength} min` : undefined);
      const interventionType =
        (s['cr89a_typeofintervention@OData.Community.Display.V1.FormattedValue'] as string | undefined)
        ?? undefined;
      const ownerName =
        (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
        ?? counsellor;
      // Strip HTML tags from internal notes for plain-text display
      const rawNotes = s.cr89a_internalnotes ?? '';
      const plainNotes = rawNotes.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      events.push({
        id:              `session-${s.activityid ?? i}`,
        date:            s.createdon ?? fallbackDate,
        modifiedDate:    s.modifiedon ?? s.createdon ?? fallbackDate,
        type:            'session',
        title:           s.subject ?? 'EMCI Session',
        status:          s.statecode === 0 ? 'Active' : 'Completed',
        by:              ownerName,
        description:     s.cr89a_externalsupportdetails ?? interventionType ?? 'Career guidance session.',
        notes:           plainNotes || 'Session notes not recorded.',
        track:           'above',
        sessionLength,
        interventionType,
        surveyFields: buildSessionFields(s, sessionLength, interventionType),
      });
    });
  } else if (
    student.currentStage === 'career_guidance' ||
    student.currentStage === 'complete'
  ) {
    // Fallback synthetic session event when no real session records exist
    events.push({
      id:               'step-3',
      date:             fallbackDate,
      modifiedDate:     fallbackDate,
      type:             'session',
      title:            'EMCI Session',
      status:           'Active',
      by:               counsellor,
      description:      'Morrisby unpacking and career planning.',
      notes:            'Career guidance session completed.',
      track:            'above',
      sessionLength:    '30 Minutes',
      interventionType: 'Unpack',
      surveyFields: buildSessionFields(
        { cr89a_externalsupportdetails: null } as any,
        '30 Minutes',
        'Unpack',
      ),
    });
  }

  // ── Legacy initial survey events (pre-2026 cohorts) ───────────
  // Only students with a record in cr89a_emcistudentinitialsurveies get these —
  // the _regardingobjectid_value filter in App.tsx ensures this automatically.
  for (const s of ([...(initialSurveys ?? [])].sort(
    (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
  ))) {
    const legacy = s as RawInitialSurvey;
    const ownerName =
      (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const description =
      legacy['cr89a_thoughtsaboutwhatyoumightdoafterschoolname']
      ?? legacy.cr89a_whatdoyouthinkyouarequitegoodat
      ?? 'Initial student survey completed.';
    const notes = legacy.cr89a_careeractivitiesthestudenthasparticipated ?? '';
    events.push({
      id:           `init-survey-${s.activityid}`,
      date:         s.createdon ?? fallbackDate,
      modifiedDate: s.modifiedon ?? s.createdon ?? fallbackDate,
      type:         'survey',
      title:        s.subject ?? 'EMCI Initial Survey (Legacy)',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description,
      notes,
      track:        'above',
      surveyFields: buildInitialSurveyLegacyFields(legacy),
    });
  }

  // ── 2026 initial survey events ─────────────────────────────────
  for (const s of ([...(initialSurveys2026 ?? [])].sort(
    (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
  ))) {
    const survey2026 = s as RawInitialSurvey2026;
    const ownerName =
      (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const preparedFmt =
      survey2026['cr89a_feelingpreparedforlifeafterschool@OData.Community.Display.V1.FormattedValue']
      ?? '';
    const description = preparedFmt
      ? `Feeling prepared for life after school: ${preparedFmt}`
      : 'Initial student survey completed.';
    const notes = survey2026['cr89a_careeractivitiesdetailsmultiselectname'] ?? '';
    events.push({
      id:           `init-survey-${s.activityid}`,
      date:         s.createdon ?? fallbackDate,
      modifiedDate: s.modifiedon ?? s.createdon ?? fallbackDate,
      type:         'survey',
      title:        s.subject ?? 'EMCI Initial Survey 2026',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description,
      notes,
      track:        'above',
      surveyFields: buildInitialSurvey2026Fields(survey2026),
    });
  }

  // ── Mid-pilot student survey events ───────────────────────────
  for (const s of ([...(midStudentSurveys ?? [])].sort(
    (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
  ))) {
    const mid = s as RawMidPilotStudentSurvey;
    const ownerName =
      (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const focusFmt = mid['cr89a_focusoverthenext6months@OData.Community.Display.V1.FormattedValue'] ?? '';
    const description = focusFmt
      ? `Focus over next 6 months: ${focusFmt}`
      : mid.cr89a_havethesessionshelped
        ? `Have the sessions helped: ${mid.cr89a_havethesessionshelped}`
        : 'Mid-pilot survey completed.';
    const notes = mid.cr89a_suggestionstohelpimproveourprogramin2025 ?? '';
    events.push({
      id:           `mid-survey-${s.activityid}`,
      date:         s.createdon ?? fallbackDate,
      modifiedDate: s.modifiedon ?? s.createdon ?? fallbackDate,
      type:         'survey',
      title:        s.subject ?? 'EMCI Mid-Pilot Survey',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description,
      notes,
      track:        'above',
      surveyFields: buildMidPilotStudentFields(mid),
    });
  }

  // ── End-of-pilot survey events (legacy) ────────────────────────
  for (const s of ([...(endOfPilotSurveysLegacy ?? [])].sort(
    (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
  ))) {
    const legacy = s as RawEndOfPilotSurveyLegacy;
    const ownerName =
      (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const ratingFmt =
      legacy['cr89a_rateoverallexperienceinprogram@OData.Community.Display.V1.FormattedValue'] ?? '';
    events.push({
      id:           `end-survey-${s.activityid}`,
      date:         s.createdon ?? fallbackDate,
      modifiedDate: s.modifiedon ?? s.createdon ?? fallbackDate,
      type:         'survey',
      title:        s.subject ?? 'EMCI End of Pilot Survey (Legacy)',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description:  ratingFmt ? `Overall programme rating: ${ratingFmt}` : 'End-of-pilot survey completed.',
      notes:        legacy.cr89a_rateoverallexperienceinprogramexplanation ?? legacy.cr89a_activityorsessionwhatdidyouenjoyaboutit ?? '',
      track:        'above',
      surveyFields: buildEndOfPilotLegacyFields(legacy),
    });
  }

  // ── End-of-pilot survey events (2026) ──────────────────────────
  for (const s of ([...(endOfPilotSurveys2026 ?? [])].sort(
    (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
  ))) {
    const eop2026 = s as RawEndOfPilotSurvey2026;
    const ownerName =
      (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const preparedFmt =
      eop2026['cr89a_feelingpreparedforlifeafterschool@OData.Community.Display.V1.FormattedValue'] ?? '';
    const helpfulFmt =
      eop2026['cr89a_emcihelpfulnessrating@OData.Community.Display.V1.FormattedValue'] ?? '';
    const description = preparedFmt
      ? `Feeling prepared for life after school: ${preparedFmt}`
      : helpfulFmt
        ? `EMCI helpfulness rating: ${helpfulFmt}`
        : 'End-of-pilot survey completed.';
    const notes = eop2026['cr89a_careeractivitiesdetailsmultiselectname'] ?? '';
    events.push({
      id:           `end-survey-${s.activityid}`,
      date:         s.createdon ?? fallbackDate,
      modifiedDate: s.modifiedon ?? s.createdon ?? fallbackDate,
      type:         'survey',
      title:        s.subject ?? 'EMCI End of Pilot Survey 2026',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description,
      notes,
      track:        'above',
      surveyFields: buildEndOfPilotSurvey2026Fields(eop2026),
    });
  }

  // ── Fallback end survey event ──────────────────────────────────
  // Only created when the student is at 'complete' stage but has no real survey.
  // The event is a placeholder — no survey fields are available.
  const hasEndSurveys = (endOfPilotSurveysLegacy?.length ?? 0) + (endOfPilotSurveys2026?.length ?? 0) > 0;
  if (student.currentStage === 'complete' && !hasEndSurveys) {
    events.push({
      id:           'step-4',
      date:         fallbackDate,
      modifiedDate: fallbackDate,
      type:         'survey',
      title:        'EMCI End of Pilot Survey',
      status:       'Pending',
      by:           counsellor,
      description:  'No survey responses recorded yet.',
      notes:        '',
      track:        'above',
      surveyFields: [],
    });
  }

  // Sort all events chronologically
  events.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  return events;
}
