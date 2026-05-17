# EMCI — Dataverse Connection Reference

Complete map of every Dataverse entity, field, and data connection used by the EMCI Student Intelligence Interface. Use this as a guide to re-implement or port the integration to another application.

---

## Connection Details

| Item | Value |
|---|---|
| **Environment** | `mcicrm.crm6.dynamics.com` |
| **API Base URL** | `https://mcicrm.crm6.dynamics.com/api/data/v9.2` |
| **Local proxy path** | `/dataverse/api/data/v9.2` (Vite dev proxy) |
| **Auth method** | OAuth 2.0 Client Credentials (Azure AD) |
| **Token endpoint** | Azure AD `/oauth2/v2.0/token` |
| **Token source (dev)** | `GET /devtoken` Vite middleware |

### Required API Headers

```
Authorization:    Bearer <token>
Accept:           application/json
OData-MaxVersion: 4.0
OData-Version:    4.0
Prefer:           odata.include-annotations="*"
```

> The `Prefer: odata.include-annotations="*"` header is critical — it causes Dataverse to return `@OData.Community.Display.V1.FormattedValue` annotations alongside raw picklist codes, which are required for human-readable label resolution.

---

## Entity Overview

| Entity Display Name | Logical Name | Entity Set (API collection) | PK Field | Purpose |
|---|---|---|---|---|
| WLPC Student | `cr89a_wlpcstudent` | `cr89a_wlpcstudents` | `cr89a_wlpcstudentid` | Core student records |
| WLPC School | `cr89a_wlpcschool` | `cr89a_wlpcschools` | `cr89a_wlpcschoolid` | School records |
| WLPC Session | `cr89a_wlpcsession` | `cr89a_wlpcsessions` | `activityid` | Counselling sessions |
| EMCI Student Absence | `cr89a_emcistudentabsence` | `cr89a_emcistudentabsences` | `activityid` | Absence records |
| EMCI Initial Survey (Legacy) | `cr89a_emcistudentinitialsurvey` | `cr89a_emcistudentinitialsurveies` | `activityid` | Pre-2026 initial survey |
| EMCI Initial Survey 2026 | `cr89a_emcistudentinitialsurvey2026` | `cr89a_emcistudentinitialsurvey2026s` | `activityid` | 2026 initial survey |
| EMCI Mid-Pilot Student Survey | `cr89a_emcimidpilotschoolinitialsurvey` | `cr89a_emcimidpilotschoolinitialsurveies` | `activityid` | Student mid-pilot check-in |
| Mid-Pilot School Survey | `cr89a_midpilotschoolsurvey` | `cr89a_midpilotschoolsurveies` | `activityid` | School-level mid-pilot survey |
| EMCI End of Pilot Survey (Legacy) | `cr89a_emciendofpilotstudentsurvey` | `cr89a_emciendofpilotstudentsurveies` | `activityid` | Pre-2026 end-of-pilot survey |
| EMCI End of Pilot Survey 2026 | `cr89a_emcistudentendofpilotsurvey2026` | `cr89a_emcistudentendofpilotsurvey2026s` | `activityid` | 2026 end-of-pilot survey |
| WLPC Student Journey | `cr89a_wlpcstudentjourney` | `cr89a_wlpcstudentjourneies` | `businessprocessflowinstanceid` | BPF stage tracking |

---

## Entity 1 — WLPC Student (`cr89a_wlpcstudents`)

**Fetch URL:** `GET /cr89a_wlpcstudents?$select=<fields>`

### Fields Used

| Dataverse Field | Display Name | Type | App Property | Notes |
|---|---|---|---|---|
| `cr89a_wlpcstudentid` | Student ID | Uniqueidentifier (PK) | `student.id` | Primary key |
| `cr89a_firstname` | First Name | String | `student.firstName` | |
| `cr89a_lastname` | Last Name | String | `student.lastName` | |
| `cr89a_preferredname` | Preferred Name | String | `student.preferredName` | |
| `cr89a_studentname` | Full Name | String | — | Not mapped separately |
| `emailaddress` | Email | String | `student.email` | |
| `cr89a_yearlevel` | Year Level | Picklist (code) | `student.yearLevel` | Decoded via `YEAR_LEVEL_CODE_MAP` — **do not parse the label** |
| `cr89a_yearlevel@OData...FormattedValue` | Year Level Label | Annotation | `student.yearLevelLabel` | Stored for display only (can be cohort name like "EMCI 2024 Students (Y9)") |
| `cr89a_registrationcode` | Morrisby ID | String | `student.morrisbyId` | Falls back to first 8 chars of PK if null |
| `_cr89a_wlpcschool_value` | School (lookup) | Lookup GUID | `student.schoolId` | Links to `cr89a_wlpcschoolid` |
| `_ownerid_value` | Owner (GUID) | Owner | — | Not used directly |
| `_ownerid_value@OData...FormattedValue` | Owner Name | Annotation | `student.counsellor` | Primary counsellor source |
| `statecode` | State | State | — | Combined with `statuscode` |
| `statuscode` | Status Reason | Status | `student.status` | See status decode table below |
| `cr89a_studentinterviewed` | Interviewed | Boolean | `student.interviewed` | |
| `cr89a_studenthasaprofile` | Has Morrisby Profile | Boolean | `student.hasProfile` | |
| `cr89a_referralobtained` | Referral Obtained | Boolean | stage derivation | `stageProgress = 1` |
| `cr89a_consentobtained` | Consent Obtained | Boolean | stage derivation | `stageProgress = 2` |
| `cr89a_guidanceinprogress` | Guidance In Progress | Boolean | stage derivation | `stageProgress = 3` |
| `cr89a_guidancecomplete` | Guidance Complete | Boolean | stage derivation | `stageProgress = 4` |
| `new_studenttypemultiselect` | Student Type | MultiSelectPicklist | — | Raw codes |
| `new_studenttypemultiselect@OData...FormattedValue` | Student Type Label | Annotation | `student.studentType` | Preferred source |
| `cr89a_prioritycohort` | Priority Cohort | String | — | Fetched but not currently displayed |
| `modifiedon` | Last Updated | DateTime | `student.lastActivity` | ISO 8601 |
| `createdon` | Date Created | DateTime | fallback for `lastActivity` | ISO 8601 |
| `cr89a_studentdeactivation` | Student Deactivation | Choice (option set) | `student.studentDeactivation` | **Read-only in EMCI.** Integer code; updated only outside this app (e.g. Dataverse form, Power Automate). |
| `cr89a_studentdeactivation@OData...FormattedValue` | Deactivation label | Annotation | `student.studentDeactivationLabel` | Human-readable reason |
| `cr89a_studentdeactivationtimestamp` | Deactivation timestamp | DateTime | `student.studentDeactivationAt` | Typically **Power Automate** or other automation alongside deactivation |
| `cr89a_studentdeactivationyeargroup` | Year group at deactivation | String | `student.studentDeactivationYearGroupSnapshot` | Typically automation — point-in-time year group text |

### Student deactivation (Dataverse / automation)

EMCI **does not write** deactivation fields. Your solution (e.g. **Power Automate**, plugins, or manual Dataverse updates) should own setting `cr89a_studentdeactivation`, `cr89a_studentdeactivationtimestamp`, `cr89a_studentdeactivationyeargroup`, and any **inactive** transition (`statecode` / `statuscode` / status reason) as required.

### Status Decode

| `statecode` | `statuscode` | App Value |
|---|---|---|
| `0` | `1` (Active) | `'Active'` |
| `0` | `2` | `'Inactive'` |
| `0` | `3` | `'Pending'` |
| `1` (Inactive) | any | `'Inactive'` |

### Stage Derivation (priority order — highest wins)

| Boolean Field | `currentStage` | `stageProgress` |
|---|---|---|
| none true | `null` | `0` |
| `cr89a_referralobtained` | `'referral'` | `1` |
| `cr89a_consentobtained` | `'consent'` | `2` |
| `cr89a_guidanceinprogress` | `'career_guidance'` | `3` |
| `cr89a_guidancecomplete` | `'complete'` | `4` |

### Year Level Code Map

| Raw Code | Year |
|---|---|
| `1000` | Year 9 |
| `1001` | Year 10 |
| `1002` | Year 10 (EMCI 2024 Y10 cohort) |
| `1003` | Year 11 (assumed) |
| `1004` | Year 10 (EMCI 2025 Y10 cohort) |
| `1005` | Year 9 (EMCI 2024 Y9 cohort) |
| any other `1000–1099` | `code - 1000` |

---

## Entity 2 — WLPC School (`cr89a_wlpcschools`)

**Fetch URL:** `GET /cr89a_wlpcschools` (no `$select` — field name varies across environments)

### Fields Used

| Dataverse Field | Display Name | Type | App Property | Notes |
|---|---|---|---|---|
| `cr89a_wlpcschoolid` | School ID | Uniqueidentifier (PK) | `school.id` | |
| `cr89a_name` / `cr89a_schoolname` / `cr89a_wlpcschoolname` | School Name | String | `school.name` | Resolved dynamically — first non-null wins; falls back to any field ending in `name` |
| `cr89a_region` | Region | String | `school.region` | |
| `cr89a_principalcontact` | Principal Contact | String | `school.principalContact` | |
| `cr89a_morrisbyid` | Morrisby ID | String | `school.morrisbyId` | |
| `statecode` | State | State | `school.status` | `0` → Active, else Inactive |
| `createdon` | Date Created | DateTime | `school.joinedYear` | Year extracted only |

---

## Activity Entity Pattern

All non-student, non-school entities are **Dataverse Activity** types. They share a common base shape and link to a student via the `regardingobjectid` polymorphic lookup.

### Common Activity Fields

| Field | Type | Purpose |
|---|---|---|
| `activityid` | Uniqueidentifier (PK) | Unique ID for the activity record |
| `subject` | String | Display title shown in the timeline |
| `_regardingobjectid_value` | Lookup GUID | Links to the student's `cr89a_wlpcstudentid` |
| `_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname` | Annotation | Confirms the target is `cr89a_wlpcstudent` |
| `_ownerid_value@OData...FormattedValue` | Annotation | Counsellor display name (owner of the record) |
| `statecode` | State | `0` = Active, `1` = Completed/Inactive |
| `statuscode` | Status Reason | Sub-status |
| `createdon` | DateTime | Used as the event date |
| `modifiedon` | DateTime | Used as the event modified date |
| `actualend` | DateTime | Actual completion date (where applicable) |

### Student Linkage

All activity records are fetched without a student filter. The app filters client-side:

```
records.filter(r => r._regardingobjectid_value === student.id)
```

---

## Entity 3 — Session (`cr89a_wlpcsessions`)

**Fetch URL:** `GET /cr89a_wlpcsessions`

### EMCI-Specific Fields

| Field | Type | App Usage |
|---|---|---|
| `cr89a_sessionlength` | Picklist (code) | Duration — use `@FormattedValue` annotation |
| `cr89a_typeofintervention` | Picklist (code) | Intervention type — use `@FormattedValue` annotation |
| `cr89a_internalnotes` | Memo (HTML) | Notes — strip HTML tags before display |
| `cr89a_externalsupportdetails` | Memo | External support description |
| `cr89a_intervention_ms` | MultiSelect | Intervention types (multiselect) |
| `cr89a_interventionmorrisby_ms` | MultiSelect | Morrisby-specific intervention |
| `cr89a_interventioncap_ms` | MultiSelect | CAP intervention |
| `cr89a_interventionindustryengagement_ms` | MultiSelect | Industry engagement |
| `cr89a_interventionwexpreparation_ms` | MultiSelect | WEX preparation |
| `cr89a_interventionworkreadiness_ms` | MultiSelect | Work readiness |
| `cr89a_interventionother_ms` | MultiSelect | Other intervention |

**Counsellor override:** The `_ownerid_value@FormattedValue` from the most recent session overrides the student-level owner as the displayed counsellor.

---

## Entity 4 — Absence (`cr89a_emcistudentabsences`)

**Fetch URL:** `GET /cr89a_emcistudentabsences`

### EMCI-Specific Fields

| Field | Type | App Usage |
|---|---|---|
| `cr89a_absencedate` | DateTime | Date of absence (used for `lastActivity` calculation) |
| `cr89a_reasondropdown` | Picklist (code) | Reason — use `@FormattedValue` annotation |
| `cr89a_reasonifknown` | Memo | Free-text reason |
| `cr89a_emcischoolnamedisplay` | String | School name for display |

**Risk level derivation** (from total absence count per student):

| Absence Count | `riskLevel` |
|---|---|
| `0` | `'none'` |
| `1–2` | `'low'` |
| `3–5` | `'medium'` |
| `> 5` | `'high'` |

---

## Entity 5 — Initial Survey Legacy (`cr89a_emcistudentinitialsurveies`)

**Fetch URL:** `GET /cr89a_emcistudentinitialsurveies`  
**Used for:** Pre-2026 cohorts only. A student only has a record here if they participated before the 2026 programme year.

### EMCI-Specific Fields

| Field | Type | Display Label | App Usage |
|---|---|---|---|
| `cr89a_thoughtsaboutwhatyoumightdoafterschool` | Picklist | Thoughts about after school | Timeline description (use `name` annotation) |
| `cr89a_thoughtsaboutwhatyoumightdoafterschoolname` | Annotation | — | Formatted label — used as description |
| `cr89a_thoughtsaboutafterschoolother` | Memo | After school — other | |
| `cr89a_careeractivitiesthestudenthasparticipated` | Memo | Career activities participated | Timeline notes |
| `cr89a_whatdoyouthinkyouarequitegoodat` | Memo | What are you good at? | Fallback description |
| `cr89a_haveyouhadhaveaparttimecasualjob` | Memo | Part-time/casual job | |
| `cr89a_doyouknowwhywearecatchinguptoday` | Picklist | Know why catching up today? | |
| `cr89a_doyouknowwhywearecatchinguptodayname` | Annotation | — | Formatted label |
| `cr89a_whatdoyouenjoyaboutcomingtoschool` | MultiSelectPicklist | Enjoy about school | |
| `cr89a_whatdoyouenjoyaboutcomingtoschoolname` | Annotation | — | Formatted label |
| `cr89a_whatdoyouenjoyaboutcomingtoschoolother` | Memo | Enjoy about school — other | |
| `cr89a_ifyoucouldchangesomethingaboutschool` | MultiSelectPicklist | Change about school | |
| `cr89a_ifyoucouldchangesomethingaboutschoolname` | Annotation | — | Formatted label |
| `cr89a_ifyoucouldchangesomethingaboutschoolother` | Memo | Change about school — other | |

---

## Entity 6 — Initial Survey 2026 (`cr89a_emcistudentinitialsurvey2026s`)

**Fetch URL:** `GET /cr89a_emcistudentinitialsurvey2026s`  
**Used for:** 2026 programme year onwards.

### EMCI-Specific Fields

| Field | Type | Display Label | App Usage |
|---|---|---|---|
| `cr89a_feelingpreparedforlifeafterschool` | Picklist | Feeling prepared for life after school | Timeline description (use `@FormattedValue`) |
| `cr89a_understandinginterestsandstrengths` | Picklist | Understanding interests and strengths | |
| `cr89a_completedworkexperience` | Picklist | Completed work experience | |
| `cr89a_parttimeorcasualjobvolunteering` | Picklist | Part-time or casual job/volunteering | |
| `cr89a_researchingcoursesandcareersonyourown` | Picklist | Researching courses and careers | |
| `cr89a_careeractivitiesdetailsmultiselect` | MultiSelectPicklist | Career activities details | |
| `cr89a_careeractivitiesdetailsmultiselectname` | Annotation | — | Formatted label — used as notes |
| `cr89a_participatedincareeractivitybeforetoday` | Boolean | Participated in career activity before | |

---

## Entity 7 — Mid-Pilot Student Survey (`cr89a_emcimidpilotschoolinitialsurveies`)

**Fetch URL:** `GET /cr89a_emcimidpilotschoolinitialsurveies`  
**Used for:** Student-level mid-programme check-in. Linked to individual students via `regardingobjectid`.

### EMCI-Specific Fields

| Field | Type | Display Label | App Usage |
|---|---|---|---|
| `cr89a_havethesessionshelped` | Memo | Have the sessions helped | Fallback description |
| `cr89a_focusoverthenext6months` | Picklist | Focus over next 6 months | Timeline description (use `@FormattedValue`) |
| `cr89a_focusovernext6monthsother` | Memo | Focus — other | |
| `cr89a_currentmethodofcontacttoorganisestudents` | Memo | Current contact method | |
| `cr89a_elementsofemcisupportingstudents` | MultiSelectPicklist | Elements of EMCI supporting students | |
| `cr89a_elementsofemcisupportingstudentsname` | Annotation | — | Formatted label |
| `cr89a_elementsofemcisupportingstudentsother` | Memo | Elements — other | |
| `cr89a_likelytousemorrisbyprofileagain` | Picklist | Likely to use Morrisby profile again | |
| `cr89a_likelytousemorrisbyprofileagainname` | Annotation | — | Formatted label |
| `cr89a_programmeimpactonstudentattendanceengagement` | Picklist | Feelings about future school plans | |
| `cr89a_programmeimpactonstudentattendanceengagementname` | Annotation | — | Formatted label |
| `cr89a_suggestionstohelpimproveourprogrammein2025` | Memo | Suggestions to improve programme | Timeline notes |

---

## Entity 8 — Mid-Pilot School Survey (`cr89a_midpilotschoolsurveies`)

**Fetch URL:** `GET /cr89a_midpilotschoolsurveies`  
**Used for:** School-level survey — **not linked to individual students**. No `regardingobjectid` student link.

### EMCI-Specific Fields

| Field | Type | Display Label |
|---|---|---|
| `cr89a_elementsofemcisupportingstudents` | MultiSelectPicklist | Elements of EMCI supporting students |
| `cr89a_elementsofemcisupportingstudentsname` | Annotation | Formatted label |
| `cr89a_elementsofemcisupportingstudentsother` | Memo | Elements — other |
| `cr89a_iscurrentmethodofstudentcontactworking` | Picklist | Is current contact method working? |
| `cr89a_iscurrentmethodofstudentcontactworkingname` | Annotation | Formatted label |
| `cr89a_iscurrentmethodofstudentcontactworkingno` | Memo | If no — details |
| `cr89a_programmeimpactonstudentattendanceatschool` | Picklist | Programme impact on attendance |
| `cr89a_programmeimpactonstudentattendanceatschoolname` | Annotation | Formatted label |
| `cr89a_suggestionstoimproveprogramme2025` | Memo | Suggestions to improve programme |

---

## Entity 9 — End-of-Pilot Survey Legacy (`cr89a_emciendofpilotstudentsurveies`)

**Fetch URL:** `GET /cr89a_emciendofpilotstudentsurveies`  
**Used for:** Pre-2026 cohorts only.

### EMCI-Specific Fields

| Field | Type | Display Label | App Usage |
|---|---|---|---|
| `cr89a_rateoverallexperienceinprogramme` | Picklist | Rate overall experience | Timeline description (use `@FormattedValue`) |
| `cr89a_rateoverallexperienceinprogrammeexplanation` | Memo | Explanation | Timeline notes |
| `cr89a_activityorsessionenjoyedthemost` | Picklist | Activity enjoyed most | |
| `cr89a_activityorsessionenjoyedthemostname` | Annotation | Formatted label | |
| `cr89a_activityorsessionwhatdidyouenjoyaboutit` | Memo | What did you enjoy about it | Fallback notes |
| `cr89a_anythingyoudidnotenjoyorfoundunhelpful` | MultiSelectPicklist | Anything unhelpful | |
| `cr89a_anythingyoudidnotenjoyorfoundunhelpfulname` | Annotation | Formatted label | |
| `cr89a_helpedidentifyfuturecareerinterest` | Picklist | Helped identify career interest | |
| `cr89a_helpedidentifyfuturecareerinterestname` | Annotation | Formatted label | |
| `cr89a_awareaboutowninterestsandstrengths` | Picklist | Aware of own interests/strengths | |
| `cr89a_awareaboutowninterestsandstrengthsname` | Annotation | Formatted label | |
| `cr89a_connectiontoschoolsubjectbyexploringcareers` | Picklist | Connection to school subject | |
| `cr89a_connectiontoschoolsubjectbyexploringcareersname` | Annotation | Formatted label | |
| `cr89a_exploringcareersonyourown` | Picklist | Exploring careers on your own | |
| `cr89a_exploringcareersonyourownname` | Annotation | Formatted label | |
| `cr89a_learnabouttypesofjobandcareers` | Picklist | Learn about jobs and careers | |
| `cr89a_learnabouttypesofjobandcareersname` | Annotation | Formatted label | |
| `cr89a_understandfutureeducationneededforcareers` | Picklist | Understand future education needed | |
| `cr89a_understandfutureeducationneededforcareersname` | Annotation | Formatted label | |

---

## Entity 10 — End-of-Pilot Survey 2026 (`cr89a_emcistudentendofpilotsurvey2026s`)

**Fetch URL:** `GET /cr89a_emcistudentendofpilotsurvey2026s`  
**Used for:** 2026 programme year onwards.

### EMCI-Specific Fields

| Field | Type | Display Label | App Usage |
|---|---|---|---|
| `cr89a_feelingpreparedforlifeafterschool` | Picklist | Feeling prepared for life after school | Timeline description (use `@FormattedValue`) |
| `cr89a_understandinginterestsandstrengths` | Picklist | Understanding interests and strengths | |
| `cr89a_emcihelpfulnessrating` | Picklist | EMCI helpfulness rating | Fallback description (use `@FormattedValue`) |
| `cr89a_completedworkexperience` | Picklist | Completed work experience | |
| `cr89a_completedworkexperiencename` | Annotation | Formatted label | |
| `cr89a_parttimeorcasualjobvolunteering` | Picklist | Part-time or casual job/volunteering | |
| `cr89a_parttimeorcasualjobvolunteeringname` | Annotation | Formatted label | |
| `cr89a_researchingcoursesandcareersonyourown` | Picklist | Researching courses and careers | |
| `cr89a_researchingcoursesandcareersonyourownname` | Annotation | Formatted label | |
| `cr89a_careeractivitiesdetailsmultiselect` | MultiSelectPicklist | Career activities details | |
| `cr89a_careeractivitiesdetailsmultiselectname` | Annotation | Formatted label | Timeline notes |
| `cr89a_participatedincareeractivitybeforetoday` | Boolean | Participated in career activity before | |

---

## Entity 11 — Student Journey (`cr89a_wlpcstudentjourneies`)

**Fetch URL:** `GET /cr89a_wlpcstudentjourneies`  
**Type:** Business Process Flow (BPF) instance — tracks which stage a student is currently on.

> Note: Stage is derived from the student record boolean flags (`cr89a_referralobtained` etc.) rather than the BPF, which is more reliable. The journey entity is fetched but not currently used in enrichment.

| Field | Type | App Usage |
|---|---|---|
| `businessprocessflowinstanceid` | Uniqueidentifier (PK) | BPF record ID |
| `bpf_name` | String | Journey name |
| `_bpf_cr89a_wlpcstudentid_value` | Lookup GUID | Links to student |
| `activestagestartedon` | DateTime | When current stage started |
| `completedon` | DateTime | When journey completed |
| `bpf_duration` | Integer | Duration in days |
| `statecode` / `statuscode` | State/Status | Journey status |
| `createdon` / `modifiedon` | DateTime | Timestamps |

---

## Relationship Map

```
cr89a_wlpcschool (1)
    └── cr89a_wlpcstudent (many)  via  _cr89a_wlpcschool_value

cr89a_wlpcstudent (1)
    ├── cr89a_wlpcsession (many)                    via  _regardingobjectid_value
    ├── cr89a_emcistudentabsence (many)              via  _regardingobjectid_value
    ├── cr89a_emcistudentinitialsurveies (0–many)    via  _regardingobjectid_value  [legacy only]
    ├── cr89a_emcistudentinitialsurvey2026s (0–many) via  _regardingobjectid_value  [2026+]
    ├── cr89a_emcimidpilotschoolinitialsurveies (0–many) via _regardingobjectid_value
    ├── cr89a_emciendofpilotstudentsurveies (0–many) via  _regardingobjectid_value  [legacy only]
    ├── cr89a_emcistudentendofpilotsurvey2026s (0–many) via _regardingobjectid_value [2026+]
    └── cr89a_wlpcstudentjourneies (0–1)             via  _bpf_cr89a_wlpcstudentid_value

cr89a_midpilotschoolsurveies  →  school-level only, no student link
```

---

## OData Annotation Pattern

Dataverse returns picklist labels alongside numeric codes via OData annotations. Always request `Prefer: odata.include-annotations="*"` and prefer the annotation over the raw code.

```
// Raw code (numeric — not human-readable):
cr89a_yearlevel: 1000

// Annotation (human-readable label):
cr89a_yearlevel@OData.Community.Display.V1.FormattedValue: "Year 9"

// Lookup formatted name:
_ownerid_value@OData.Community.Display.V1.FormattedValue: "Kelsey Bourke"

// Lookup logical name (confirms which entity the lookup points to):
_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname: "cr89a_wlpcstudent"

// MultiSelectPicklist label (semicolon-delimited):
new_studenttypemultiselectname: "Disability; Koorie"
```

---

## App Data Model → Dataverse Field Map

Quick reference for the `Student` interface properties and their Dataverse sources.

| App Property | Primary Source | Fallback |
|---|---|---|
| `id` | `cr89a_wlpcstudentid` | — |
| `firstName` | `cr89a_firstname` | `''` |
| `lastName` | `cr89a_lastname` | `''` |
| `preferredName` | `cr89a_preferredname` | `undefined` |
| `email` | `emailaddress` | `undefined` |
| `yearLevel` | `cr89a_yearlevel` decoded via `YEAR_LEVEL_CODE_MAP` | `0` |
| `yearLevelLabel` | `cr89a_yearlevel@FormattedValue` | `undefined` |
| `morrisbyId` | `cr89a_registrationcode` | first 8 chars of PK |
| `status` | `statecode` + `statuscode` combined | `'Inactive'` |
| `currentStage` | Highest true boolean among stage flags | `null` |
| `stageProgress` | Count of true stage flags (0–4) | `0` |
| `counsellor` | `_ownerid_value@FormattedValue` (student record) | overridden by most recent session owner |
| `riskLevel` | Derived from absence count | `'none'` |
| `interviewed` | `cr89a_studentinterviewed` | — |
| `hasProfile` | `cr89a_studenthasaprofile` | — |
| `studentType` | `new_studenttypemultiselect@FormattedValue` | `new_studenttypemultiselect` raw → `'Standard'` |
| `lastActivity` | `modifiedon` | `createdon` |
| `schoolId` | `_cr89a_wlpcschool_value` | `''` |
| `studentDeactivation` | `cr89a_studentdeactivation` | `null` |
| `studentDeactivationLabel` | `cr89a_studentdeactivation@FormattedValue` | `null` |
| `studentDeactivationAt` | `cr89a_studentdeactivationtimestamp` | `null` |
| `studentDeactivationYearGroupSnapshot` | `cr89a_studentdeactivationyeargroup` | `null` |

---

## Source Files

| File | Purpose |
|---|---|
| `src/services/dataverse.ts` | All fetch functions, student/school mappers, enrichment, timeline event builder |
| `src/services/surveyTypes.ts` | TypeScript interfaces for all 6 survey entity types |
| `src/data/studentsData.ts` | `Student` interface definition + mock data |
| `src/data/networkData.ts` | `School` interface definition + mock data |
| `vite.config.ts` | `/dataverse` proxy and `/devtoken` middleware |
