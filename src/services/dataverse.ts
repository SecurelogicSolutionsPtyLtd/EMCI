import type { Student, StageKey } from '../data/studentsData';
import { YEAR_LEVEL_PLUS_BUCKET } from '../data/studentsData';
import { deriveFollowUpRiskLevel } from '../lib/deAnalyticsMetrics';
import type { School } from '../data/networkData';
export type {
  RawInitialSurvey,
  RawInitialSurvey2026,
  RawMidPilotStudentSurvey,
  RawMidPilotStudentSurvey2026,
  RawMidPilotSchoolSurvey,
  RawEndOfPilotSurveyLegacy,
  RawEndOfPilotSurvey2026,
} from './surveyTypes';
import type {
  RawInitialSurvey,
  RawInitialSurvey2026,
  RawMidPilotStudentSurvey,
  RawMidPilotStudentSurvey2026,
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
// `cr89a_yearlevel` on **cr89a_wlpcstudent** (logical name; OData JSON uses lowercase
// `cr89a_yearlevel`). Choice values from Dataverse (labels for reference):
//   1000 → Year 9
//   1001 → Year 10
//   1002 → EMCI 2024 Students (Y10)
//   1003 → 15+
//   1004 → EMCI 2025 Students (Y10)
//   1005 → EMCI 2024 Students (Y9)
//   1006 → EMCI 2025 Students (Y9)
//
// We decode to a small numeric bucket for filters (9, 10) plus YEAR_LEVEL_PLUS_BUCKET for 15+.
// FormattedValue is stored as yearLevelLabel for display when cohort names matter.
// Unknown / unmapped codes → 0 (avoid `code - 1000` guesses).
const YEAR_LEVEL_CODE_MAP: Record<number, number> = {
  1000: 9,
  1001: 10,
  1002: 10,
  1003: YEAR_LEVEL_PLUS_BUCKET,
  1004: 10,
  1005: 9,
  1006: 9,
};

function decodeYearLevel(val: number | null): number {
  if (val === null || val === undefined) return 0;
  if (val in YEAR_LEVEL_CODE_MAP) return YEAR_LEVEL_CODE_MAP[val];
  return 0;
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
  /** OData annotation — cohort label from Dataverse (e.g. "Year 9", "15+", "EMCI 2025 Students (Y9)"). */
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
  _ownerid_value: string | null;
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
  // Intervention multiselect picklists — the human-readable labels arrive in the
  // semicolon-delimited @FormattedValue annotation (raw fields hold option codes).
  cr89a_intervention_ms: string | null;
  'cr89a_intervention_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_interventionmorrisby_ms: string | null;
  'cr89a_interventionmorrisby_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_interventioncap_ms: string | null;
  'cr89a_interventioncap_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_interventionindustryengagement_ms: string | null;
  'cr89a_interventionindustryengagement_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_interventionwexpreparation_ms: string | null;
  'cr89a_interventionwexpreparation_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_interventionworkreadiness_ms: string | null;
  'cr89a_interventionworkreadiness_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_interventionother_ms: string | null;
  'cr89a_interventionother_ms@OData.Community.Display.V1.FormattedValue'?: string | null;
  // Per-session student feedback — picklist code + semicolon-delimited labels in
  // the @FormattedValue annotation. Surfaced to the AI only (never to the
  // deterministic detectors, whose keyword matching these values would corrupt).
  cr89a_studentsatisfactiontodayssession: number | null;
  'cr89a_studentsatisfactiontodayssession@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_whatdidyoufindusefulintodayssession: string | null;
  'cr89a_whatdidyoufindusefulintodayssession@OData.Community.Display.V1.FormattedValue'?: string | null;
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

// Dataverse Notes (annotation entity) attached to a student record.
// Linked to the student via _objectid_value when objecttypecode is the student entity.
export interface RawAnnotation {
  annotationid: string;
  subject: string | null;
  notetext: string | null;
  _objectid_value: string | null;
  '_objectid_value@Microsoft.Dynamics.CRM.lookuplogicalname'?: string | null;
  '_ownerid_value@OData.Community.Display.V1.FormattedValue'?: string | null;
  objecttypecode: string | null;
  createdon: string | null;
  modifiedon: string | null;
}

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

// ── Helper: resolve a session's intervention type ─────────────────
// The single-choice picklist cr89a_typeofintervention is the primary marker,
// but counsellors often record the intervention only in the multiselect fields
// (e.g. Morrisby "Unpack"). Fall back to those labels so every session is
// marked with a real intervention rather than a generic "EMCI Session".
function resolveInterventionType(s: RawSession): string | undefined {
  const fmt = (key: keyof RawSession) =>
    (s[`${key}@OData.Community.Display.V1.FormattedValue` as keyof RawSession] as string | null | undefined)
    ?? undefined;

  const primary = fmt('cr89a_typeofintervention')?.trim();
  if (primary) return primary;

  const multi = [fmt('cr89a_intervention_ms'), fmt('cr89a_interventionmorrisby_ms')]
    .map(v => v?.trim())
    .filter((v): v is string => !!v && v.length > 0)
    .join('; ');

  return multi.length > 0 ? multi : undefined;
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

// ── Dataverse systemuser lookup (counsellor owner email / name) ───

export interface OwnerIdentity {
  email: string;
  name:  string;
  /** Dataverse `systemuser.isdisabled` — counsellor is inactive when true. */
  isDisabled?: boolean;
}

export type OwnerLookup = Map<string, OwnerIdentity>;

interface RawSystemUser {
  systemuserid: string;
  fullname: string | null;
  internalemailaddress: string | null;
  domainname: string | null;
  isdisabled: boolean | null;
}

function resolveOwnerFromMap(
  ownerId: string | null | undefined,
  ownerMap: OwnerLookup,
  formattedName?: string | null,
): { ownerId?: string; email?: string; name: string } {
  const name = formattedName?.trim() ?? '';
  if (!ownerId) return { name };
  const entry = ownerMap.get(ownerId.toLowerCase());
  return {
    ownerId,
    email: entry?.email || undefined,
    name:  entry?.name || name,
  };
}

export async function fetchSystemUsers(token: string): Promise<OwnerLookup> {
  const select = 'systemuserid,fullname,internalemailaddress,domainname,isdisabled';
  const map: OwnerLookup = new Map();
  let url: string | undefined = `${BASE_URL}/systemusers?$select=${select}`;

  while (url) {
    const res = await fetch(url, { headers: dvHeaders(token) });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[EMCI] System users fetch failed (${res.status}): ${text.slice(0, 200)}`);
      return map;
    }
    const data = await res.json() as { value: RawSystemUser[]; '@odata.nextLink'?: string };
    for (const user of data.value ?? []) {
      const ownerId = user.systemuserid.toLowerCase();
      const email = (user.internalemailaddress ?? user.domainname ?? '').trim().toLowerCase();
      map.set(ownerId, {
        email,
        name: user.fullname?.trim() ?? '',
        isDisabled: user.isdisabled === true,
      });
    }
    url = data['@odata.nextLink'];
  }

  return map;
}

// ── Mapper: RawStudent → Student ──────────────────────────────────
function mapStudent(raw: RawStudent, ownerMap: OwnerLookup): Student & { schoolId: string } {
  const stage = deriveStage(raw);

  const yearLevel      = decodeYearLevel(raw.cr89a_yearlevel);
  const yearLevelLabel = raw['cr89a_yearlevel@OData.Community.Display.V1.FormattedValue'] ?? undefined;
  const owner = resolveOwnerFromMap(
    raw._ownerid_value,
    ownerMap,
    raw['_ownerid_value@OData.Community.Display.V1.FormattedValue'],
  );

  return {
    id:            raw.cr89a_wlpcstudentid,
    firstName:     raw.cr89a_firstname  ?? '',
    lastName:      raw.cr89a_lastname   ?? '',
    preferredName: raw.cr89a_preferredname ?? undefined,
    studentName:   raw.cr89a_studentname ?? undefined,
    email:         raw.emailaddress     ?? undefined,
    yearLevel,
    yearLevelLabel,
    morrisbyId:    raw.cr89a_registrationcode ?? raw.cr89a_wlpcstudentid.slice(0, 8).toUpperCase(),
    status:        decodeStatus(raw.statecode, raw.statuscode),
    currentStage:  stage,
    stageProgress: deriveProgress(raw),
    riskLevel:     'none',
    absenceCount:  0,
    sessionCount:  0,
    counsellor:         owner.name,
    counsellorOwnerId:  owner.ownerId,
    counsellorEmail:    owner.email,
    interviewed:   raw.cr89a_studentinterviewed,
    hasProfile:    raw.cr89a_studenthasaprofile,
    studentType:   raw['new_studenttypemultiselect@OData.Community.Display.V1.FormattedValue'] ?? raw.new_studenttypemultiselect ?? 'Standard',
    lastActivity:  raw.modifiedon ?? raw.createdon ?? '',
    createdAt:     raw.createdon ?? undefined,
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

  // Warn when ALL records lack a student link so the dev can spot it
  if (all.length > 0 && !all.some(r => r._regardingobjectid_value != null)) {
    const sample = all[0];
    const candidateKeys = Object.keys(sample).filter(
      k => k.toLowerCase().includes('student') || k.toLowerCase().includes('regarding') || k.toLowerCase().includes('id'),
    );
    console.warn(
      '[EMCI] %s: no records have _regardingobjectid_value — possible custom student link field. Candidate keys:',
      errorLabel,
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

export async function fetchStudents(
  token: string,
  ownerMap?: OwnerLookup,
): Promise<(Student & { schoolId: string })[]> {
  const url = `${BASE_URL}/cr89a_wlpcstudents?$select=${STUDENT_SELECT}`;
  const [res, resolvedOwnerMap] = await Promise.all([
    fetch(url, { headers: dvHeaders(token) }),
    ownerMap ? Promise.resolve(ownerMap) : fetchSystemUsers(token),
  ]);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Students fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { value: RawStudent[] };
  return (data.value ?? []).map(raw => mapStudent(raw, resolvedOwnerMap));
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

// ── Fetch mid-pilot student surveys (student-level, legacy) ───────
export async function fetchMidPilotStudentSurveys(token: string): Promise<RawMidPilotStudentSurvey[]> {
  return fetchActivity<RawMidPilotStudentSurvey>(token, 'cr89a_emcimidpilotschoolinitialsurveies', 'MidPilotStudentSurveys', false);
}

// ── Fetch mid-pilot student surveys (student-level, 2026) ─────────
export async function fetchMidPilotStudentSurveys2026(token: string): Promise<RawMidPilotStudentSurvey2026[]> {
  return fetchActivity<RawMidPilotStudentSurvey2026>(token, 'cr89a_emcimidpilotsurvey2026s', 'MidPilotStudentSurveys2026', false);
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

// ── Fetch Dataverse Notes (annotations) attached to students ───────
// These are the free-text notes shown in the Dataverse "Notes" timeline
// (e.g. "Email from Principal…", "Scott absent due to YJ factors").
export async function fetchAnnotations(token: string): Promise<RawAnnotation[]> {
  const select = 'annotationid,subject,notetext,_objectid_value,objecttypecode,createdon,modifiedon';
  const filter = "objecttypecode eq 'cr89a_wlpcstudent'";
  const all: RawAnnotation[] = [];
  let url: string | undefined =
    `${BASE_URL}/annotations?$select=${select}&$filter=${encodeURIComponent(filter)}`;

  while (url) {
    const res: Response = await fetch(url, { headers: dvHeaders(token) });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[EMCI] Annotations fetch failed (${res.status}): ${text.slice(0, 200)}`);
      return all;
    }
    const data = await res.json() as { value: RawAnnotation[]; '@odata.nextLink'?: string };
    all.push(...(data.value ?? []));
    url = data['@odata.nextLink'];
  }

  return all.filter(a => a._objectid_value != null && (a.notetext ?? a.subject));
}

// ── Enrich students with data from all related tables ─────────────
export function enrichStudents(
  students: (Student & { schoolId: string })[],
  journeys: RawJourney[],
  sessions: RawSession[],
  absences: RawAbsence[],
  _ownerMap: OwnerLookup = new Map(),
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

    const absenceCount = studentAbsences.length;

    // ── lastActivity: most recent date across sessions, absences, and student record ─
    const dates: string[] = [student.lastActivity].filter(Boolean) as string[];
    for (const s of studentSessions) if (s.createdon) dates.push(s.createdon);
    for (const a of studentAbsences) if (a.cr89a_absencedate) dates.push(a.cr89a_absencedate);
    dates.sort((a, b) => b.localeCompare(a));
    const lastActivity = dates[0] ?? student.lastActivity;

    const enriched = {
      ...student,
      absenceCount,
      sessionCount: studentSessions.length,
      lastActivity,
      riskLevel: 'none' as const,
    };
    enriched.riskLevel = deriveFollowUpRiskLevel(enriched);

    return enriched;
  });
}

// ── Timeline event type ────────────────────────────────────────────
/** Session detail surfaced on pending / empty end-of-pilot survey events. */
export interface RelatedSessionContext {
  title: string;
  date: string;
  fields: SurveyField[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  modifiedDate: string;
  type: 'referral' | 'consent' | 'session' | 'survey' | 'absence' | 'note';
  title: string;
  status: string;
  by: string;
  description: string;
  notes: string;
  track: string;
  sessionLength?: string;
  interventionType?: string;
  /** Student's satisfaction with the session (e.g. "Very Helpful"). */
  sessionSatisfaction?: string;
  /** What the student found useful in the session (semicolon-delimited). */
  sessionUseful?: string;
  surveyFields?: SurveyField[];
  /** Counselling session context for end surveys awaiting student responses. */
  relatedSession?: RelatedSessionContext;
}

function isRealSessionEvent(ev: TimelineEvent): boolean {
  return ev.type === 'session' && ev.id.startsWith('session-');
}

function isEndSurveyEvent(ev: TimelineEvent): boolean {
  return ev.type === 'survey' && ev.id.startsWith('end-survey-');
}

function endSurveyNeedsSessionContext(ev: TimelineEvent): boolean {
  return isEndSurveyEvent(ev) && (ev.surveyFields?.length ?? 0) === 0;
}

/** Latest real session — used to give end-of-pilot surveys session context for AI + UI. */
function latestSessionContext(events: TimelineEvent[]): RelatedSessionContext | undefined {
  const sessions = events.filter(isRealSessionEvent);
  if (!sessions.length) return undefined;

  const latest = sessions[sessions.length - 1]!;
  const fields = [...(latest.surveyFields ?? [])];
  if (
    latest.notes &&
    latest.notes !== 'Session notes not recorded.' &&
    !fields.some(f => f.label === 'Notes')
  ) {
    fields.push({ label: 'Notes', value: latest.notes });
  }
  if (!fields.length) return undefined;

  return { title: latest.title, date: latest.date, fields };
}

function enrichEndSurveysWithSessionContext(events: TimelineEvent[]): TimelineEvent[] {
  const sessionCtx = latestSessionContext(events);
  if (!sessionCtx) return events;

  return events.map(ev =>
    endSurveyNeedsSessionContext(ev) ? { ...ev, relatedSession: sessionCtx } : ev,
  );
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
  midStudentSurveys2026?: RawMidPilotStudentSurvey2026[],
  annotations?: RawAnnotation[],
  absences?: RawAbsence[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const displayName = `${student.firstName} ${student.lastName}`.trim() || 'Student';
  const fallbackDate = student.lastActivity || new Date().toISOString();
  const counsellor = student.counsellor || 'EMCI Counsellor';

  // ── Stage milestone event (consent) ────────────────────────────
  // Consent is dated from when the student record was created in the CRM
  // (Dataverse createdon), falling back to last activity only if absent.
  if (
    student.currentStage === 'consent' ||
    student.currentStage === 'career_guidance' ||
    student.currentStage === 'complete'
  ) {
    const consentDate = student.createdAt || fallbackDate;
    events.push({
      id:           'step-2',
      date:         consentDate,
      modifiedDate: consentDate,
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
      const interventionType = resolveInterventionType(s);
      const sessionSatisfaction =
        (s['cr89a_studentsatisfactiontodayssession@OData.Community.Display.V1.FormattedValue'] as string | undefined)
        ?? undefined;
      const sessionUseful =
        (s['cr89a_whatdidyoufindusefulintodayssession@OData.Community.Display.V1.FormattedValue'] as string | undefined)
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
        title:           interventionType ?? s.subject ?? 'EMCI Session',
        status:          s.statecode === 0 ? 'Active' : 'Completed',
        by:              ownerName,
        description:     s.cr89a_externalsupportdetails ?? interventionType ?? 'Career guidance session.',
        notes:           plainNotes || 'Session notes not recorded.',
        track:           'above',
        sessionLength,
        interventionType,
        sessionSatisfaction,
        sessionUseful,
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
      title:        'EMCI Initial Survey (Legacy)',
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
      title:        'EMCI Initial Survey 2026',
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
      title:        'EMCI Mid-Pilot Student Survey (Legacy)',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description,
      notes,
      track:        'above',
      surveyFields: buildMidPilotStudentFields(mid),
    });
  }

  // ── Mid-pilot student survey events (2026) ────────────────────
  for (const s of ([...(midStudentSurveys2026 ?? [])].sort(
    (a, b) => (a.createdon ?? '').localeCompare(b.createdon ?? ''),
  ))) {
    const mid = s as RawMidPilotStudentSurvey2026;
    const ownerName =
      (s['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const focusFmt = mid['cr89a_focusoverthenext6months@OData.Community.Display.V1.FormattedValue'] ?? '';
    const description = focusFmt
      ? `Focus over next 6 months: ${focusFmt}`
      : mid.cr89a_havethesessionshelped
        ? `Have the sessions helped: ${mid.cr89a_havethesessionshelped}`
        : 'Mid-pilot survey completed.';
    const notes = mid.cr89a_suggestionstohelpimproveourprogrammein2025 ?? '';
    events.push({
      id:           `mid-survey-2026-${s.activityid}`,
      date:         s.createdon ?? fallbackDate,
      modifiedDate: s.modifiedon ?? s.createdon ?? fallbackDate,
      type:         'survey',
      title:        'EMCI Student Mid Pilot Survey',
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
      title:        'EMCI End of Pilot Survey (Legacy)',
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
      title:        'EMCI End of Pilot Survey 2026',
      status:       s.statecode === 0 ? 'Active' : 'Completed',
      by:           ownerName,
      description,
      notes,
      track:        'above',
      surveyFields: buildEndOfPilotSurvey2026Fields(eop2026),
    });
  }

  // End-of-pilot survey events are only ever created from real Dataverse
  // records (legacy / 2026 above). Students at 'complete' stage with no survey
  // record intentionally show no end-of-pilot survey card — the 'Complete'
  // journey milestone is driven by currentStage, not by a synthetic event.

  // ── Absence events (cr89a_emcistudentabsence) ─────────────────
  // Surfaced on the timeline and fed into AI context via buildTimelineNotes
  // (the reason is placed in `notes` so all three AI calls see it).
  for (const a of ([...(absences ?? [])].sort(
    (x, y) => (x.cr89a_absencedate ?? x.createdon ?? '').localeCompare(y.cr89a_absencedate ?? y.createdon ?? ''),
  ))) {
    const ownerName =
      (a['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    const reasonLabel =
      a['cr89a_reasondropdown@OData.Community.Display.V1.FormattedValue'] ?? '';
    const freeText = a.cr89a_reasonifknown?.trim() ?? '';
    const absenceDate = a.cr89a_absencedate ?? a.createdon ?? fallbackDate;
    const fields: SurveyField[] = [];
    if (reasonLabel) fields.push({ label: 'Reason', value: reasonLabel });
    if (freeText)    fields.push({ label: 'Details', value: freeText });
    if (a.cr89a_emcischoolnamedisplay) {
      fields.push({ label: 'School', value: a.cr89a_emcischoolnamedisplay });
    }
    events.push({
      id:           `absence-${a.activityid}`,
      date:         absenceDate,
      modifiedDate: a.modifiedon ?? absenceDate,
      type:         'absence',
      title:        'EMCI Student Absence',
      status:       '',
      by:           ownerName,
      description:  reasonLabel ? `Reason: ${reasonLabel}` : 'Student absence recorded.',
      notes:        [reasonLabel, freeText].filter(Boolean).join(' — '),
      track:        'below',
      surveyFields: fields,
    });
  }

  // ── Dataverse Notes (annotations) ──────────────────────────────
  // Free-text notes recorded against the student in Dataverse. Surfaced on
  // the timeline and fed into AI context via buildTimelineNotes.
  for (const a of (annotations ?? [])) {
    const rawNote = a.notetext ?? '';
    const plainNote = rawNote.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = a.subject?.trim() ?? '';
    if (!plainNote && !subject) continue;
    const noteDate = a.createdon ?? a.modifiedon ?? fallbackDate;
    const ownerName =
      (a['_ownerid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined)
      ?? counsellor;
    events.push({
      id:           `note-${a.annotationid}`,
      date:         noteDate,
      modifiedDate: a.modifiedon ?? noteDate,
      type:         'note',
      title:        subject || 'Note',
      status:       '',
      by:           ownerName,
      description:  subject && plainNote ? subject : '',
      notes:        plainNote || subject,
      track:        'below',
      surveyFields: [],
    });
  }

  // Sort all events chronologically
  events.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  return enrichEndSurveysWithSessionContext(events);
}
