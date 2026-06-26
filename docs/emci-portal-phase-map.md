# EMCI Portal — Phase Map

> **Workflow:** Invoke the personal **`phase-delivery`** skill. AI marks `[~]` after coding; you verify in the running app before `[x]`.

**Last updated:** 2026-06-26  
**Source checklist:** [To do updates.md](../To%20do%20updates.md)

---

## Progress summary

| Phase | Name | Status | Tasks | AI complete | Human verified |
|-------|------|--------|-------|-------------|----------------|
| P0 | Awaiting Approval | blocked | 2 | 0/2 | 0/2 |
| P1 | Dashboard Metrics | in-progress | 4 | 4/4 | 0/4 |
| P2 | Terminology — Follow Up | not-started | 1 | 0/1 | 0/1 |
| P3 | Progress Ratings | not-started | 2 | 0/2 | 0/2 |
| P4 | Student Summary Logic | not-started | 4 | 0/4 | 0/4 |
| P5 | Scoring & Eligibility | not-started | 4 | 0/4 | 0/4 |
| P6 | Alerts & Flags | not-started | 3 | 0/3 | 0/3 |
| P7 | Follow-Up Logic | not-started | 4 | 0/4 | 0/4 |
| P8 | Security & Permissions | not-started | 4 | 0/4 | 0/4 |
| P9 | Reporting Views | not-started | 1 | 0/1 | 0/1 |
| P10 | Validation & Testing | not-started | 6 | 0/6 | 0/6 |

---

## Priority order

1. **P1** — Dashboard active/inactive counts
2. **P2** — At Risk → Follow Up
3. **P3** — Weighting changes
4. **P4** — Inactive student summary fixes
5. **P4-T4** — Incorrect completion summary investigation
6. **P6** — Alerts/flags cleanup
7. **P0** — After DE/Bronwyn approval received

---

## Phase 0: Awaiting Approval

**Phase status:** `blocked`  
**Gate:** Do not implement until stakeholder sign-off. AI may only document options.

### P0-T1 — Job Ready terminology

- [ ] **AI Status:** `blocked` · **Human Verified:** `no`

**Requirements**

- Review **"Job Ready"** wording with ACCE/DE stakeholders
- Evaluate alternatives: Job Skilled, Career Ready, Work Experience Ready
- Await final approval from Bronwyn

**Acceptance criteria**

- Approved label documented in phase map and checklist
- No UI copy changed until approval recorded

**Human verification**

1. Confirm written approval from Bronwyn/DE is on file
2. Reply `approval P0-T1: [chosen label]` to unblock P2 follow-on if needed

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P0-T2 — Department of Education wording

- [ ] **AI Status:** `blocked` · **Human Verified:** `no`

**Requirements**

- Review all terminology against Department of Education feedback
- Final DE wording review before rollout

**Acceptance criteria**

- DE sign-off recorded; terminology list updated in phase map

**Human verification**

1. Confirm DE feedback incorporated and signed off

**Dependencies:** P2, P3, P6 terminology tasks ideally complete for full review

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 1: Dashboard Metrics

**Phase status:** `in-progress`

### P1-T1 — School summary cards (Total / Active / Inactive)

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

**Requirements**

- Dashboard cards show: Total Schools (Pilot Lifetime), Active Schools, Inactive Schools

**Acceptance criteria**

- Three distinct school count metrics visible on dashboard
- Counts match school records by status

**Suggested files**

- `src/lib/networkProgramMetrics.ts` — `buildProgramKpiCards`
- `src/components/DashboardHome.tsx`

**Human verification**

1. Open dashboard as admin/network role
2. Confirm three school metrics display with correct labels
3. Cross-check against Schools list (active vs inactive)

**Dependencies:** none

**AI Notes:** Added `Total Schools (Pilot Lifetime)`, `Active Schools`, and `Inactive Schools` KPI cards in `buildProgramKpiCards`. Onboarding schools count toward Total only. Dashboard/Schools KPI grid expanded to 9 columns.

**Human Notes:** _(empty)_

---

### P1-T2 — Exclude test schools from statistics

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

**Requirements**

- Exclude test schools/accounts (e.g. Secure Logic, test entries) from primary statistics

**Acceptance criteria**

- Test/demo schools omitted from dashboard KPI totals
- Filtering is consistent wherever school aggregates appear

**Suggested files**

- `src/lib/networkProgramMetrics.ts`
- School filter/scope helpers (search for test school exclusion patterns)

**Human verification**

1. Confirm test school exists in data
2. Verify dashboard counts exclude it
3. Spot-check schools snapshot if multi-school view shown

**Dependencies:** P1-T1

**AI Notes:** New [`src/lib/programStatsFilters.ts`](../../src/lib/programStatsFilters.ts) — excludes schools whose names match Secure Logic / test / demo patterns. Applied in KPI builder, stage distribution, and schools snapshot via `getProgramStatsScope`.

**Human Notes:** _(empty)_

---

### P1-T3 — Counsellor counts (Active / Total)

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

**Requirements**

- Show Active Counsellors and optionally Total Counsellors

**Acceptance criteria**

- Counsellor KPI(s) reflect active assignments, not raw unique strings from students only

**Suggested files**

- `src/lib/networkProgramMetrics.ts`

**Human verification**

1. Compare dashboard counsellor count to known active counsellors in scope
2. If Total shown, confirm it includes inactive where expected

**Dependencies:** P1-T1

**AI Notes:** Counsellor counts keyed by Dataverse `counsellorOwnerId` / `counsellorEmail`. Active = at least one Active student in stats scope; Total = any assignment in scope.

**Human Notes:** _(empty)_

---

### P1-T4 — Exclude inactive/test counsellors from active metrics

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

**Requirements**

- Exclude inactive counsellors and test accounts from active counsellor metrics

**Acceptance criteria**

- Active counsellor count ignores inactive and test entries

**Human verification**

1. Verify inactive/test counsellor not counted in Active Counsellors

**Dependencies:** P1-T3

**AI Notes:** Test counsellors excluded via email/name patterns in `programStatsFilters`. Platform-deactivated counsellors resolved from `emci_user_roles` (`teamMembers` in shell context) via `buildDeactivatedCounsellorKeys`. Unit tests: `npx tsx --test src/lib/networkProgramMetrics.test.ts` (6 pass).

**Human Notes:** _(empty)_

---

## Phase 2: Terminology — Follow Up

**Phase status:** `not-started`

### P2-T1 — Rename "At Risk" → "Follow Up"

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Replace user-facing **"At Risk"** with **"Follow Up"** across student tab and related UI

**Acceptance criteria**

- No user-visible "At Risk" labels remain (filters, badges, advisories, roster)
- Internal keys may remain if needed; display copy must say Follow Up

**Suggested files**

- `src/components/SchoolStudentRegister.tsx`
- `src/components/DashboardHome.tsx` — advisories
- `src/components/NetworkOverview.tsx`
- `src/data/networkData.ts` — `studentType: 'At Risk'` display mapping
- Grep: `At Risk`, `atRisk`, `at-risk`

**Human verification**

1. Open student roster and filters — confirm "Follow Up" wording
2. Check dashboard advisories card
3. Search UI for any remaining "At Risk" text

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 3: Progress Ratings

**Phase status:** `not-started`

### P3-T1 — Rename Growth & Wellbeing → Student Sentiment

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Rating area display name: **Growth & Wellbeing** → **Student Sentiment**

**Acceptance criteria**

- Student progress/rating UI shows "Student Sentiment"
- Storage keys updated or mapped consistently

**Suggested files**

- `src/lib/studentRatingStorage.ts`
- Rating display components (grep `Growth`, `wellbeing`, `growth_sentiment`)

**Human verification**

1. Open a student rating/progress view
2. Confirm area label reads "Student Sentiment"

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P3-T2 — Update rating weightings

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

| Rating Area | Weight |
|-------------|--------|
| Engagement | 20% |
| Career Planning & Exploration | 25% |
| Work Readiness | 25% |
| Attendance & Momentum | 15% |
| Student Sentiment | 15% |

**Acceptance criteria**

- Weights sum to 100%
- Career Planning and Work Readiness are highest weighted
- Composite scores recalculate with new weights

**Suggested files**

- Rating weight config (grep `weight`, rating category keys)
- `src/lib/studentRatingStorage.ts`

**Human verification**

1. Open student with full rating data
2. Confirm weight labels/percentages match table
3. Spot-check composite score changes vs old weighting if test data available

**Dependencies:** P3-T1

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 4: Student Summary Logic

**Phase status:** `not-started`

### P4-T1 — Inactive student summary generation

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Review and fix inactive school/student summary generation
- Inactive students must not appear as actively engaged

**Acceptance criteria**

- Inactive students get appropriate inactive summary, not active-engagement language

**Suggested files**

- `src/components/StudentJourneySummary.tsx`
- AI summary generation logic (grep `summary`, `inactive`)

**Human verification**

1. Open inactive student profile
2. Confirm summary does not imply active engagement

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P4-T2 — Inactive student alternate wording

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Use alternate wording for inactive students, e.g.:
  - *"This student is no longer active in the EMCI program."*
  - *"Participation ceased before program completion."*

**Acceptance criteria**

- Inactive status shows approved alternate copy (not generic active templates)

**Human verification**

1. View inactive student summary — confirm wording matches spec

**Dependencies:** P4-T1

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P4-T3 — Investigate incorrect completion summaries

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Investigate Charlie McDonald case: successful completion after only one session
- Review AI summary generation logic and completion thresholds

**Acceptance criteria**

- Root cause documented in AI Notes
- Completion threshold rules enforced in code
- Edge case no longer produces false completion summary

**Human verification**

1. Reproduce or simulate low-session student
2. Confirm completion summary only when thresholds met
3. Re-check Charlie McDonald or equivalent test record if available

**Dependencies:** P4-T1

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P4-T4 — Completion threshold enforcement

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Implement/fix completion thresholds identified in P4-T3 investigation

**Acceptance criteria**

- Code enforces minimum sessions/surveys before "successful completion" summary

**Dependencies:** P4-T3

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 5: Scoring & Eligibility

**Phase status:** `not-started`

### P5-T1 — EMCI program naming

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- **EMCI** = Enhanced My Career Insights (Pilot Program) in user-facing references

**Human verification**

1. Find EMCI references in UI/help copy — confirm full name where appropriate

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P5-T2 — Score eligibility gates

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Only calculate scores when ALL true:
  - At least 1 EMCI session exists
  - Initial Student Survey completed
  - At least 1 Satisfaction Survey completed

**Human verification**

1. Student missing one gate — no score displayed
2. Student meeting all gates — score calculated

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P5-T3 — 30-day CRM creation grace period

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Do not score students within first 30 days of CRM creation

**Human verification**

1. New CRM record (<30 days) — no score
2. Record >30 days with gates met — score appears

**Dependencies:** P5-T2

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P5-T4 — Unavailable activities must not penalise scores

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Unavailable activities do not negatively impact scores

**Human verification**

1. Student with unavailable (not applicable) activities — score not unfairly reduced

**Dependencies:** P5-T2

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 6: Alerts & Flags

**Phase status:** `not-started`

### P6-T1 — Remove Wellbeing Concern alert

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Remove Wellbeing Concern flag/alert from UI and generation logic

**Suggested files**

- `src/lib/studentWatchouts.ts`
- Grep: `Wellbeing`, `wellbeing`

**Human verification**

1. Confirm Wellbeing Concern no longer appears on any student

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P6-T2 — Rename alerts (Attendance Risk → Attendance Issues, Thriving → Engaged)

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

| Current | New |
|---------|-----|
| Attendance Risk | Attendance Issues |
| Thriving | Engaged |

**Human verification**

1. Grep UI for old labels — none remain
2. New labels visible on student flags/watchouts

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P6-T3 — Priority alerts (No Career Plan, Disengaged, Stalled)

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Keep: Attendance Issues, Disengaged, Stalled, No Career Plan, Engaged
- Priority attention: No Career Plan, Disengaged, Stalled

**Human verification**

1. Students with priority flags surface in advisories/needs-attention views
2. Retained flags still generate correctly

**Dependencies:** P6-T2

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 7: Follow-Up Logic

**Phase status:** `not-started`

### P7-T1 — Remove Support Levels

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Remove Support Levels (Standard / Elevated / High) from UI and scoring influence

**Human verification**

1. No support level selectors or badges visible

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P7-T2 — Remove Priority Cohort from scoring

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Priority Cohort no longer influences scoring

**Human verification**

1. Score unchanged by priority cohort assignment alone

**Dependencies:** P5 complete recommended

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P7-T3 — No automatic notifications/tasks

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- No automatic notifications or tasks generated from follow-up logic changes

**Human verification**

1. Trigger conditions that previously created tasks — confirm none auto-created

**Dependencies:** P7-T1

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P7-T4 — Needs Attention as primary staff trigger

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- **"Needs Attention"** is the primary trigger for staff review

**Human verification**

1. Students needing review appear under Needs Attention
2. Staff workflow starts from that entry point

**Dependencies:** P6-T3, P7-T1

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 8: Security & Permissions

**Phase status:** `not-started`

### P8-T1 — Remove wellbeing information visibility

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Remove visibility of wellbeing-related information from appropriate roles

**Human verification**

1. Log in as non-admin role — wellbeing fields hidden
2. Confirm no wellbeing data leaks in exports/summaries

**Dependencies:** P6-T1

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P8-T2 — ACCE Admin-only rating management

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Only ACCE Admin users can manage ratings

**Human verification**

1. Non-admin cannot edit ratings
2. ACCE Admin can manage ratings

**Dependencies:** none

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P8-T3 — No manual rating override

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- No manual rating override functionality (remove or do not build)

**Human verification**

1. Confirm no override UI exists for ratings

**Dependencies:** P8-T2

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

### P8-T4 — Audit logging for rating changes

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Maintain audit logging when ratings change

**Human verification**

1. Change a rating as admin
2. Confirm audit log entry recorded (DB or admin view)

**Dependencies:** P8-T2

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 9: Reporting Views

**Phase status:** `not-started`

### P9-T1 — Reporting scope views

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Reporting supports: Individual Student, School, Cohort, Year Level, Program
- Regional Summary **not** required

**Suggested files**

- `src/components/de/DeAnalyticsDashboard.tsx`
- `src/lib/deAnalyticsMetrics.ts`

**Human verification**

1. Open DE/analytics reporting
2. Confirm each required view works
3. Confirm Regional Summary absent or not promoted

**Dependencies:** P1–P6 data changes stable

**AI Notes:** _(empty)_

**Human Notes:** _(empty)_

---

## Phase 10: Validation & Testing

**Phase status:** `not-started`

Run after related phases are **human-verified**. AI may add/update automated tests; human still confirms in app.

### P10-T1 — Active/inactive school calculations

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Dependencies:** P1 human-verified

---

### P10-T2 — Active/inactive counsellor calculations

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Dependencies:** P1 human-verified

---

### P10-T3 — Inactive student summary generation

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Dependencies:** P4 human-verified

---

### P10-T4 — Scoring eligibility rules

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Dependencies:** P5 human-verified

---

### P10-T5 — Weighting calculations

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Dependencies:** P3 human-verified

---

### P10-T6 — Alert generation rules

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Dependencies:** P6 human-verified

---

## Quick commands

| Say this | AI does |
|----------|---------|
| `next task` | Next pending task in priority order |
| `work phase 1` | All P1 tasks sequentially |
| `status` | Progress table summary |
| `verified P1-T1` | Mark human-verified after your app check |
| `P1-T2 failed: counts still include test school` | Reset and fix |
