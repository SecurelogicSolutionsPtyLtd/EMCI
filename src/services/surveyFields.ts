/**
 * Survey field extraction service.
 *
 * Responsible for converting raw Dataverse survey / session records into
 * display-ready { label, value } pairs shown in the event modal and
 * context panel. Each builder skips null / empty values automatically.
 *
 * Supported survey types:
 *   Session                      cr89a_wlpcsessions
 *   Initial Survey (Legacy)      cr89a_emcistudentinitialsurveies
 *   Initial Survey 2026          cr89a_emcistudentinitialsurvey2026s
 *   Mid-Pilot Student Survey     cr89a_emcimidpilotschoolinitialsurveies
 *   End-of-Pilot Survey (Legacy) cr89a_emciendofpilotstudentsurveies
 *   End-of-Pilot Survey 2026     cr89a_emcistudentendofpilotsurvey2026s
 */

import type {
  RawInitialSurvey,
  RawInitialSurvey2026,
  RawMidPilotStudentSurvey,
  RawEndOfPilotSurveyLegacy,
  RawEndOfPilotSurvey2026,
} from './surveyTypes';
import type { RawSession } from './dataverse';

// ── Core type ─────────────────────────────────────────────────────
export interface SurveyField {
  label: string;
  value: string;
}

// ── Helper: filter and normalise field pairs ──────────────────────
export function buildSurveyFields(
  pairs: Array<{ label: string; value: string | null | undefined | boolean }>,
): SurveyField[] {
  return pairs
    .filter(p => p.value != null && String(p.value).trim() !== '')
    .map(p => ({ label: p.label, value: String(p.value).trim() }));
}

// ── Session ───────────────────────────────────────────────────────
export function buildSessionFields(
  s: RawSession,
  sessionLength: string | undefined,
  interventionType: string | undefined,
): SurveyField[] {
  return buildSurveyFields([
    { label: 'Session Length',    value: sessionLength },
    { label: 'Intervention Type', value: interventionType },
    { label: 'External Support',  value: s.cr89a_externalsupportdetails as string | null },
  ]);
}

// ── Initial Survey (Legacy) ───────────────────────────────────────
export function buildInitialSurveyLegacyFields(s: RawInitialSurvey): SurveyField[] {
  return buildSurveyFields([
    { label: 'Thoughts After School',  value: s['cr89a_thoughtsaboutwhatyoumightdoafterschoolname'] ?? s.cr89a_thoughtsaboutafterschoolother },
    { label: 'Strengths',              value: s.cr89a_whatdoyouthinkyouarequitegoodat },
    { label: 'Career Activities',      value: s.cr89a_careeractivitiesthestudenthasparticipated },
    { label: 'Has Part-Time Job',      value: s.cr89a_haveyouhadhaveaparttimecasualjob },
    { label: 'Why Meeting Today',      value: s['cr89a_doyouknowwhywearecatchinguptodayname'] },
    { label: 'Enjoys at School',       value: s['cr89a_whatdoyouenjoyaboutcomingtoschoolname'] ?? s.cr89a_whatdoyouenjoyaboutcomingtoschoolother },
    { label: 'Would Change at School', value: s['cr89a_ifyoucouldchangesomethingaboutschoolname'] ?? s.cr89a_ifyoucouldchangesomethingaboutschoolother },
  ]);
}

// ── Initial Survey 2026 ───────────────────────────────────────────
export function buildInitialSurvey2026Fields(s: RawInitialSurvey2026): SurveyField[] {
  return buildSurveyFields([
    { label: 'Prepared for Life After School',      value: s['cr89a_feelingpreparedforlifeafterschool@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Understanding Interests & Strengths', value: s['cr89a_understandinginterestsandstrengths@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Completed Work Experience',           value: s['cr89a_completedworkexperience@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Part-Time / Casual Job',              value: s['cr89a_parttimeorcasualjobvolunteering@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Researching Careers Independently',   value: s['cr89a_researchingcoursesandcareersonyourown@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Career Activities',                   value: s['cr89a_careeractivitiesdetailsmultiselectname'] },
    {
      label: 'Previously in Career Activity',
      value: s.cr89a_participatedincareeractivitybeforetoday != null
        ? (s.cr89a_participatedincareeractivitybeforetoday ? 'Yes' : 'No')
        : null,
    },
  ]);
}

// ── Mid-Pilot Student Survey ──────────────────────────────────────
export function buildMidPilotStudentFields(s: RawMidPilotStudentSurvey): SurveyField[] {
  return buildSurveyFields([
    { label: 'Have Sessions Helped',         value: s.cr89a_havethesessionshelped },
    { label: 'Focus Next 6 Months',          value: s['cr89a_focusoverthenext6months@OData.Community.Display.V1.FormattedValue'] ?? s.cr89a_focusovernext6monthsother },
    { label: 'Elements Supporting Students', value: s['cr89a_elementsofemcisupportingstudentsname'] ?? s.cr89a_elementsofemcisupportingstudentsother },
    { label: 'Likely to Use Morrisby Again', value: s['cr89a_likelytousemorrisbyprofileagainname'] },
    { label: 'Programme Impact on Attendance', value: s['cr89a_programimpactonstudentattendanceengagementname'] },
    { label: 'Suggestions for Improvement',  value: s.cr89a_suggestionstohelpimproveourprogramin2025 },
  ]);
}

// ── End-of-Pilot Survey (Legacy) ──────────────────────────────────
export function buildEndOfPilotLegacyFields(s: RawEndOfPilotSurveyLegacy): SurveyField[] {
  return buildSurveyFields([
    { label: 'Overall Experience Rating',          value: s['cr89a_rateoverallexperienceinprogram@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Rating Explanation',                 value: s.cr89a_rateoverallexperienceinprogramexplanation },
    { label: 'Most Enjoyed Activity',              value: s['cr89a_activityorsessionenjoyedthemostname'] },
    { label: 'What Enjoyed',                       value: s.cr89a_activityorsessionwhatdidyouenjoyaboutit },
    { label: 'Not Enjoyed / Unhelpful',            value: s['cr89a_anythingyoudidnotenjoyorfoundunhelpfulname'] },
    { label: 'Helped Identify Career Interest',    value: s['cr89a_helpedidentifyfuturecareerinterestname'] },
    { label: 'Aware of Interests & Strengths',     value: s['cr89a_awareaboutowninterestsandstrengthsname'] },
    { label: 'Connection to School Subjects',      value: s['cr89a_connectiontoschoolsubjectbyexploringcareersname'] },
    { label: 'Exploring Careers Independently',    value: s['cr89a_exploringcareersonyourownname'] },
    { label: 'Learned About Jobs & Careers',       value: s['cr89a_learnabouttypesofjobandcareersname'] },
    { label: 'Understood Future Education Needed', value: s['cr89a_understandfutureeducationneededforcareersname'] },
  ]);
}

// ── End-of-Pilot Survey 2026 ──────────────────────────────────────
export function buildEndOfPilotSurvey2026Fields(s: RawEndOfPilotSurvey2026): SurveyField[] {
  return buildSurveyFields([
    { label: 'Prepared for Life After School',      value: s['cr89a_feelingpreparedforlifeafterschool@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Understanding Interests & Strengths', value: s['cr89a_understandinginterestsandstrengths@OData.Community.Display.V1.FormattedValue'] },
    { label: 'EMCI Helpfulness Rating',             value: s['cr89a_emcihelpfulnessrating@OData.Community.Display.V1.FormattedValue'] },
    { label: 'Completed Work Experience',           value: s['cr89a_completedworkexperiencename'] },
    { label: 'Part-Time / Casual Job',              value: s['cr89a_parttimeorcasualjobvolunteeringname'] },
    { label: 'Researching Careers Independently',   value: s['cr89a_researchingcoursesandcareersonyourownname'] },
    { label: 'Career Activities',                   value: s['cr89a_careeractivitiesdetailsmultiselectname'] },
    {
      label: 'Previously in Career Activity',
      value: s.cr89a_participatedincareeractivitybeforetoday != null
        ? (s.cr89a_participatedincareeractivitybeforetoday ? 'Yes' : 'No')
        : null,
    },
  ]);
}
