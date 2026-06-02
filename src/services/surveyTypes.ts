/**
 * Dataverse survey entity type definitions.
 *
 * Each interface extends RawActivity (defined in dataverse.ts) and only declares
 * the EMCI-specific fields for that entity. Standard activity fields (activityid,
 * subject, statecode, statuscode, createdon, modifiedon, _ownerid_value, etc.)
 * are inherited from RawActivity.
 *
 * Entity set reference:
 *   Initial Survey (Legacy)        cr89a_emcistudentinitialsurveies
 *   Initial Survey 2026            cr89a_emcistudentinitialsurvey2026s
 *   Mid-Pilot Student Survey (Legacy) cr89a_emcimidpilotschoolinitialsurveies
 *   Mid-Pilot Student Survey 2026  cr89a_emcimidpilotsurvey2026s
 *   Mid-Pilot School Survey        cr89a_midpilotschoolsurveies
 *   End-of-Pilot Survey (Legacy) cr89a_emciendofpilotstudentsurveies
 *   End-of-Pilot Survey 2026     cr89a_emcistudentendofpilotsurvey2026s
 */

import type { RawActivity } from './dataverse';

// ── Initial Survey (Legacy — cr89a_emcistudentinitialsurveies) ─────────────
// Used for pre-2026 cohorts. A student only has a record here if they
// participated before the 2026 programme year.
export interface RawInitialSurvey extends RawActivity {
  cr89a_thoughtsaboutwhatyoumightdoafterschool?: number | null;
  'cr89a_thoughtsaboutwhatyoumightdoafterschoolname'?: string | null;
  cr89a_thoughtsaboutafterschoolother?: string | null;
  cr89a_careeractivitiesthestudenthasparticipated?: string | null;
  cr89a_whatdoyouthinkyouarequitegoodat?: string | null;
  cr89a_haveyouhadhaveaparttimecasualjob?: string | null;
  cr89a_doyouknowwhywearecatchinguptoday?: number | null;
  'cr89a_doyouknowwhywearecatchinguptodayname'?: string | null;
  cr89a_whatdoyouenjoyaboutcomingtoschool?: string | null;
  'cr89a_whatdoyouenjoyaboutcomingtoschoolname'?: string | null;
  cr89a_whatdoyouenjoyaboutcomingtoschoolother?: string | null;
  cr89a_ifyoucouldchangesomethingaboutschool?: string | null;
  'cr89a_ifyoucouldchangesomethingaboutschoolname'?: string | null;
  cr89a_ifyoucouldchangesomethingaboutschoolother?: string | null;
}

// ── Initial Survey 2026 (cr89a_emcistudentinitialsurvey2026s) ──────────────
export interface RawInitialSurvey2026 extends RawActivity {
  cr89a_feelingpreparedforlifeafterschool?: number | null;
  'cr89a_feelingpreparedforlifeafterschool@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_understandinginterestsandstrengths?: number | null;
  'cr89a_understandinginterestsandstrengths@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_completedworkexperience?: number | null;
  'cr89a_completedworkexperience@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_parttimeorcasualjobvolunteering?: number | null;
  'cr89a_parttimeorcasualjobvolunteering@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_researchingcoursesandcareersonyourown?: number | null;
  'cr89a_researchingcoursesandcareersonyourown@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_careeractivitiesdetailsmultiselect?: string | null;
  'cr89a_careeractivitiesdetailsmultiselectname'?: string | null;
  cr89a_participatedincareeractivitybeforetoday?: boolean | null;
}

// ── Mid-Pilot Student Survey (cr89a_emcimidpilotschoolinitialsurveies) ──────
// Student-level mid-programme check-in.
export interface RawMidPilotStudentSurvey extends RawActivity {
  cr89a_havethesessionshelped?: string | null;
  cr89a_focusoverthenext6months?: number | null;
  'cr89a_focusoverthenext6months@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_focusovernext6monthsother?: string | null;
  cr89a_currentmethodofcontacttoorganisestudents?: string | null;
  cr89a_elementsofemcisupportingstudents?: string | null;
  'cr89a_elementsofemcisupportingstudentsname'?: string | null;
  cr89a_elementsofemcisupportingstudentsother?: string | null;
  cr89a_likelytousemorrisbyprofileagain?: number | null;
  'cr89a_likelytousemorrisbyprofileagainname'?: string | null;
  cr89a_programmeimpactonstudentattendanceengagement?: number | null;
  'cr89a_programmeimpactonstudentattendanceengagementname'?: string | null;
  cr89a_suggestionstohelpimproveourprogrammein2025?: string | null;
}

// ── Mid-Pilot Student Survey 2026 (cr89a_emcimidpilotsurvey2026s) ───────────
// 2026 student-level mid-programme check-in. The field shape mirrors the
// legacy student mid-pilot form; non-matching fields simply render empty.
export type RawMidPilotStudentSurvey2026 = RawMidPilotStudentSurvey;

// ── Mid-Pilot School Survey (cr89a_midpilotschoolsurveies) ─────────────────
// School-level survey — not linked to individual students.
export interface RawMidPilotSchoolSurvey extends RawActivity {
  cr89a_elementsofemcisupportingstudents?: string | null;
  'cr89a_elementsofemcisupportingstudentsname'?: string | null;
  cr89a_elementsofemcisupportingstudentsother?: string | null;
  cr89a_iscurrentmethodofstudentcontactworking?: number | null;
  'cr89a_iscurrentmethodofstudentcontactworkingname'?: string | null;
  cr89a_iscurrentmethodofstudentcontactworkingno?: string | null;
  cr89a_programmeimpactonstudentattendanceatschool?: number | null;
  'cr89a_programmeimpactonstudentattendanceatschoolname'?: string | null;
  cr89a_suggestionstoimproveprogramme2025?: string | null;
}

// ── End-of-Pilot Survey (Legacy — cr89a_emciendofpilotstudentsurveies) ──────
// Pre-2026 end-of-programme student survey with a richer field set.
export interface RawEndOfPilotSurveyLegacy extends RawActivity {
  cr89a_rateoverallexperienceinprogramme?: number | null;
  'cr89a_rateoverallexperienceinprogramme@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_rateoverallexperienceinprogrammeexplanation?: string | null;
  cr89a_activityorsessionenjoyedthemost?: number | null;
  'cr89a_activityorsessionenjoyedthemostname'?: string | null;
  cr89a_activityorsessionwhatdidyouenjoyaboutit?: string | null;
  cr89a_anythingyoudidnotenjoyorfoundunhelpful?: string | null;
  'cr89a_anythingyoudidnotenjoyorfoundunhelpfulname'?: string | null;
  cr89a_helpedidentifyfuturecareerinterest?: number | null;
  'cr89a_helpedidentifyfuturecareerinterestname'?: string | null;
  cr89a_awareaboutowninterestsandstrengths?: number | null;
  'cr89a_awareaboutowninterestsandstrengthsname'?: string | null;
  cr89a_connectiontoschoolsubjectbyexploringcareers?: number | null;
  'cr89a_connectiontoschoolsubjectbyexploringcareersname'?: string | null;
  cr89a_exploringcareersonyourown?: number | null;
  'cr89a_exploringcareersonyourownname'?: string | null;
  cr89a_learnabouttypesofjobandcareers?: number | null;
  'cr89a_learnabouttypesofjobandcareersname'?: string | null;
  cr89a_understandfutureeducationneededforcareers?: number | null;
  'cr89a_understandfutureeducationneededforcareersname'?: string | null;
}

// ── End-of-Pilot Survey 2026 (cr89a_emcistudentendofpilotsurvey2026s) ───────
export interface RawEndOfPilotSurvey2026 extends RawActivity {
  cr89a_feelingpreparedforlifeafterschool?: number | null;
  'cr89a_feelingpreparedforlifeafterschool@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_understandinginterestsandstrengths?: number | null;
  'cr89a_understandinginterestsandstrengths@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_emcihelpfulnessrating?: number | null;
  'cr89a_emcihelpfulnessrating@OData.Community.Display.V1.FormattedValue'?: string | null;
  cr89a_completedworkexperience?: number | null;
  'cr89a_completedworkexperiencename'?: string | null;
  cr89a_parttimeorcasualjobvolunteering?: number | null;
  'cr89a_parttimeorcasualjobvolunteeringname'?: string | null;
  cr89a_researchingcoursesandcareersonyourown?: number | null;
  'cr89a_researchingcoursesandcareersonyourownname'?: string | null;
  cr89a_careeractivitiesdetailsmultiselect?: string | null;
  'cr89a_careeractivitiesdetailsmultiselectname'?: string | null;
  cr89a_participatedincareeractivitybeforetoday?: boolean | null;
}
