# EMCI Portal — Phase Map

> **Workflow:** Invoke the personal `phase-delivery` skill. AI marks `[~]` after coding; you verify in the running app before `[x]`.

**Last updated:** 2026-06-26 (detailed verification playbook)  
**Source checklist:** [To do updates.md](../To%20do%20updates.md)

## Human verification checkboxes

Use these while checking the running app. Tick in Cursor/VS Code preview or your markdown editor.


| Step checkbox                      | Meaning                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `[ ]`                              | Not checked yet                                                                                     |
| `[x]`                              | Step confirmed in the app                                                                           |
| **All steps pass — task verified** | Whole task signed off; also set task line above to `[x]` and Human Verified to `yes`                |
| **Flag for AI review**             | Something failed or needs investigation; note under **Human Notes** and tell AI `TASK-ID failed: …` |


---

## Verification playbook

Use this section to run through checks without guessing navigation or expected values.

### Before you start

1. Start the app: `npm run dev` (local URL is usually `http://localhost:5173`).
2. Log in with a **network-wide admin** account — **ACCE Admin** or **SecureLogic Admin**.
  School-only roles see one school; they cannot verify network KPI totals.
3. Wait for data to load (no red error banner at top). If data fails, click **Retry**.
4. Work in priority order (P1 → P2 → …). Only verify tasks marked `[~]` **AI complete** unless noted.

### Where things are in the app


| What you need            | How to get there                                |
| ------------------------ | ----------------------------------------------- |
| Dashboard KPI strip      | Sidebar → **Dashboard** (`/dashboard`)          |
| Schools table + KPIs     | Sidebar → **Schools** (`/schools`)              |
| Student roster           | Sidebar → **Students** (`/students`)            |
| Team / deactivated staff | Sidebar → **Team** (`/team`) — admin roles only |
| Single student profile   | Students or Schools → click a student row       |
| DE reporting             | Sidebar → **DE Analytics** (`/de/analytics`)    |


### Original checklist → phase map


| Original checklist item                           | Phase map task(s)       |
| ------------------------------------------------- | ----------------------- |
| Dashboard school summary cards                    | **P1-T1**               |
| Exclude test schools from statistics              | **P1-T2**               |
| Active / Total counsellor counts                  | **P1-T3**               |
| Exclude inactive/test counsellors from active     | **P1-T4**               |
| At Risk → Follow Up                               | **P2-T1**               |
| Job Ready wording (stakeholder approval)          | **P0-T1** (blocked)     |
| Growth & Wellbeing → Student Sentiment            | **P3-T1**               |
| Rating weightings 20/25/25/15/15                  | **P3-T2**               |
| Inactive student summaries                        | **P4-T1**, **P4-T2**    |
| Incorrect completion summaries (Charlie McDonald) | **P4-T3**, **P4-T4**    |
| Scoring & eligibility rules                       | **P5-T1** – **P5-T4**   |
| Alerts & flags cleanup                            | **P6-T1** – **P6-T3**   |
| Follow-up logic                                   | **P7-T1** – **P7-T4**   |
| Security & permissions                            | **P8-T1** – **P8-T4**   |
| Reporting views                                   | **P9-T1**               |
| Validation & testing (end-to-end)                 | **P10-T1** – **P10-T6** |
| Final DE wording review                           | **P0-T2** (blocked)     |


### How to sign off a task

1. Tick every step checkbox under **Human verification → Steps**.
2. If all pass: tick **All steps pass — task verified**, set task line to `[x]`, set **Human Verified** to `yes`, reply `verified P1-T1` (etc.) in chat.
3. If something fails: tick **Flag for AI review**, write what you saw under **Human Notes**, reply `P1-T1 failed: …` in chat.

### Phase 1 — one-session dashboard walkthrough

Run **P1-T1 → P1-T4** in a single session (~15–20 min). Keep a scratch pad for counts.


| Step | Action                                                                                        |
| ---- | --------------------------------------------------------------------------------------------- |
| 1    | Log in as ACCE Admin or SecureLogic Admin → open **Dashboard**                                |
| 2    | Complete **P1-T1** steps (school KPI labels + cross-check Schools table)                      |
| 3    | Complete **P1-T2** steps (test-school exclusion) using same Schools table                     |
| 4    | Complete **P1-T3** + **P1-T4** steps (counsellor KPIs; use **Team** + **Students** if needed) |
| 5    | Sign off each task individually when its steps all pass                                       |


**KPI strip reference (8 cards, left to right):**

1. Total Schools (Pilot Lifetime)
2. Active Schools
3. Inactive Schools
4. Total Students
5. Active Students
6. In Progress
7. Completed %
8. Active Counsellors

**Counting rules (what the app should do):**

- **Total Schools** = all non-test schools (names matching Secure Logic / test / demo are excluded).
- **Active Schools** = schools with status **Active** (among non-test schools only).
- **Inactive Schools** = schools with status **Inactive** (among non-test schools only).
- **Onboarding** schools count in **Total** only — not Active or Inactive. So Active + Inactive may be less than Total.
- **Active Counsellors** = unique counsellors with ≥1 **Active** student, excluding test/demo counsellors and platform-deactivated team members.

---

## Progress summary


| Phase | Name                    | Status      | Tasks | AI complete | Human verified |
| ----- | ----------------------- | ----------- | ----- | ----------- | -------------- |
| P0    | Awaiting Approval       | blocked     | 2     | 0/2         | 0/2            |
| P1    | Dashboard Metrics       | in-progress | 4     | 4/4         | 0/4            |
| P2    | Terminology — Follow Up | not-started | 1     | 0/1         | 0/1            |
| P3    | Progress Ratings        | not-started | 2     | 0/2         | 0/2            |
| P4    | Student Summary Logic   | not-started | 4     | 0/4         | 0/4            |
| P5    | Scoring & Eligibility   | not-started | 4     | 0/4         | 0/4            |
| P6    | Alerts & Flags          | not-started | 3     | 0/3         | 0/3            |
| P7    | Follow-Up Logic         | not-started | 4     | 0/4         | 0/4            |
| P8    | Security & Permissions  | not-started | 4     | 0/4         | 0/4            |
| P9    | Reporting Views         | not-started | 1     | 0/1         | 0/1            |
| P10   | Validation & Testing    | not-started | 6     | 0/6         | 0/6            |


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

- [x] **AI Status:** `blocked` · **Human Verified:** `no`

**Requirements**

- Review **"Job Ready"** wording with ACCE/DE stakeholders
- Evaluate alternatives: Job Skilled, Career Ready, Work Experience Ready
- Await final approval from Bronwyn

**Acceptance criteria**

- Approved label documented in phase map and checklist
- No UI copy changed until approval recorded

**Human verification**

**Steps**

- [ ] Confirm written approval from Bronwyn/DE is on file
- [ ] Reply `approval P0-T1: [chosen label]` to unblock P2 follow-on if needed

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P0-T2 — Department of Education wording

- [x] **AI Status:** `blocked` · **Human Verified:** `no`

**Requirements**

- Review all terminology against Department of Education feedback
- Final DE wording review before rollout

**Acceptance criteria**

- DE sign-off recorded; terminology list updated in phase map

**Human verification**

**Steps**

- [ ] Confirm DE feedback incorporated and signed off

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P2, P3, P6 terminology tasks ideally complete for full review

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

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

**Prerequisites**

- Logged in as **ACCE Admin** or **SecureLogic Admin** (network-wide scope).
- App loaded at `/dashboard` with no data error banner.

**Steps**

- [x] **Open Dashboard** — Sidebar → **Dashboard**. Confirm page title **Dashboard** and letterhead **Enhanced My Career Insights (Pilot Program)**. Subtitle should show **Network-wide scope** (not a single school name).
- [x] **Locate KPI strip** — White card grid directly under the letterhead. On a wide screen you should see **8** metric cards in one row (may wrap on smaller screens).
- [x] **Confirm school card labels (exact text)** — First three cards must read:
  - `Total Schools (Pilot Lifetime)`
  - `Active Schools`
  - `Inactive Schools`
- [x] **Confirm values are numbers** — Each of the three school cards shows a whole number (not blank, not "—", not an error).
- [x] **Open Schools list** — Sidebar → **Schools** (`/schools`). The same KPI strip appears at the top; note the three school counts — they must **match** the Dashboard counts.
- [x] **Count Active schools in the table** — In the schools table, count rows where **Status** column shows **Active** (green dot). Include test schools in this raw count for now.
- [x] **Count Inactive schools in the table** — Count rows where **Status** shows **Inactive** (grey dot). = 9
- [x] **Count Onboarding schools** — Count rows where **Status** shows **Onboarding** (blue dot). These should be included in **Total Schools (Pilot Lifetime)** but **not** in Active or Inactive KPIs.
- [x] **Cross-check Active KPI** — After excluding test/demo/Secure Logic schools (see P1-T2), your eligible Active count must equal the **Active Schools** KPI.
- [x] **Cross-check Inactive KPI** — After excluding test schools, eligible Inactive count must equal the **Inactive Schools** KPI.
- [x] **Cross-check Total KPI** — Eligible Active + Inactive + Onboarding (non-test only) must equal **Total Schools (Pilot Lifetime)**.
- [x] **Record counts in Human Notes** — Example: `Dashboard: Total=12 Active=8 Inactive=2 Onboarding=2; Schools table raw: Active=9 Inactive=2 (1 test school excluded)`.

**Expected result**

- Three school metrics visible with correct labels on both Dashboard and Schools pages.
- KPI counts align with Schools table status columns after test-school exclusion rules.

**Sign-off**

- [x] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** Added `Total Schools (Pilot Lifetime)`, `Active Schools`, and `Inactive Schools` KPI cards in `buildProgramKpiCards`. Onboarding schools count toward Total only. Dashboard/Schools KPI grid expanded to 9 columns.

**Human Notes:** *(empty)*

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

**Prerequisites**

- Complete P1-T1 navigation steps (Dashboard + Schools open).
- You can see the full schools table (paginate if needed).

**Steps**

- [x] **Find test/demo schools** — On **Schools** (`/schools`), use search box: try `Secure Logic`, then `test`, then `demo`. Note any matching school names and their **Status**.   I found Demo Schools Secure logic, test acce 

- [x] **Remove from directory** — Test/demo schools hidden from `/schools` for all roles (including SecureLogic Admin); data retained in Dataverse.

- [x] **Confirm test schools still listed** — ~~Test schools may appear in the schools **table** (that is OK)~~ **Updated:** test schools are no longer listed for ACCE/DE users; KPI exclusion unchanged.
- [x] **Manual eligible total** — Count all schools in table **minus** any whose name contains Secure Logic, "test", or "demo" (case-insensitive). Write this number down.
- [x] **Compare to Total Schools KPI** — **Total Schools (Pilot Lifetime)** on Dashboard must equal your manual eligible total (not the raw table row count if test schools exist).
- [x] **Verify test school excluded from Active/Inactive** — If a test school has status Active or Inactive, it must **not** increment the Active or Inactive KPI cards.
- [x] **Spot-check student KPIs** — On Dashboard, **Total Students** / **Active Students** should not include students whose only school is a test school.
- [x] **Spot-check Schools snapshot** — On Dashboard, scroll to **Schools Register — Largest Cohorts**. Test schools should not dominate this register if they have inflated test data (optional sanity check).
- [x] **Record in Human Notes** — List excluded school names and before/after counts. Example: `Excluded "Secure Logic Test School"; raw table 13 → KPI Total 12`.

**Expected result**

- Test/demo/Secure Logic schools never inflate dashboard KPI totals.
- Same exclusion applies on both `/dashboard` and `/schools` KPI strips.

**Sign-off**

- [x] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P1-T1

**AI Notes:** New `[src/lib/programStatsFilters.ts](../../src/lib/programStatsFilters.ts)` — excludes schools whose names match Secure Logic / test / demo patterns. Applied in KPI builder, stage distribution, and schools snapshot via `getProgramStatsScope`.

**Human Notes:** *(empty)*

---

### P1-T3 — Counsellor counts (Active)

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

**Requirements**

- Show Active Counsellors in the KPI strip

**Acceptance criteria**

- Active Counsellors reflects active assignments, not raw unique strings from students only

**Suggested files**

- `src/lib/networkProgramMetrics.ts`

**Human verification**

**Prerequisites**

- P1-T1 and P1-T2 school KPIs understood.
- Dashboard or Schools KPI strip visible.

**Steps**

- [ ] **Locate counsellor KPI card** — In the KPI strip, find the last card: **Active Counsellors** (card 8).
- [ ] **Note Active Counsellors value** — Write down the number shown.
- [ ] **Sanity check via Students roster** — Sidebar → **Students** (`/students`). Scan or filter for students with status **Active** and note distinct **Counsellor** names/emails on those rows.
- [ ] **Compare Active count** — The number of unique counsellors assigned to at least one Active student should match **Active Counsellors** (allow for deactivated/test exclusions in P1-T4).
- [ ] **Check inactive-only counsellors** — Find a counsellor who appears only on **Inactive** students (if any exist). They must **not** increment **Active Counsellors**.
- [ ] **Confirm not raw string count** — Active Counsellors should not simply equal "count of unique counsellor text fields" if some counsellors have zero active students.
- [ ] **Record in Human Notes** — Example: `Active=14; 2 counsellors with inactive-only assignments excluded`.

**Expected result**

- **Active Counsellors** = counsellors with ≥1 active student assignment (deduplicated by owner ID / email).

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [x] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P1-T1

**AI Notes:** Counsellor counts keyed by Dataverse `counsellorOwnerId` / `counsellorEmail`. Active = at least one Active student in stats scope. **Total Counsellors** KPI removed as redundant with Active in typical data.

**Human Notes:** *(empty)*

---

### P1-T4 — Exclude inactive/test counsellors from active metrics

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

**Requirements**

- Exclude inactive counsellors and test accounts from active counsellor metrics

**Acceptance criteria**

- Active counsellor count ignores inactive and test entries

**Human verification**

**Prerequisites**

- P1-T3 counsellor KPI values noted.
- Access to **Team** page (admin roles).

**Steps**

- [ ] **Find a deactivated counsellor** — Sidebar → **Team** (`/team`). Locate a team member with counsellor scope who is **inactive** / deactivated on the platform (if none exist, note "no deactivated counsellor in env" in Human Notes and skip to test-account check).
- [ ] **Check student assignments** — If that counsellor still has students assigned in **Students** roster, note whether any students are **Active**.
- [ ] **Verify excluded from Active Counsellors** — Deactivated counsellors must **not** increment **Active Counsellors**, even if they have active student records in Dataverse.
- [ ] **Find test counsellor accounts** — Search Students roster for counsellor name/email containing `test`, `demo`, or `securelogic`.
- [ ] **Verify test counsellors excluded** — Test/demo counsellors must **not** appear in **Active Counsellors**.
- [ ] **Re-read KPI strip** — Return to **Dashboard**; confirm **Active Counsellors** still matches expectations after both exclusion rules.
- [ ] **Record in Human Notes** — Names/emails of excluded counsellors and resulting KPI values.

**Expected result**

- Platform-deactivated counsellors excluded from **Active Counsellors**.
- Test/demo/Secure Logic counsellor identities excluded from both counsellor KPIs.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [x] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P1-T3

**AI Notes:** Test counsellors excluded via email/name patterns in `programStatsFilters`. Platform-deactivated counsellors resolved from `emci_user_roles` (`teamMembers` in shell context) via `buildDeactivatedCounsellorKeys`. Unit tests: `npx tsx --test src/lib/networkProgramMetrics.test.ts` (6 pass).

**Human Notes:** *(empty)*

---

## Phase 2: Terminology — Follow Up

**Phase status:** `in-progress`

### P2-T1 — Rename "At Risk" → "Follow Up"

- [~] **AI Status:** `ai-complete` · **Human Verified:** `no`

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

**Prerequisites**

- Task implemented (`[~]` or `[x]`). Use ACCE Admin or role that sees student roster.

**Steps**

- [ ] **Students roster filters** — Sidebar → **Students**. Open filter controls. Any category previously labelled **At Risk** must now read **Follow Up**.
- [ ] **Student type badges** — In the roster table, students flagged for follow-up must show **Follow Up** (not "At Risk") on badges/chips.
- [ ] **Dashboard advisories** — Sidebar → **Dashboard**. In the advisories / watchouts section, confirm **Follow Up** wording (no "At Risk").
- [ ] **Schools page advisories** — If advisories appear on **Schools** or school detail views, repeat the check.
- [ ] **Global text search** — Browser find (Ctrl+F): search `At Risk` on Dashboard, Students, and a student profile page. No user-visible matches should remain.
- [ ] **Record locations checked** — Note pages searched in Human Notes.

**Expected result**

- All user-facing copy says **Follow Up**; internal data keys may still use legacy values.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** Added `formatStudentTypeLabel()` and `formatCohortLabel()` display mappers. Updated roster filters, profile/PDF fields, dashboard advisories, roster subtitles, and DE cohort charts. Internal `studentType: 'At Risk'` seed values unchanged.

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

**Steps**

- [ ] **Open a rated student** — Students → pick a student with progress ratings → open rating/progress section.
- [ ] **Find rating area list** — Locate the five rating areas. The area formerly named **Growth & Wellbeing** must display as **Student Sentiment**.
- [ ] **Check exports/PDF if available** — Open student PDF/summary (if in scope for your role); confirm same label there.
- [ ] **Browser find** — Ctrl+F for `Growth & Wellbeing` on the student page — no user-visible matches.

**Expected result**

- Display label is **Student Sentiment** everywhere the old name appeared.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P3-T2 — Update rating weightings

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**


| Rating Area                   | Weight |
| ----------------------------- | ------ |
| Engagement                    | 20%    |
| Career Planning & Exploration | 25%    |
| Work Readiness                | 25%    |
| Attendance & Momentum         | 15%    |
| Student Sentiment             | 15%    |


**Acceptance criteria**

- Weights sum to 100%
- Career Planning and Work Readiness are highest weighted
- Composite scores recalculate with new weights

**Suggested files**

- Rating weight config (grep `weight`, rating category keys)
- `src/lib/studentRatingStorage.ts`

**Human verification**

**Steps**

- [ ] **Open student with full ratings** — Pick a student with data in all five rating areas.
- [ ] **Confirm weight labels** — Each area shows the correct weight:


| Area                          | Expected weight |
| ----------------------------- | --------------- |
| Engagement                    | 20%             |
| Career Planning & Exploration | 25%             |
| Work Readiness                | 25%             |
| Attendance & Momentum         | 15%             |
| Student Sentiment             | 15%             |


- [ ] **Confirm highest weights** — Career Planning & Exploration and Work Readiness are the two largest (25% each).
- [ ] **Weights sum to 100%** — Visual labels or legend should total 100%.
- [ ] **Composite score** — Note overall/composite score; if you have before/after reference data, confirm it changed appropriately (optional).
- [ ] **Record sample student** — Note student name/ID and composite score in Human Notes.

**Expected result**

- Weights match table; composite recalculates using new weighting.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P3-T1

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

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

**Steps**

- [ ] Open inactive student profile
- [ ] Confirm summary does not imply active engagement

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

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

**Steps**

- [ ] View inactive student summary — confirm wording matches spec

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P4-T1

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

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

**Steps**

- [ ] Reproduce or simulate low-session student
- [ ] Confirm completion summary only when thresholds met
- [ ] Re-check Charlie McDonald or equivalent test record if available

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P4-T1

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P4-T4 — Completion threshold enforcement

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Implement/fix completion thresholds identified in P4-T3 investigation

**Acceptance criteria**

- Code enforces minimum sessions/surveys before "successful completion" summary

**Human verification**

**Steps**

- [ ] Low-session student does not get successful completion summary
- [ ] Student meeting thresholds gets correct completion summary
- [ ] Charlie McDonald or equivalent edge case resolved

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P4-T3

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

## Phase 5: Scoring & Eligibility

**Phase status:** `not-started`

### P5-T1 — EMCI program naming

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- **EMCI** = Enhanced My Career Insights (Pilot Program) in user-facing references

**Human verification**

**Steps**

- [ ] Find EMCI references in UI/help copy — confirm full name where appropriate

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P5-T2 — Score eligibility gates

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Only calculate scores when ALL true:
  - At least 1 EMCI session exists
  - Initial Student Survey completed
  - At least 1 Satisfaction Survey completed

**Human verification**

**Steps**

- [ ] Student missing one gate — no score displayed
- [ ] Student meeting all gates — score calculated

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P5-T3 — 30-day CRM creation grace period

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Do not score students within first 30 days of CRM creation

**Human verification**

**Steps**

- [ ] New CRM record (<30 days) — no score
- [ ] Record >30 days with gates met — score appears

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P5-T2

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P5-T4 — Unavailable activities must not penalise scores

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Unavailable activities do not negatively impact scores

**Human verification**

**Steps**

- [ ] Student with unavailable (not applicable) activities — score not unfairly reduced

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P5-T2

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

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

**Steps**

- [ ] Confirm Wellbeing Concern no longer appears on any student

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P6-T2 — Rename alerts (Attendance Risk → Attendance Issues, Thriving → Engaged)

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**


| Current         | New               |
| --------------- | ----------------- |
| Attendance Risk | Attendance Issues |
| Thriving        | Engaged           |


**Human verification**

**Steps**

- [ ] Grep UI for old labels — none remain
- [ ] New labels visible on student flags/watchouts

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P6-T3 — Priority alerts (No Career Plan, Disengaged, Stalled)

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Keep: Attendance Issues, Disengaged, Stalled, No Career Plan, Engaged
- Priority attention: No Career Plan, Disengaged, Stalled

**Human verification**

**Steps**

- [ ] Students with priority flags surface in advisories/needs-attention views
- [ ] Retained flags still generate correctly

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P6-T2

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

## Phase 7: Follow-Up Logic

**Phase status:** `not-started`

### P7-T1 — Remove Support Levels

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Remove Support Levels (Standard / Elevated / High) from UI and scoring influence

**Human verification**

**Steps**

- [ ] No support level selectors or badges visible

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P7-T2 — Remove Priority Cohort from scoring

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Priority Cohort no longer influences scoring

**Human verification**

**Steps**

- [ ] Score unchanged by priority cohort assignment alone

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P5 complete recommended

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P7-T3 — No automatic notifications/tasks

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- No automatic notifications or tasks generated from follow-up logic changes

**Human verification**

**Steps**

- [ ] Trigger conditions that previously created tasks — confirm none auto-created

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P7-T1

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P7-T4 — Needs Attention as primary staff trigger

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- **"Needs Attention"** is the primary trigger for staff review

**Human verification**

**Steps**

- [ ] Students needing review appear under Needs Attention
- [ ] Staff workflow starts from that entry point

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P6-T3, P7-T1

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

## Phase 8: Security & Permissions

**Phase status:** `not-started`

### P8-T1 — Remove wellbeing information visibility

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Remove visibility of wellbeing-related information from appropriate roles

**Human verification**

**Steps**

- [ ] Log in as non-admin role — wellbeing fields hidden
- [ ] Confirm no wellbeing data leaks in exports/summaries

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P6-T1

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P8-T2 — ACCE Admin-only rating management

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Only ACCE Admin users can manage ratings

**Human verification**

**Steps**

- [ ] Non-admin cannot edit ratings
- [ ] ACCE Admin can manage ratings

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** none

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P8-T3 — No manual rating override

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- No manual rating override functionality (remove or do not build)

**Human verification**

**Steps**

- [ ] Confirm no override UI exists for ratings

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P8-T2

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

### P8-T4 — Audit logging for rating changes

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Requirements**

- Maintain audit logging when ratings change

**Human verification**

**Steps**

- [ ] Change a rating as admin
- [ ] Confirm audit log entry recorded (DB or admin view)

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P8-T2

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

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

**Steps**

- [ ] Open DE/analytics reporting
- [ ] Confirm each required view works
- [ ] Confirm Regional Summary absent or not promoted

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P1–P6 data changes stable

**AI Notes:** *(empty)*

**Human Notes:** *(empty)*

---

## Phase 10: Validation & Testing

**Phase status:** `not-started`

Run after related phases are **human-verified**. AI may add/update automated tests; human still confirms in app.

### P10-T1 — Active/inactive school calculations

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Human verification**

**Steps**

- [ ] Re-run **P1-T1** and **P1-T2** steps end-to-end as a regression pass.
- [ ] **Dashboard Active/Inactive** match Schools table (after test-school exclusion).
- [ ] **Onboarding** schools in Total only.
- [ ] **Test/demo schools** excluded from KPI totals.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P1 human-verified

---

### P10-T2 — Active/inactive counsellor calculations

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Human verification**

**Steps**

- [ ] Re-run **P1-T3** and **P1-T4** steps end-to-end as a regression pass.
- [ ] **Active Counsellors** matches counsellors with active student assignments (minus exclusions).
- [ ] **Deactivated/test counsellors** excluded from Active count.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P1 human-verified

---

### P10-T3 — Inactive student summary generation

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Human verification**

**Steps**

- [ ] **Find inactive student** — Students → filter or search status **Inactive** → open profile.
- [ ] **Read AI/summary section** — Summary must not imply ongoing active engagement.
- [ ] **Repeat for 2+ students** — Spot-check across different schools if possible.
- [ ] **Record student IDs checked** in Human Notes.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P4 human-verified

---

### P10-T4 — Scoring eligibility rules

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Human verification**

**Steps**

- [ ] **Student missing a gate** — Find student without session, initial survey, or satisfaction survey → confirm **no score** shown.
- [ ] **Student meeting all gates** — Find student with session + both surveys → confirm score **is** calculated.
- [ ] **30-day grace** — Find CRM record created within last 30 days → confirm no score even if surveys exist.
- [ ] **Record which students tested** in Human Notes.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P5 human-verified

---

### P10-T5 — Weighting calculations

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Human verification**

**Steps**

- [ ] Re-run **P3-T2** weight label checks.
- [ ] **Composite score** on a sample student reflects 20/25/25/15/15 weighting.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P3 human-verified

---

### P10-T6 — Alert generation rules

- [ ] **AI Status:** `pending` · **Human Verified:** `no`

**Human verification**

**Steps**

- [ ] **Priority alerts** — Students with No Career Plan, Disengaged, or Stalled appear in advisories / needs-attention views.
- [ ] **Removed alert** — Wellbeing Concern does not appear anywhere.
- [ ] **Renamed alerts** — Attendance Issues and Engaged show new labels (not Attendance Risk / Thriving).
- [ ] **Record sample students** for each alert type in Human Notes.

**Sign-off**

- [ ] **All steps pass — task verified** (set task checkbox `[x]` and Human Verified to `yes`)
- [ ] **Flag for AI review** — note issue under Human Notes; say `TASK-ID failed: …` in chat

**Dependencies:** P6 human-verified

---

## Quick commands


| Say this                                         | AI does                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `next task`                                      | Next pending task in priority order                                              |
| `work phase 1`                                   | All P1 tasks sequentially                                                        |
| `status`                                         | Progress table summary                                                           |
| `verified P1-T1`                                 | Mark human-verified after your app check (or tick **All steps pass** in the map) |
| `P1-T2 failed: counts still include test school` | Reset and fix (or tick **Flag for AI review** in the map)                        |


