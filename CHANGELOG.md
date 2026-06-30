# EMCI — Changelog

All notable changes to the EMCI — Enhanced My Career Insights (Pilot Program) portal are documented here.  
Entries are ordered newest-first within each release.

---

## — 2026-06-30 (latest)

### Added: Cloudflare Turnstile on School / DE email login

- School and Department of Education sign-in now shows a Cloudflare Turnstile challenge and passes the token to Supabase Auth (`signInWithPassword` with `captchaToken`), matching **Authentication → Attack Protection → Turnstile** in the Supabase dashboard ([`src/components/LoginPage.tsx`](src/components/LoginPage.tsx), [`src/services/supabase.ts`](src/services/supabase.ts)).
- Set `VITE_TURNSTILE_SITE_KEY` in Vercel (and local `.env`) from your Turnstile widget; the secret stays in Supabase only. Add `localhost` to the widget hostnames for local testing.

### Fixed: Invite link "invalid" on refresh/reopen instead of staying usable for the hour

- Root cause: the `/auth/confirm` page called `verifyOtp` **on open**, which consumes the single-use token immediately. Any refresh or reopen (even in the same browser) re-verified the now-dead token and returned `403` (`otp_expired` / "One-time token not found"), so the link appeared to break well within the 1-hour window. Confirmed against auth logs (every `verify 200` was followed by repeated `verify 403`).
- Token verification is now **deferred until the user submits their password**. On open, the page validates only the time window (`issued_at` + 1 hour) and shows the password form, holding the token in memory. The token is consumed once, at submit, via `verifyOtp` (a POST — GET link-prefetch scanners still don't consume it). This makes the link reusable from any browser/device until it is actually used or the hour expires ([`src/components/auth/AuthConfirm.tsx`](src/components/auth/AuthConfirm.tsx)).
- If the token was already consumed (e.g. submitted in another tab), submit falls back to an existing session in that browser; otherwise the link is treated as spent.

**Supabase Dashboard (required):** **Authentication → Providers → Email → Email OTP Expiration** must be **≥ 3600** seconds, since the token now needs to remain valid server-side for the full hour (previously it was consumed on first click).

### Ops: Supabase auth email rate limit blocks invite resends during testing

- Invite emails are sent by **Supabase Auth** (`inviteUserByEmail`), not EMCI app code. Auth logs show `over_email_send_rate_limit` (429) after two successful invites in the same hour.
- With the **built-in** Supabase mailer (`noreply@mail.app.supabase.io`), the project-wide limit is **2 auth emails per hour** and **cannot be raised** until custom SMTP is configured.
- **To increase:** [Authentication → SMTP Settings](https://supabase.com/dashboard/project/vklwppadgogepkeaizow/auth/smtp) (custom SMTP, e.g. SendGrid/Resend for `acce.org.au`), then [Authentication → Rate Limits](https://supabase.com/dashboard/project/vklwppadgogepkeaizow/auth/rate-limits) → raise **Rate limit for sending emails** (`rate_limit_email_sent`; e.g. **100–200/hour** for admin onboarding). Built-in SMTP must be replaced first — the email limit slider is only available with custom SMTP.
- **Immediate workaround:** wait up to one hour from the last successful invite before re-sending, or use the invite link already delivered instead of delete + re-add (each attempt counts toward the hourly cap even when the user row already exists).

### Changed: Invite links expire after 1 hour (time-based, not page session)

- Invite emails now embed `issued_at` in the confirmation link and the app enforces a **1-hour** window from when the invite was sent — closing the browser tab no longer determines whether the link still works ([`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts), [`src/lib/inviteLink.ts`](src/lib/inviteLink.ts), [`src/components/auth/AuthConfirm.tsx`](src/components/auth/AuthConfirm.tsx), [`src/App.tsx`](src/App.tsx), [`supabase/email-templates/invite-user.html`](supabase/email-templates/invite-user.html)).
- After the token is verified, pending password setup is stored in `localStorage` with the same deadline so invited users can return to `/auth/confirm` within the hour to finish creating their password.
- Invite email copy updated from 24 hours to **1 hour**.

**Supabase Dashboard:** confirm **Authentication → Providers → Email → Email OTP Expiration** is **3600** seconds (1 hour), re-paste the updated **Invite user** template from [`supabase/email-templates/invite-user.html`](supabase/email-templates/invite-user.html), and redeploy the `invite-user` edge function.

### Fixed: Removing a user left an orphaned Supabase Auth account

- Permanent user removal now deletes the Supabase Auth account by **email** when the role row has no linked `user_id`, in addition to the existing `user_id` path ([`supabase/functions/delete-user/index.ts`](supabase/functions/delete-user/index.ts), [`src/services/supabase.ts`](src/services/supabase.ts), [`src/components/TeamManagement.tsx`](src/components/TeamManagement.tsx)). Redeployed the edge function (version 3).
- Root cause: the function only called `auth.admin.deleteUser` when the role row carried a `user_id`. Members still in the "pending" state (null `user_id`) had their role row deleted but their Auth login left behind — so the account remained in Supabase **Authentication → Users** and the email stayed reserved against future invites.
- The `email` is now passed from the UI through to the function, which resolves the matching Auth user and hard-deletes it (the `ON DELETE CASCADE` on `emci_user_roles.user_id` then clears the role row).

### Fixed: Invite acceptance landed on the login screen instead of password/MFA setup

- Corrected the invite redirect domain from `https://acce.org.au` to the actual app origin `https://emci.acce.org.au` in the `invite-user` edge function default and `.env.example` ([`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts), [`.env.example`](.env.example)). Redeployed the edge function (version 2).
- Root cause: invited users were sent through Supabase's default `GET /auth/v1/verify` link (confirmed in auth logs), which verifies the token server-side and redirects past the EMCI `/auth/confirm` page — so the **Create your password** and **two-factor (MFA) enrolment** screens were skipped and users landed on the sign-in screen.

**Supabase Dashboard (required to complete the fix):** set **Authentication → URL Configuration → Site URL** to `https://emci.acce.org.au` and add `https://emci.acce.org.au/**` to **Redirect URLs**; re-paste the custom **Invite user** email template from [`supabase/email-templates/invite-user.html`](supabase/email-templates/invite-user.html) (the default `{{ .ConfirmationURL }}` template was still active). Also set the secret: `supabase secrets set APP_SITE_URL=https://emci.acce.org.au`.

---

## — 2026-06-29

### Fixed: Semgrep static analysis findings

- Hardened a diagnostic log in the Dataverse paged fetch: the dynamic `errorLabel` is now passed as a `console.warn` argument instead of being interpolated into the format string, removing a format-string injection smell ([`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Documented and suppressed three `detect-non-literal-regexp` false positives where the dynamic input is already sanitised via `escapeRegExp()` and case-insensitive global matching requires a `RegExp` ([`src/lib/studentRedaction.ts`](src/lib/studentRedaction.ts), [`src/redaction/smartRedaction.ts`](src/redaction/smartRedaction.ts)).

### Removed: DE Analytics sidebar nav (P9-T1)

- **DE Analytics** removed from the main sidebar; reporting scope views are out of scope for this release ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx), [`src/routes/MainShell.tsx`](src/routes/MainShell.tsx)).

### Changed: Counsellor View layout and student roster

- Counsellor profile stats (totals, completion, stages, Morrisby counts) are consolidated into a full-width minimalist header strip ([`src/components/CounsellorView.tsx`](src/components/CounsellorView.tsx)).
- Counsellor View now uses the same sortable, filterable student roster table as the Network **Students** view, with the counsellor column hidden ([`src/components/NetworkStudentRoster.tsx`](src/components/NetworkStudentRoster.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).

### Fixed: Counsellor View header stacking on switch

- Switching counsellors in the sidebar no longer stacks multiple profile headers; the detail panel remounts via `AnimatePresence mode="wait"` ([`src/components/CounsellorView.tsx`](src/components/CounsellorView.tsx)).

### Changed: Counsellor assignment uses student record owner only

- Student counsellor identity now comes solely from the WLPC student record `_ownerid_value` (Dataverse owner); the previous override from the most recent session owner was removed ([`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Counsellor View groups and counts students by owner GUID (via roster key), not display name ([`src/components/CounsellorView.tsx`](src/components/CounsellorView.tsx), [`src/lib/programStatsFilters.ts`](src/lib/programStatsFilters.ts)).
- Counsellor matching no longer falls back to email or display name; students and scoped portal users must have a Dataverse owner GUID ([`src/types/roles.ts`](src/types/roles.ts), [`src/lib/programStatsFilters.ts`](src/lib/programStatsFilters.ts), [`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts)).

### Added: Portal inactive counsellor overrides

- New `emci_inactive_counsellors` table stores Dataverse owner GUIDs that should be treated as inactive in Counsellor View and **Active Counsellors** KPIs ([`supabase/migrations/20260629140000_emci_inactive_counsellors.sql`](supabase/migrations/20260629140000_emci_inactive_counsellors.sql)).
- Patricia Crilly marked inactive via portal override and duplicate-Dataverse-user name matching (students owned by `7cbb0112-034e-ef11-a316-6045bde53c6c`, disabled duplicate `13684b43-6127-ee11-9965-0022489334a7`).
- SecureLogic Admin sees Dataverse owner UUIDs on Counsellor View sidebar and profile header ([`src/components/CounsellorView.tsx`](src/components/CounsellorView.tsx)).

### Changed: Counsellor active/inactive from Dataverse

- Counsellor View now splits the sidebar into **active** and **Inactive** counsellors. Disabled Dataverse users (`systemuser.isdisabled = true`) and platform-deactivated team members no longer appear in the active list ([`src/components/CounsellorView.tsx`](src/components/CounsellorView.tsx), [`src/lib/programStatsFilters.ts`](src/lib/programStatsFilters.ts)).
- **Active Counsellors** KPI also excludes Dataverse-disabled counsellors, in addition to platform-deactivated and test accounts ([`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Documented `systemusers.isdisabled` in [`DATAVERSE_CONNECTION_REFERENCE.md`](DATAVERSE_CONNECTION_REFERENCE.md).

### Changed: Dashboard student KPI strip

- Removed **In Progress** from the Dashboard and Schools KPI strip; **Total Students** is now labelled **Total Students (Pilot Lifetime)** to match the school KPI naming ([`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).

### Changed: Schools renamed to Schools / Campuses

- Sidebar nav, schools directory page title, KPI labels (**Total / Active / Inactive Schools / Campuses**), dashboard register links, counsellor school filters, and related search placeholders now use **Schools / Campuses** terminology ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`src/components/dashboard/DashboardQuickAccess.tsx`](src/components/dashboard/DashboardQuickAccess.tsx), [`src/components/dashboard/DashboardSchoolsSnapshot.tsx`](src/components/dashboard/DashboardSchoolsSnapshot.tsx)).

### Removed: EMCI Assistant chat

- Removed the floating **Ask EMCI Assistant** button and chat drawer from the student journey page, along with the `chat-student` edge function, chat hook/context, and `react-markdown` / `remark-gfm` dependencies ([`src/routes/StudentJourneyRoute.tsx`](src/routes/StudentJourneyRoute.tsx)).

### Removed: Support Levels (P7-T1)

- Removed Standard / Elevated / High support levels from the tracking rating model and watch-out logic; priority cohort and year level no longer derive a support-need tier ([`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`src/lib/studentWatchouts.ts`](src/lib/studentWatchouts.ts)). Legacy stored ratings drop the field on read.

### Added: Priority alerts surfacing (P6-T3)

- **No Career Plan**, **Disengaged**, and **Stalled** now generate as priority watch-outs (action severity) on student journeys, including AI flag handlers for `no_career_plan`, `disengaged`, and `stalled` ([`src/lib/studentWatchouts.ts`](src/lib/studentWatchouts.ts)).
- Dashboard and school **Advisories** show a priority-attention count when any scoped student has one of these alerts ([`src/components/dashboard/DashboardAdvisories.tsx`](src/components/dashboard/DashboardAdvisories.tsx), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx), [`src/components/SchoolDashboard.tsx`](src/components/SchoolDashboard.tsx)).
- Network and school rosters show a **Needs Attention** pill for priority-alert students ([`src/components/StudentRosterNameMeta.tsx`](src/components/StudentRosterNameMeta.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx)).
- Bulk rating fetch now includes AI `flags` for roster-level detection ([`src/hooks/useStudentRatingScores.ts`](src/hooks/useStudentRatingScores.ts), [`supabase/migrations/20260629120000_list_student_rating_flags.sql`](supabase/migrations/20260629120000_list_student_rating_flags.sql)).

### Changed: Alert label renames (P6-T2)

- Student watch-outs now show **Attendance Issues** (was “High absences” / Attendance Risk) and **Engaged** (was Thriving); internal AI flag keys `attendance_risk` and `thriving` are unchanged ([`src/lib/studentWatchouts.ts`](src/lib/studentWatchouts.ts), [`src/components/StudentWatchouts.tsx`](src/components/StudentWatchouts.tsx)).

### Changed: Wellbeing Concern alert naming (P6-T1)

- The AI watch-out formerly labelled **Wellbeing Concern** (`wellbeing_concern`) now uses **Sentiment concern** / `sentiment_concern` in watch-outs, rating flags, and `rate-student` output; legacy stored flags migrate on read ([`src/lib/studentWatchouts.ts`](src/lib/studentWatchouts.ts), [`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`src/lib/studentRatingStorage.ts`](src/lib/studentRatingStorage.ts), [`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)). Alert behaviour is unchanged.

### Added: Advanced roster filter by session count

- The student roster **Filters** panel now includes a **Sessions** control to narrow the list by EMCI session count (none, 1, 2–3, or 4+) ([`src/components/StudentRosterAdvancedFilters.tsx`](src/components/StudentRosterAdvancedFilters.tsx)).

### Added: Network Students referral date column filter

- The **Students** roster on the Schools/Students view now includes a **Referral Date** column (CRM `createdon`), sortable and filterable by month via the column header dropdown ([`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).

### Changed: Score eligibility (P5-T2)

- Tracking scores require **at least 2 real EMCI sessions** instead of the previous three-gate rule (session + Initial Student Survey + Satisfaction Survey) ([`src/lib/studentRating.ts`](src/lib/studentRating.ts)).
- The rating hook skips auto-generation, manual generation, and cached score display when eligibility is not met ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts), [`src/components/StudentRatingBadge.tsx`](src/components/StudentRatingBadge.tsx)).
- Student roster score column hides scores for ineligible students ([`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/App.tsx`](src/App.tsx)).

### Added: 30-day CRM creation grace period (P5-T3)

- Tracking scores are withheld for the first **30 days** after a student CRM record is created (`createdon`), even when the student has 2+ EMCI sessions ([`src/lib/studentRating.ts`](src/lib/studentRating.ts)).
- Rating hook, roster score column, and badge respect the combined P5-T2 + P5-T3 eligibility check ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts), [`src/App.tsx`](src/App.tsx)).

### Fixed: SearchableDropdown panel placement crash

- Restored missing `VIEWPORT_MARGIN_PX` constant so dropdown panels compute position without a runtime `ReferenceError` ([`src/components/ui/SearchableDropdown.tsx`](src/components/ui/SearchableDropdown.tsx)).

### Changed: EMCI program naming consistency (P5-T1)

- Added canonical program naming constants in [`src/lib/programNaming.ts`](src/lib/programNaming.ts) (`EMCI_PROGRAM_NAME`, `EMCI_BRAND`, `EMCI_PLATFORM`, `EMCI_PLATFORM_ADMINISTRATOR`).
- Auth, maintenance, loading, dashboard/school footers, sidebar subtitle, PDF export subtitle, and invite email now use the full name **Enhanced My Career Insights (Pilot Program)** where users first encounter the product.
- PDF export header now shows the full program name beside the logo instead of the legacy Education, Monitoring & Curriculum Improvement Department lines ([`src/components/PdfPreview.tsx`](src/components/PdfPreview.tsx)).
- CRM timeline labels, role titles, feature eyebrows, and P4-approved inactive-student copy remain abbreviated as **EMCI** where context is already established.

### Changed: Dataverse survey fetch logging

- Removed per-entity console logging on survey activity fetches (record counts and `_regardingobjectid_value` coverage) from the browser console ([`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Fetch-failure and zero-student-link warnings are unchanged.

### Fixed: Voice sentiment analyser firing without source data

- Student Voice & Sentiment no longer invokes the AI edge function when there are no survey responses, session feedback, or relevant notes to analyse ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts), [`src/hooks/useStudentSentiment.ts`](src/hooks/useStudentSentiment.ts)).
- The card now shows the empty state immediately instead of a loading spinner when no voice data exists.

### Fixed: Sentiment card stuck on "Analysing…" for early-stage students

- Students before the career-guidance stage (e.g. at Referral) no longer show a permanent "Analysing student voice and sentiment…" spinner. The card now reads the hook's `too_early` display state and shows the empty state, since analysis does not auto-generate until the student reaches career guidance ([`src/components/StudentSentimentCard.tsx`](src/components/StudentSentimentCard.tsx)).

### Changed: Stronger sensitive-information redaction

- Tier-1 (deterministic) redaction now also catches living/care arrangements (e.g. "lives primarily with her Nan and cousins", grandparents, aunts/uncles, cousins, siblings, kinship), descriptions of a "complex family situation/circumstances", and wellbeing disclosures such as trauma / trauma-informed needs, emotional-regulation difficulties, absconding, behavioural concerns, and attachment ([`src/redaction/sensitivePatterns.ts`](src/redaction/sensitivePatterns.ts)).
- Tier-2 (AI deep scan) prompt expanded to explicitly flag family/living situation, trauma and behavioural/emotional profiling of a minor, and to redact whole sentences (not minimal fragments) when a note is largely a personal profile ([`supabase/functions/redact-sensitive/index.ts`](supabase/functions/redact-sensitive/index.ts)).
- Routine programme content and neutral practitioner guidance (career interests, praise, clear expectations, consent status) remain unredacted.
- `[Redacted — sensitive]` tokens now render as a small orange pill badge in timeline, context panel, and survey views ([`src/components/ui/RedactedText.tsx`](src/components/ui/RedactedText.tsx)).

### Changed: Inactive student journey layout

- Inactive student profiles now default to a minimal view: student record, inactive status copy, and Quick Insights only ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- **Show historical data** reveals programme progress, archived sentiment, watchouts, and the activity timeline without tracking indicators or AI regeneration.
- Tracking scores no longer load or auto-generate for inactive students ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Changed: Inactive student summary wording (P4-T2)

- Inactive students now show approved alternate copy instead of AI-generated active-engagement summaries on the journey page, context panel, PDF export, and redacted overview ([`src/lib/inactiveStudentCopy.ts`](src/lib/inactiveStudentCopy.ts), [`src/components/StudentSentimentCard.tsx`](src/components/StudentSentimentCard.tsx), [`src/components/ContextPanel.tsx`](src/components/ContextPanel.tsx), [`src/hooks/useStudentSentiment.ts`](src/hooks/useStudentSentiment.ts), [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts)).
- Copy: *"This student is no longer active in the EMCI program."* and *"Participation ceased before program completion."*

### Changed: Student journey layout — sentiment replaces analysis summary

- Removed the **Analysis Summary** card from the student journey page; it no longer auto-runs on page load ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts)).
- **Student Voice & Sentiment** now occupies the primary left column beside Quick Insights (replacing the former Analysis Summary slot) ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/StudentSentimentCard.tsx`](src/components/StudentSentimentCard.tsx)).
- Cached analysis data is still loaded for PDF export when available; generation is no longer triggered automatically on the journey page.

### Changed: Tracking score rubric weightings

- Updated category weights to Engagement 20%, Career Planning & Exploration 25%, Work Readiness 25%, Attendance & Momentum 15%, and Student Sentiment 15% ([`src/lib/studentRating.ts`](src/lib/studentRating.ts)).
- Stored ratings now reapply current weights and recompute the composite score on read ([`src/lib/studentRatingStorage.ts`](src/lib/studentRatingStorage.ts)).
- Rating breakdown labels updated to match the rubric area names ([`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx)).

### Fixed: Student roster Filters dropdown layout and clipping

- The **Filters** popover now renders in a viewport-aware fixed portal so it is not clipped by parent `overflow-hidden` containers ([`src/components/StudentRosterAdvancedFilters.tsx`](src/components/StudentRosterAdvancedFilters.tsx)).
- Header, scrollable filter fields, and **Done** footer use a three-row grid so the last filters are no longer hidden behind the footer; panel height adapts to available viewport space and flips above the trigger when needed.
- Nested filter dropdowns (`SearchableDropdown`) now render option panels in a fixed viewport portal so they are not clipped by the scrollable filter body ([`src/components/ui/SearchableDropdown.tsx`](src/components/ui/SearchableDropdown.tsx)).

### Added: Student roster column header filters and sorting

- Network **Students** table headers now use the same hover checkbox filter panel and click-to-sort behaviour as the Schools directory ([`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/components/SchoolColumnFilterDropdown.tsx`](src/components/SchoolColumnFilterDropdown.tsx)).
- Filterable columns: Year, School, Counsellor (staff view), Current Stage, and Status; active filters show a dot on the header; toolbar **Clear** resets search, toolbar filters, column filters, and sort.

### Fixed: Student roster table responsiveness on smaller screens

- Trimmed the student roster table cell padding and lowered its minimum width so all columns fit on standard laptop screens without horizontal (shift) scrolling; it only scrolls horizontally on genuinely small viewports, with responsive content padding and a wrapping pagination row ([`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).

### Fixed: Follow Up flag only after 90+ days without contact

- The student roster **Follow Up** flag (and related dashboard advisories) now appears only when a student has had no EMCI activity for more than **90 days** — not from absence count alone ([`src/lib/deAnalyticsMetrics.ts`](src/lib/deAnalyticsMetrics.ts), [`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Completed and inactive students are excluded from follow-up flagging; severity tiers (Low / Medium / High) reflect how long since last activity.
- Roster, network overview, and school dashboard views use the shared `isFlaggedForFollowUp` helper ([`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx), [`src/components/SchoolDashboard.tsx`](src/components/SchoolDashboard.tsx)).

### Changed: Student roster name subtitle — sessions count and Follow Up pill

- Under each student name, the Morrisby/registration ID is replaced with **session count** (e.g. `2 sessions`) next to absences ([`src/components/StudentRosterNameMeta.tsx`](src/components/StudentRosterNameMeta.tsx), [`src/services/dataverse.ts`](src/services/dataverse.ts)).
- **Follow Up** now renders as a red pill badge instead of inline text; the warning triangle beside the name was removed ([`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx)).

### Changed: Growth & Wellbeing rating area renamed to Student Sentiment

- The tracking-score category formerly labelled **Growth & Wellbeing** (and interim **Growth & sentiment** / **Sentiment**) now displays as **Student Sentiment** in the rating breakdown and stored rating payloads ([`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx), [`src/lib/studentRatingStorage.ts`](src/lib/studentRatingStorage.ts)).
- Legacy stored ratings with `growth_wellbeing` keys or old labels are migrated on read to `growth_sentiment` with the **Student Sentiment** label.

---

## — 2026-06-26

### Changed: "At Risk" user-facing copy renamed to "Follow Up"

- Student sentiment verbatim record tone tags now show **Follow Up** instead of **Concern** for negative quotes ([`src/components/StudentSentimentCard.tsx`](src/components/StudentSentimentCard.tsx)).
- Student roster filters, type badges, profile fields, PDF export, and DE cohort charts now display **Follow Up** instead of **At Risk**; legacy `studentType` and cohort keys are unchanged internally ([`src/data/studentsData.ts`](src/data/studentsData.ts), [`src/lib/deAnalyticsMetrics.ts`](src/lib/deAnalyticsMetrics.ts)).
- Dashboard and school advisories, plus roster risk subtitles, now use **Follow Up** wording ([`src/components/dashboard/DashboardAdvisories.tsx`](src/components/dashboard/DashboardAdvisories.tsx), [`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).
- Student roster advanced filters and search now label the severity filter **Follow Up** (replacing "Risk level") with **Any level** / None / Low / Medium / High options ([`src/components/StudentRosterAdvancedFilters.tsx`](src/components/StudentRosterAdvancedFilters.tsx), [`src/components/StudentSearch.tsx`](src/components/StudentSearch.tsx)).

### Changed: Schools column filter dropdown extracted into own component

- Moved the column filter dropdown (hover panel on school table headers) into [`src/components/SchoolColumnFilterDropdown.tsx`](src/components/SchoolColumnFilterDropdown.tsx), including its types (`SchoolSortKey`, `SortDir`, `ColumnFilterValues`) and constants (`SCHOOL_TABLE_COLUMNS`).
- Fixed the **Clear** button inside the dropdown — was `text-[10px]` (barely legible); now `text-xs` with padding and a hover background, making it easy to click.

### Added: Schools directory column sorting

- Schools table headers are now clickable: sort by name, Morrisby ID, status (Active → Onboarding → Inactive), programme completion %, or total students; click again to reverse direction ([`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).

### Changed: Test/demo school visibility

- Test/demo/vendor schools (names or Morrisby IDs matching Secure Logic, "test", or "demo") are hidden from the Schools directory, student rosters, and direct school routes for every role; school-role users assigned to a test school still see only their own school ([`src/lib/programStatsFilters.ts`](src/lib/programStatsFilters.ts), [`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).

### Changed: Product branding

- Replaced **Student Management Platform** / **Student Intelligence Interface** with **EMCI — Enhanced My Career Insights (Pilot Program)** across browser title, Open Graph tags, sidebar tagline, login footer, dashboard footer, loading screen, and documentation ([`index.html`](index.html), [`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx), [`src/components/auth/AuthShell.tsx`](src/components/auth/AuthShell.tsx), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx), [`src/components/SchoolDashboard.tsx`](src/components/SchoolDashboard.tsx), [`src/App.tsx`](src/App.tsx), [`src/components/EmciLoadingScreen.tsx`](src/components/EmciLoadingScreen.tsx), [`README.md`](README.md), [`package.json`](package.json), [`metadata.json`](metadata.json)).

### Changed: Phase map verification playbook

- Expanded [`docs/emci-portal-phase-map.md`](docs/emci-portal-phase-map.md) with a **Verification playbook**: app navigation table, original checklist → task ID mapping, Phase 1 one-session walkthrough, KPI counting rules, and step-by-step human verification for P1 (Dashboard), P2–P3 (priority items), and P10 (regression checks).

### Fixed: Supabase client startup when env is missing

- Added clear validation in [`src/services/supabase.ts`](src/services/supabase.ts) when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing or still a placeholder — replaces the cryptic `supabaseUrl is required` error with setup instructions.
- Local dev requires a `.env` file (copy from [`.env.example`](.env.example)); restart `npm run dev` after creating or editing env vars.

### Added: Surgical fix skill

- Added [`.agents/skills/surgical-fix/SKILL.md`](.agents/skills/surgical-fix/SKILL.md) — blast-radius-aware workflow for minimal bug fixes (inspect → map dependencies → change only what is needed → verify).

### Changed: Dashboard programme KPI metrics (Phase 1)

- Dashboard letterhead subtitle for network-wide roles now shows **Network-wide scope** only (removed the separate participating-school count that could disagree with **Total Schools (Pilot Lifetime)** KPIs) ([`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx)).
- Removed **Total Counsellors** from the Dashboard and Schools KPI strip; **Active Counsellors** remains the single counsellor metric ([`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).
- Dashboard and Schools directory KPI strip now shows **Total Schools (Pilot Lifetime)**, **Active Schools**, **Inactive Schools**, and **Active Counsellors** alongside existing student metrics ([`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx)).
- Test/demo schools (e.g. Secure Logic, names containing "test" or "demo") are excluded from programme statistics; the dashboard schools snapshot uses the same filtered scope ([`src/lib/programStatsFilters.ts`](src/lib/programStatsFilters.ts)).
- Counsellor counts are derived from Dataverse owner identity (not display-name strings alone); active counsellors require at least one active student assignment and exclude platform-deactivated team members and test accounts.

### Added: Phase delivery workflow

- Added [docs/emci-portal-phase-map.md](docs/emci-portal-phase-map.md) — phased task map with AI/human verification states for portal updates.
- Linked [To do updates.md](To%20do%20updates.md) checklist to the phase map; use the personal **`phase-delivery`** Cursor skill to execute tasks.

### Changed: Programme name

- Renamed the full programme name from "Early and Meaningful Career Intelligence" to "Enhanced My Career Insights (Pilot Program)" across user-facing copy and metadata ([`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx) letterhead, [`index.html`](index.html) meta tags, [`package.json`](package.json), [`README.md`](README.md), [`Assets/Logos/README.txt`](Assets/Logos/README.txt)).
- The `EMCI` acronym is retained throughout (code identifiers, filenames, DB schema, env vars) since "Enhanced My Career Insights" still abbreviates to EMCI.

---

## — 2026-06-19

### Added: SecureLogic Admin super-admin role

- New `securelogic_admin` role in Supabase (`emci_role` enum) with the same platform permissions as ACCE Admin. Only SecureLogic Admin can toggle and bypass maintenance mode; ACCE Admin is blocked when maintenance is active and no longer sees the maintenance controls.
- SecureLogic Admin can assign all roles including other SecureLogic Admins; ACCE Admin cannot assign SecureLogic Admin.

### Added: Platform maintenance mode

- SecureLogic Admin can enable maintenance mode from Team Management. When active, all users except SecureLogic Admin see a maintenance screen after sign-in; the login page shows a maintenance notice. The DB write policy (`emci_platform_settings`) restricts the toggle to SecureLogic Admin only.
- Maintenance state is stored in Supabase (`emci_platform_settings`) with realtime updates across sessions. Optional `VITE_MAINTENANCE_MODE=true` env var provides an emergency lockout without a DB toggle.

### Added: Australia production Supabase project bootstrap

- Added project-scoped Supabase MCP server **`supabase(EMCI prod)`** for the Australia prod project (`vklwppadgogepkeaizow`) in [`.cursor/mcp.json`](.cursor/mcp.json). Legacy dev remains on **`supabase(EMCI)`** (`yfvvroesornchrxufwut`).
- Added consolidated schema migration [`supabase/migrations/20260619120000_initial_emci_schema.sql`](supabase/migrations/20260619120000_initial_emci_schema.sql) matching the legacy database (tables, RLS, encrypted analysis helpers).
- Updated [`.env.example`](.env.example) with the Australia prod project ref.

**Remaining prod cutover (manual):** run [`supabase/scripts/migrate-data-to-prod.ps1`](supabase/scripts/migrate-data-to-prod.ps1) to copy auth + student analysis from legacy Singapore dev into existing AU prod (Dashboard restore cannot target existing projects or change region) → copy Auth settings → update Vercel `VITE_SUPABASE_*` env vars.

### Changed: Australia prod Supabase cutover progress

- Applied `initial_emci_schema` migration to prod (`vklwppadgogepkeaizow`): tables, RLS, encrypted analysis helpers.
- Copied `_analysis_key_store` encryption key from dev to prod.
- Deployed all 8 edge functions to prod; set `APP_SITE_URL=https://acce.org.au` secret.

### Added: Counsellor-scoped access for ACCE staff

- ACCE staff can now be limited to their own Dataverse-owned students and schools. Scope is driven by the counsellor owner email (preferred) or Dataverse `systemuser` GUID on `emci_user_roles`, with student matching via new `counsellorEmail` / `counsellorOwnerId` fields loaded from Dataverse ([`src/services/dataverse.ts`](src/services/dataverse.ts), [`src/types/roles.ts`](src/types/roles.ts), [`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts)).
- Scoped counsellors see a single-profile Counsellor View (no all-counsellor sidebar), filtered dashboard/schools/students, and are blocked from Dev Lab tools. Direct URLs to another counsellor's student redirect to the dashboard ([`src/components/CounsellorView.tsx`](src/components/CounsellorView.tsx), [`src/routes/StudentJourneyRoute.tsx`](src/routes/StudentJourneyRoute.tsx), [`src/App.tsx`](src/App.tsx)).
- Team Management supports optional counsellor email / Dataverse owner ID when inviting or editing `acce_staff` users ([`src/components/TeamManagement.tsx`](src/components/TeamManagement.tsx), [`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts)).
- Supabase: `emci_user_roles.counsellor_email` and `dataverse_owner_id` columns; `emci_resolve_user_role` returns both fields.

### Fixed: Completed student profile card no longer stretches with empty white space

- On completed student journeys, the identity card now sizes to its content instead of stretching to match the programme/tracking card height ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).

---

## — 2026-06-18

### Changed: "At risk" wording replaced with "Flagged for follow up"

- Risk-flag labels and advisory copy now read **"Flagged for follow up"** instead of "At risk" across the student register, network overview, and dashboard advisories ([`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx), [`src/components/NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`src/components/dashboard/DashboardAdvisories.tsx`](src/components/dashboard/DashboardAdvisories.tsx)).

---

### Fixed: Invite links now open on the EMCI domain and lead to account setup (not SSO)

- Invited school/DE users were being dropped on the Microsoft SSO tab instead of the MFA setup flow, and the invite email itself was being quarantined by Microsoft Defender because its link used the raw `*.supabase.co` verify URL.
- Invite emails now link to a new EMCI-domain confirmation page — `{{ .SiteURL }}/auth/confirm?token_hash=…&type=invite&redirect_to=…` — instead of the Supabase verify URL ([`supabase/email-templates/invite-user.html`](supabase/email-templates/invite-user.html)). Keeping the link on `acce.org.au` avoids mail-security quarantine, and using `verifyOtp` (a POST) prevents link-prefetch scanners from consuming the one-time token.
- Added an `AuthConfirm` page that verifies the invite token, prompts the user to **create a password**, then hands off to the existing **two-factor (MFA) enrolment** flow — invited users are never shown the SSO tab ([`src/components/auth/AuthConfirm.tsx`](src/components/auth/AuthConfirm.tsx), [`src/App.tsx`](src/App.tsx)).
- Added `verifyEmailToken()` and `setUserPassword()` helpers ([`src/services/supabase.ts`](src/services/supabase.ts)).
- Extracted the shared branded auth layout/primitives into [`src/components/auth/AuthShell.tsx`](src/components/auth/AuthShell.tsx) so the sign-in and invite-acceptance screens stay visually identical ([`src/components/LoginPage.tsx`](src/components/LoginPage.tsx)).

**Supabase Dashboard:** ensure **Authentication → URL Configuration → Site URL** is `https://acce.org.au` and that **Redirect URLs** include `https://acce.org.au/**`. Re-paste the updated **Invite user** email template. (`/auth/confirm` is already covered by the SPA rewrite in [`vercel.json`](vercel.json).)

---

### Changed: Invite email branding, trust signals, and redirect to acce.org.au

- Updated the Supabase invite email template ([`supabase/email-templates/invite-user.html`](supabase/email-templates/invite-user.html)): clearer "EMCI School Platform" copy, white reverse logo on the navy header ([`public/emci-logo-lockup-white.png`](public/emci-logo-lockup-white.png)), ACCE sender context, security/expiry notes, and fallback text that points to `acce.org.au` instead of exposing the raw Supabase confirmation URL.
- The `invite-user` edge function now passes `redirectTo: APP_SITE_URL` (default `https://acce.org.au`) so invite acceptance lands on the production site after verification ([`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts)).
- Added `APP_SITE_URL` to [`.env.example`](.env.example) for the edge-function secret; set `VITE_SITE_URL=https://acce.org.au` for build-time meta tags.

**Supabase Dashboard setup (one-time):** Authentication → URL Configuration — set **Site URL** to `https://acce.org.au`, add `https://acce.org.au/**` and `http://localhost:5173/**` to **Redirect URLs**. Authentication → Email Templates → **Invite user** — paste the updated HTML and set subject to e.g. `You've been invited to the EMCI School Platform`. Run `supabase secrets set APP_SITE_URL=https://acce.org.au` before deploying the edge function.

---

## — 2026-06-16

### Changed: School dashboard mobile responsiveness

- School Dashboard page and its child components now adapt to small screens: responsive page padding and header, stacked footer, tighter KPI cards, and letterhead/particulars panels that stack on narrow viewports ([`src/components/SchoolDashboard.tsx`](src/components/SchoolDashboard.tsx), [`src/components/dashboard/DashboardLetterhead.tsx`](src/components/dashboard/DashboardLetterhead.tsx), [`src/components/dashboard/SchoolParticularsPanel.tsx`](src/components/dashboard/SchoolParticularsPanel.tsx), [`src/components/dashboard/DashboardStageDistribution.tsx`](src/components/dashboard/DashboardStageDistribution.tsx), [`src/components/dashboard/DashboardAdvisories.tsx`](src/components/dashboard/DashboardAdvisories.tsx)).
- School student register shows a card list on mobile/tablet (`< lg`) instead of a wide table, with a responsive filter toolbar and stacked pagination controls ([`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx)).

---

### Added: Permanently remove a team member

- Team Management now has a **Remove** action (alongside the existing **Deactivate**/**Reactivate**) that permanently deletes a user. It shows a confirmation modal, then deletes both the `emci_user_roles` row **and** the Supabase Auth user via a new `delete-user` Edge Function ([`supabase/functions/delete-user/index.ts`](supabase/functions/delete-user/index.ts), [`src/services/supabase.ts`](src/services/supabase.ts), [`src/components/TeamManagement.tsx`](src/components/TeamManagement.tsx)).
- This fixes the case where re-inviting a previously **deactivated** user silently reactivated them: deactivation is a soft, reversible action (and re-inviting reactivates by design), whereas **Remove** fully deletes the account so a later invite is a clean, fresh invite.

---

## — 2026-06-15

### Fixed: Deactivate user now fully blocks access and requires confirmation

- Clicking **Deactivate** in Team Management now shows a confirmation modal before proceeding, preventing accidental deactivations.
- Deactivation is now fully applied at both the database and auth layers: the `emci_user_roles` row is set to `is_active = false` **and** the Supabase Auth user is banned (effectively permanently), so they cannot log in or hold a session while inactive. Reactivating a user reverses both — the DB flag and the auth ban are both cleared.
- A new `toggle-user-active` Supabase Edge Function handles the combined DB + auth admin operation using the service-role key ([`supabase/functions/toggle-user-active/index.ts`](supabase/functions/toggle-user-active/index.ts)).
- Previously, only the `is_active` column was updated — the Supabase Auth user remained unbanned and could still authenticate.

---

### Fixed: MFA onboarding page no longer loops "factor already exists" error

- When a user switched to their authenticator app and returned, the browser could perform a full page reload (e.g. iOS tab eviction), resetting all React state. On reload, `startEnrolment()` ran fresh but Supabase still held the previous unverified TOTP factor, returning "A factor with the friendly name "" for this user already exists" on every attempt — looping indefinitely. Fixed in three places:
  - **`LoginPage.tsx`** (root fix): `startEnrolment()` now calls `getMfaFactors()` first and unenrolls any leftover unverified factor via `unenrollMfa()` before creating a new one. This handles full page reloads cleanly — the user gets a fresh QR code every time.
  - **`AuthContext.tsx`**: Added a `stageRef` kept in sync with the current stage. The `onAuthStateChange` handler now passes `silent: true` during active MFA flow (`mfa_enroll` / `mfa_required`), preventing the `loading → mfa_enroll` flash that could re-trigger enrolment on desktop tab-switches without a full reload.
  - **`LoginPage.tsx`** (guard): The `useEffect` that starts enrolment/verification now checks `!mfaFactorId` / `!mfaChallengeId` before calling, so it is a no-op if the flow is already in progress.

---

### Added: EMCI-branded invite user email template

- Created a custom HTML email template (`supabase/email-templates/invite-user.html`) for the Supabase "Invite user" auth email. Template uses EMCI brand colours (navy `#0F172A`, orange `#ec5b13`, accent blue `#2563EB`), the EMCI logo lockup served from `{{ .SiteURL }}/emci-logo-lockup.png`, and all required Supabase template variables (`{{ .ConfirmationURL }}`, `{{ .Email }}`). Designed for broad email-client compatibility using table-based layout.

---

### Added: Supabase invite email when adding a team member

- When an admin adds a new team member (DE admin, school staff, school admin, etc.) via Team Management, the user is now inserted into `emci_user_roles` **and** automatically sent a Supabase invite email containing a sign-in link. A new `invite-user` Supabase Edge Function handles both operations using the service-role key. The "Add user" button is now labelled **"Add & send invite"** to reflect this ([`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts), [`src/services/supabase.ts`](src/services/supabase.ts), [`src/components/TeamManagement.tsx`](src/components/TeamManagement.tsx)).

---

### Removed: Secondary skeleton loader on data refresh

- The `ProgramDataSkeleton` overlay that appeared over the app during background data refreshes has been removed. The branded `EmciLoadingScreen` is now the sole loading UI — it covers initial auth, platform connection, and the first programme-data fetch. Background refreshes now complete silently without blocking the UI ([`src/App.tsx`](src/App.tsx)).

---

## — 2026-06-11

### Fixed: AI analysis no longer reports "Current Work" for students who only want a job

- The **Current Work** highlight chip on the Analysis Summary was being inferred from statements of intent (e.g. "I would like a part-time job as soon as possible"), wrongly labelling students as currently employed. The `analyze-student` prompt now requires the data to show a job the student currently holds or completed work experience, and explicitly forbids inferring it from a desire or plan to find work ([`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts), deployed as v7).

### Fixed: Quick Insights now counts absences recorded as timeline notes

- The **Absences** tile in Quick Insights previously only counted dedicated absence records, so absences recorded as free-text notes (e.g. "Student absent 14.05.25") showed as 0. Timeline notes mentioning an absence are now included in the absence count, and appear in the Absences drill-down panel ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).

### Changed: Completed students get a split identity / programme record header

- For students who have completed the programme, the student header is now two side-by-side cards: a left identity card (EMCI Student Record eyebrow, name, status pill, school, year level) and a right programme record card with the minimal **Programme Complete** band (check emblem, journey evidence line, tracking-score badge), quiet watch-out chips, and the Tracking Indicators rubric tiles wrapped to three columns ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx)).
- In-progress students keep the original single full-width header card (name and score badge, Tracking Indicators, watch-outs, and the progress stepper).

### Changed: Student journey stepper now shows real completion details

- Completed stepper steps now surface evidence from the activity timeline instead of a generic "Completed" label: the Referral step shows its completion date, Career Guidance shows the number of sessions held and the date of the last one, and Complete shows the programme finish date ([`src/components/StudentJourneyStepper.tsx`](src/components/StudentJourneyStepper.tsx)).
- Students who have finished the programme now get a minimal **Programme Complete** band at the very top of the student header card: an emerald check emblem, then one quiet reading line of journey evidence (referral date · guidance session count and last session date · finish date) with the tracking-score badge on the right ([`src/components/CompletedJourneyPanel.tsx`](src/components/CompletedJourneyPanel.tsx)). The stepper, standalone watch-outs section and duplicate score badge no longer render for completed students.
- Watch-outs in the completion band use a new quiet style — neutral chips with a small severity-coloured dot, indented under the completion line — so they no longer compete with the band's colours; the regular Watch-Outs section elsewhere is unchanged ([`src/components/StudentWatchouts.tsx`](src/components/StudentWatchouts.tsx)).
- The stepper was extracted from `StudentJourneySummary` into its own component with no change to step-status logic ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).

### Changed: Dashboard redesigned as an official programme overview

- The dashboard home now follows the official government/report design language: a letterhead panel (**EMCI · Official Programme Overview**) with reporting date, visible scope line, and an `Authorised access` chip; a divided KPI strip; and a confidential-use footer rule ([`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx)).
- The page now uses the full available width with a true dashboard layout: letterhead and KPI strip span across the top, programme data (stage distribution, schools register) sits in a wide left column, and an **Advisories** rail (at-risk notice or all-clear state) plus Records & Registers sit in a right column.
- New **Programme Stage Distribution** section: an animated segmented bar with a legend showing counts and percentages across Not Started, Initial Intake, Consent, Career Guidance, and Job Ready ([`src/components/dashboard/DashboardStageDistribution.tsx`](src/components/dashboard/DashboardStageDistribution.tsx)).
- New **Schools Register** snapshot (network-scope roles only): the five largest school cohorts with status, completion bars, and student counts, linking through to the full schools directory ([`src/components/dashboard/DashboardSchoolsSnapshot.tsx`](src/components/dashboard/DashboardSchoolsSnapshot.tsx)).
- New at-risk advisory notice strip surfaces the number of flagged students within the user's scope.
- Schools/Students quick links restyled as formal **Records & Registers** entries with primary left-rule accents; all sections use a shared accent-rule heading primitive ([`src/components/dashboard/DashboardQuickAccess.tsx`](src/components/dashboard/DashboardQuickAccess.tsx), [`src/components/dashboard/DashboardSectionHeading.tsx`](src/components/dashboard/DashboardSectionHeading.tsx)).

### Fixed: Dashboard schools register rows now open the selected school

- Clicking a school row in the dashboard's **Schools Register — Largest Cohorts** now opens that school's dashboard (`/school/:schoolId`) instead of the general schools directory, using the same role gate as the Schools page; roles without school-dashboard access still fall back to the directory ([`src/components/dashboard/DashboardSchoolsSnapshot.tsx`](src/components/dashboard/DashboardSchoolsSnapshot.tsx), [`src/components/DashboardHome.tsx`](src/components/DashboardHome.tsx)).

### Changed: School dashboard redesigned in the official programme style

- The school dashboard now matches the dashboard home's official design language: a letterhead panel (**EMCI · Official School Record**) with the school name, status chip, Morrisby ID and region; a divided KPI ledger strip with progress bars; and a confidential footer rule with the last-synced timestamp ([`src/components/SchoolDashboard.tsx`](src/components/SchoolDashboard.tsx)).
- Page restructured into a full-width two-column dashboard: the **Student Register** (search, filters, table, pagination — extracted unchanged into [`src/components/SchoolStudentRegister.tsx`](src/components/SchoolStudentRegister.tsx)) sits in the wide left column; the right rail carries **Advisories** (school at-risk count or all-clear), the **Programme Stage Distribution** for the school cohort, and a new **School Particulars** register (Morrisby ID, region, principal contact, status, joined year) ([`src/components/dashboard/SchoolParticularsPanel.tsx`](src/components/dashboard/SchoolParticularsPanel.tsx)).
- The letterhead and advisories treatments are now shared primitives used by both dashboards ([`src/components/dashboard/DashboardLetterhead.tsx`](src/components/dashboard/DashboardLetterhead.tsx), [`src/components/dashboard/DashboardAdvisories.tsx`](src/components/dashboard/DashboardAdvisories.tsx)).

### Removed: Standalone metric card grid

- `MetricCardGrid` removed — its only consumer (the school dashboard) now uses the official divided KPI ledger strip.

### Added: Clickable Quick Insights tiles with record drill-down

- Every Quick Insights tile is now clickable: selecting a tile opens an official-style slide-over panel on the right showing the underlying timeline entries — session dates for **Sessions**, recorded absences with reasons for **Absences**, completed pilot survey stages for **Surveys**, and the specific sessions where each intervention area was recorded ([`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx), [`src/components/QuickInsightDetail.tsx`](src/components/QuickInsightDetail.tsx)).
- The panel carries the document design language: slate header band with primary accent rule and the tile's value, numbered records with full (untruncated) notes, and a `Source: Student Activity Timeline` footer. It closes via the close control, backdrop click, Escape, or re-clicking the selected tile.
- Detail records are derived with the exact same matching logic as the yes/no flags, so a tile's drill-down always agrees with its value ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).

### Changed: Tracking-score badge now explains what the score means

- The tracking-score ring in the student journey header no longer shows a bare number: it now pairs the ring with the plain-language band the score falls into — **On Track**, **Progressing**, **Monitoring** or **Needs Attention** — coloured to match, plus a `Tracking score · out of 100` context line ([`src/components/StudentRatingBadge.tsx`](src/components/StudentRatingBadge.tsx)).
- Hovering the badge reveals the full band scale (80–100 On Track · 65–79 Progressing · 45–64 Monitoring · below 45 Needs Attention), and the badge's accessible label now reads the score and band aloud rather than just "Tracking score".

### Changed: Student header card given a lighter official-record treatment

- The student journey header card now nods to the document style without repeating the full header-band treatment, via a new lightweight `ReportEyebrow` primitive — a small primary marker beside a tiny uppercase label, with an optional right-aligned hint ([`src/components/ReportCard.tsx`](src/components/ReportCard.tsx)).
- An **EMCI Student Record** eyebrow now sits above the student name; the tracking-score breakdown gains a **Tracking Indicators** eyebrow with a `Weighted rubric · 0–100` hint; the watch-outs strip uses the same eyebrow with a flagged count ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/StudentWatchouts.tsx`](src/components/StudentWatchouts.tsx)).
- The progress stepper now mirrors the PDF concept's stage timeline: each step shows a tiny uppercase stage name (primary-coloured when active) over a status line (**Completed** / **Active Stage** / **Upcoming**) ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- Tracking-indicator tile labels use the bolder tracked uppercase style, and watch-out chips are squared (`rounded-md`) with semibold labels for a more formal read ([`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx), [`src/components/StudentWatchouts.tsx`](src/components/StudentWatchouts.tsx)).

### Changed: Analysis Summary & Quick Insights restyled in official document style

- The **Analysis Summary** and **Quick Insights** cards now share the same official report design language as the Student Voice & Sentiment card: a slate header band with primary left-accent rule and subtitle, uppercase section headings, and (for AI content) the two-sided document footer disclaimer ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx)).
- Analysis Summary content is now organised under `Key Indicators` (highlight chips) and `Summary of Findings` (tinted prose panel) headings, in both current and out-of-date states.
- Quick Insights `Attendance` and `Interventions` labels use the shared accent-rule section heading style; the card stretches to match the Analysis Summary height.
- The header band, section heading, and footer are extracted into shared primitives used by all three cards ([`src/components/ReportCard.tsx`](src/components/ReportCard.tsx)).

### Changed: Student Voice & Sentiment card redesigned in official document style

- The Student Voice & Sentiment card now follows the official report design language from the PDF export concept: a slate header band with a primary left-accent rule and registry-style subtitle, uppercase `Summary of Findings` / `In Their Own Words` section headings, and the AI summary presented in a formal tinted panel ([`src/components/StudentSentimentCard.tsx`](src/components/StudentSentimentCard.tsx)).
- Quotes are restyled as numbered verbatim records (`Record 01`, `Record 02`, …) with a sentiment-coloured left rule, a tone tag (**Positive** / **Concern** / **Neutral**), and a separated `Source field` citation line — plus a verbatim record count beside the section heading.
- The sentiment badge is now a squared, uppercase document-style chip, and the footer carries a two-sided disclaimer (`AI-Generated · For Guidance Purposes Only` / `Not an Official Assessment`).

### Added: Smart sensitive-information redaction

- New two-tier redaction system removes sensitive student information (medications, health conditions, disabilities, family/parent details, contact details, welfare matters) from all timeline content **before it is displayed to any user** ([`src/redaction/`](src/redaction/)).
  - **Tier 1 (instant, pattern-based):** applied at the single data choke point where the student events map is built, so every consumer — student journey, PDF export, survey search, AI prompts — only ever receives redacted data ([`src/App.tsx`](src/App.tsx), [`src/redaction/smartRedaction.ts`](src/redaction/smartRedaction.ts), [`src/redaction/sensitivePatterns.ts`](src/redaction/sensitivePatterns.ts)).
  - **Tier 2 (AI deep scan):** a new `redact-sensitive` Supabase Edge Function (OpenAI) detects sensitive disclosures the patterns miss; results are cached per text for the session and applied on the student journey page. If the AI call fails, content stays pattern-redacted — the UI never blocks ([`supabase/functions/redact-sensitive/index.ts`](supabase/functions/redact-sensitive/index.ts), [`src/redaction/useAiRedaction.ts`](src/redaction/useAiRedaction.ts), [`src/routes/StudentJourneyRoute.tsx`](src/routes/StudentJourneyRoute.tsx)).
  - Routine programme wording such as "parental consent obtained" is allowlisted and never redacted.

### Added: Pilot survey count in Quick Insights

- Quick Insights now shows **Surveys** as a score out of 3 (initial, mid, and end pilot surveys), derived from distinct completed survey stages on the student timeline ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts), [`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx)).

---

## — 2026-06-03

### Added: Pinnable main sidebar layout

- Main sidebar can be cycled between three modes via a control below the logo: **hover to expand** (default), **pinned open**, and **pinned closed**. Preference is stored in `localStorage` and restored on reload ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx), [`src/hooks/useMainSidebarPin.ts`](src/hooks/useMainSidebarPin.ts)).

### Fixed: Main sidebar pin control alignment when collapsed

- Pin mode button uses the same `px-2` rail padding and full-width `px-3 py-3` hit area as nav icons so it lines up with the rest of the collapsed sidebar ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx)).

### Fixed: Sign out button in collapsed main sidebar

- Collapsed sidebar sign-out showed a clipped, nearly empty control because the hidden "Sign out" label still reserved flex width and the footer used extra horizontal padding. Labels now collapse to zero width when the sidebar is narrow, and the sign-out button uses tighter padding to match nav items ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx)).

---

## — 2026-06-02

### Changed: All AI calls now fire concurrently on page load

- The **Tracking Score**, **Analysis Summary**, and **Student Voice & Sentiment** AI calls now all auto-trigger simultaneously when the student journey page loads — no button clicks required. Each call respects its own "already exists" guard: the tracking score skips if a matching fingerprint is cached in localStorage; the analysis summary skips if a fresh (non-stale) result is already stored in the DB; the sentiment call re-runs each session (no persistence layer). Previously, the Analysis Summary required a manual "Generate" button click and the Tracking Score only auto-generated for students in the Career Guidance stage ([`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts), [`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).
- Tracking Score auto-generation now covers **all** students at stage progress ≥ 3 (Career Guidance and Complete), not only students with `currentStage = career_guidance`.

### Added: Student Voice & Sentiment card on the student journey page

- A new **Student Voice & Sentiment** card now appears below the Analysis Summary on every student's journey page. It auto-generates on load (no button required) and calls the new `sentiment-student` edge function, which analyses all available student voice data — pilot survey responses, session satisfaction/found-useful feedback, and timeline notes — to surface overall sentiment and direct quotes ([`src/components/StudentSentimentCard.tsx`](src/components/StudentSentimentCard.tsx), [`src/hooks/useStudentSentiment.ts`](src/hooks/useStudentSentiment.ts), [`supabase/functions/sentiment-student/index.ts`](supabase/functions/sentiment-student/index.ts)).
- The card shows a sentiment badge (**Mostly Positive**, **Mixed Signals**, **Needs Attention**) alongside a 2–3 sentence counsellor-grade summary and up to 4 quoted student voice items. Each quote is colour-coded by tone and includes a precise citation (source, exact field label, and date) so practitioners can trace the quote back to the original record. Hidden in PII-restricted mode.
- When no student voice data is on record the card shows a friendly empty state (illustrated speech-bubble icon, `public/sentiment-empty-state.png`) rather than a blank or error. Errors are silently suppressed — the card only appears when there is something meaningful to show.

### Changed: Student journey header identity

- The student name block is reworked for clearer hierarchy — name stands alone, with status, school and year level on a separate metadata row below. Status uses a soft bordered pill (not bright inline text); year level uses a neutral slate badge instead of loud primary orange ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).

### Changed: Tracking-score category cards (Linear-style)

- The five tracking-score breakdown categories (Engagement, Career, Work Readiness, Attendance, Wellbeing) now render as compact bordered mini-cards with subtle shadow and hover lift, instead of plain inline buttons — closer to Linear.app's stat tiles ([`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx)).
- Card hover uses a premium lift — layered shadow, 300ms ease-out, subtle `-translate-y` — on both tracking-score tiles and Quick Insights intervention tiles; rubric tooltips use a softer frosted shadow ([`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx)).

### Changed: Typography aligned across the student journey page

- Standardised every "eyebrow"/overline label on the student journey page to a single style (`text-[10px]` bold uppercase, wider tracking, slate-400). Previously the header card, Quick Insights group labels, and timeline month dividers each used different sizes, weights, tracking, and colours ([`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx), [`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx)).
- Normalised the progress-stepper labels off a one-off `text-[13px]` size onto the standard `text-xs` scale ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).

### Fixed: Phantom "End of Pilot Survey" on completed students

- Removed the synthetic fallback End-of-Pilot Survey event that was shown for students at the `complete` stage who had no end-of-pilot survey record in Dataverse. The timeline now only shows an End-of-Pilot Survey when a real record exists in the CRM (source of truth); the "Complete" journey milestone is still driven by the student's stage, not the placeholder ([`src/services/dataverse.ts`](src/services/dataverse.ts)).

### Added: Dedicated "Work Readiness" category in the Tracking Score

- The Tracking Score now scores **five** categories instead of four — **Work Readiness** is split out from Career Outcomes so work-experience and employability signals are no longer mixed with career planning. Category weights are now Engagement 25, Career Outcomes 20, Work Readiness 20, Attendance & Momentum 15, Growth & Wellbeing 20 (was 30/30/—/20/20), aligning the live points system with [`STUDENT_RATING_SYSTEM_PLAN.md`](STUDENT_RATING_SYSTEM_PLAN.md) §4 ([`src/lib/studentRating.ts`](src/lib/studentRating.ts)).
- **Work Readiness** points: Work experience completed 40, Part-time/casual job 25, Work experience prep 20, Work-readiness intervention 15. **Career Outcomes** re-pointed to planning/exploration only: Career Action Plan 40, Morrisby profile 25, Researching careers 20, Career interview 15. Following the plan's fairness rule, Work Readiness returns `null` (not a low score) when a student has had no work-experience opportunity yet ([`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Score breakdown now renders the Work Readiness meter and its rubric tooltip ([`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx)).
- Bumped the rating cache (`v8`) so existing students are re-scored under the new rubric ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Changed: Student journey now uses a 3-stage Consent → Career Guidance → Complete model

- The progress stepper on the student journey page now shows three stages — **Consent**, **Career Guidance**, **Complete** — with Consent representing stage-1 progress. The standalone "Referral" step was removed (the referral data stage is folded into the Consent step) ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- The Activity Timeline no longer displays referral events, and the **Referral** filter tab was removed ([`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx)).

### Added: EMCI Student Absences now appear in the timeline and AI context

- EMCI **Student Absence** records (`cr89a_emcistudentabsence`) are now surfaced as `Absence` events on the Activity Timeline, showing the absence date, reason (`cr89a_reasondropdown` — e.g. "Away from school", "Didn't show up/Refusal", "Other") and any free-text detail (`cr89a_reasonifknown`). Previously absences only fed the aggregate `absenceCount`/risk level and were invisible on the timeline ([`src/services/dataverse.ts`](src/services/dataverse.ts), [`src/App.tsx`](src/App.tsx), [`src/components/TimelineCore.tsx`](src/components/TimelineCore.tsx)).
- Each absence's reason flows into the EMCI Assistant, Analysis Summary, and Tracking Score via the existing redacted timeline-notes context, and re-triggers analysis/scoring automatically via the source fingerprint — so all three AI calls now see per-absence reasons, not just the absence count ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).

### Added: Dataverse student Notes now appear in the timeline and AI context

- Free-text Dataverse **Notes** (the `annotation` records shown in the Dataverse "Notes" panel, e.g. "Email from Principal…") are now fetched and surfaced as `Note` events on the Activity Timeline, with a new **Notes** filter tab. Previously these were never retrieved, so the assistant, Analysis Summary, and Tracking Score could not "see" them ([`src/services/dataverse.ts`](src/services/dataverse.ts), [`src/App.tsx`](src/App.tsx), [`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx)).
- These notes flow into the EMCI Assistant, Analysis Summary, and Tracking Score via the existing redacted timeline-notes context, and re-trigger analysis/scoring automatically via the source fingerprint ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).

### Changed: Timeline notes included in AI context

- The EMCI Assistant, Analysis Summary, and Tracking Score now receive redacted timeline notes from activity records, including note/comment-like timeline fields, so recommendations, wellbeing reads, and scoring context reflect practitioner notes shown in the timeline ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts), [`src/lib/studentChatContext.ts`](src/lib/studentChatContext.ts), [`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts)).
- Updated the `chat-student`, `analyze-student`, and `rate-student` edge function prompts/contracts to explicitly use timeline notes without inventing unsupported details ([`supabase/functions/chat-student/index.ts`](supabase/functions/chat-student/index.ts), [`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts), [`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Bumped the rating cache (`v7`) so tracking scores are regenerated with timeline-note context ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Changed: Tracking score attendance rubric — recency removed

- The Attendance & Momentum category no longer scores days-since-last-activity or applies a programme-completion recency override. It is absence-only, rescaled to 0–100 (0 absences = 100, 1–2 = 75, 3–5 = 40, >5 = 15). Removed `daysSinceLastActivity` and `programmeComplete` from the rating packet ([`STUDENT_RATING_SYSTEM_PLAN.md`](STUDENT_RATING_SYSTEM_PLAN.md), [`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts), [`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx)).
- Bumped the rating cache (`v6`) so affected students are re-scored under the updated rubric ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Changed: EMCI Assistant drawer is now lazy-loaded

- The assistant drawer (and the `react-markdown` renderer it uses) is now code-split and only loads on first open, removing ~50 kB gzip from the initial bundle. The lightweight launcher and chat state stay in the main bundle, so the conversation is preserved across close/reopen and enter/exit animations are unchanged ([`src/components/StudentAssistantChat.tsx`](src/components/StudentAssistantChat.tsx), [`src/components/StudentAssistantDrawer.tsx`](src/components/StudentAssistantDrawer.tsx), [`src/components/EmciAssistantLogo.tsx`](src/components/EmciAssistantLogo.tsx)).

### Added: Suggested follow-up questions in the EMCI Assistant

- After each assistant reply, the chat now surfaces up to three contextual "Suggested follow-ups" chips beneath the latest message; tapping one sends it as the next question. Suggestions are generated by the model from the student's context and phrased from the practitioner's perspective ([`src/components/StudentAssistantChat.tsx`](src/components/StudentAssistantChat.tsx), [`src/hooks/useStudentChat.ts`](src/hooks/useStudentChat.ts)).
- The `chat-student` edge function now returns a structured `{ reply, followUps }` response via a strict JSON schema ([`supabase/functions/chat-student/index.ts`](supabase/functions/chat-student/index.ts)).

### Changed: EMCI Assistant replies now render as formatted markdown

- Assistant chat replies now render rich markdown — headings, bold/italic, bullet and numbered lists, links, inline code, and code blocks — via `react-markdown` + `remark-gfm`, styled to match the chat design. User messages remain plain text. The message bubble was extracted to its own component ([`src/components/ChatMessageBubble.tsx`](src/components/ChatMessageBubble.tsx), [`src/components/StudentAssistantChat.tsx`](src/components/StudentAssistantChat.tsx)).
- The assistant launcher, header, and empty state now use the EMCI emblem instead of generic AI icons ([`src/components/StudentAssistantChat.tsx`](src/components/StudentAssistantChat.tsx)).

### Added: EMCI Assistant chat on the student journey page

- Added an AI assistant chat to the student journey page (`/student/:studentId`). A floating "Ask EMCI Assistant" button opens a Linear-style right-side drawer with smooth animations, suggested starter prompts, a typing indicator, and multi-turn conversation ([`src/components/StudentAssistantChat.tsx`](src/components/StudentAssistantChat.tsx), [`src/routes/StudentJourneyRoute.tsx`](src/routes/StudentJourneyRoute.tsx)).
- The assistant is grounded in the same on-page context as the Analysis Summary — programme stage, Quick Insights, counselling session detail, and pilot survey shifts — and never receives the student's name. PII redaction is respected via the route's already-redacted student/timeline view ([`src/lib/studentChatContext.ts`](src/lib/studentChatContext.ts), [`src/hooks/useStudentChat.ts`](src/hooks/useStudentChat.ts)).
- Added the `chat-student` Supabase edge function (OpenAI `gpt-4o-mini`, full CORS) which composes the system prompt, the student context block, and the trimmed conversation history ([`supabase/functions/chat-student/index.ts`](supabase/functions/chat-student/index.ts)).

### Changed: Typography hierarchy on student journey panels

- Quick Insights, Analysis Summary, and Activity Timeline now use clearer type hierarchy — section titles, subsection labels, primary values, and supporting text are visually distinct ([`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx), [`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx), [`src/components/AnalysisHighlights.tsx`](src/components/AnalysisHighlights.tsx)).

### Added: 2026 student mid-pilot survey in the timeline

- The activity timeline now pulls the new `cr89a_emcimidpilotsurvey2026` table and surfaces its records as "EMCI Student Mid Pilot Survey" events ([`src/services/dataverse.ts`](src/services/dataverse.ts), [`src/services/surveyTypes.ts`](src/services/surveyTypes.ts), [`src/App.tsx`](src/App.tsx)).

### Changed: Timeline survey and session naming

- The legacy student mid-pilot survey event is now titled "EMCI Mid-Pilot Student Survey (Legacy)" to distinguish it from the 2026 survey ([`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Session entity reference renamed from "WLPC Session" to "EMCI Session" in the Dataverse connection reference ([`DATAVERSE_CONNECTION_REFERENCE.md`](DATAVERSE_CONNECTION_REFERENCE.md)).

### Fixed: Timeline events showing wrong titles

- Session events in the activity timeline now use the EMCI intervention type (`cr89a_typeofintervention`) as their title instead of the activity `subject`, which was picking up incorrect names. This reflects the correct session types in the timeline ([`src/services/dataverse.ts`](src/services/dataverse.ts)).
- Survey events now use their survey type as the title (e.g. "EMCI End of Pilot Survey") instead of the activity `subject` (e.g. a student-name code like "J.C 05.11.25") ([`src/services/dataverse.ts`](src/services/dataverse.ts)).

### Fixed: Analysis Summary failing (CORS / 500 on analyze-student)

- The AI Analysis Summary stopped generating, surfacing in the browser as a CORS error. Root cause: the `analyze-student` edge function deployed in production still expected the old Quick Insights shape (`careerActionPlan`, `morrisbyUnpack`, `workExperience`…) while the app now sends the eight intervention areas plus session/absence counts — so the function threw a `TypeError` and returned a 500 whose error responses carried no CORS header. Redeployed the function with the current insights shape ([`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts)).
- Hardened the function so every response — including errors — carries CORS headers, and wrapped the handler in a try/catch. Future input mismatches now return a readable JSON error instead of an opaque CORS failure ([`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts)).

### Changed: Tracking score now reads full session intervention detail

- The tracking-score AI packet now includes the complete per-session record — session length, intervention type, the intervention multiselect areas (Morrisby, Career Action Plan, industry engagement, work-experience preparation, work readiness, other), and, where the student gave feedback, their session satisfaction and what they found useful — all as human-readable labels rather than option codes. The scoring rubric uses this to corroborate engagement breadth and inform the growth & wellbeing read ([`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Session student-feedback fields (`cr89a_studentsatisfactiontodayssession`, `cr89a_whatdidyoufindusefulintodayssession`) are now captured from Dataverse and surfaced to the AI analysis and tracking score. They are carried on dedicated session fields so the deterministic detectors never keyword-match their values ([`src/services/dataverse.ts`](src/services/dataverse.ts), [`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).
- Bumped the rating cache so affected students are re-scored automatically with the richer packet ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

---

## — 2026-06-01

### Added: Session and absence counts in Quick Insights

- Quick Insights now shows counselling **session count** and **absence count** at the top of the panel, with absences highlighted when above threshold ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts), [`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx)).
- AI analysis prompt includes session and absence counts in the Quick Insight categories block ([`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts)).

### Changed: Quick Insights aligned to EMCI intervention areas

- Quick Insights now shows all eight session intervention areas — Unpack, CAP, Work Readiness, Industry Engagement, External Support, WEX Preparation, Introduction, and Other — each as yes/no based on counselling session records ([`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx), [`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).

### Fixed: End-of-pilot survey missing session context

- Pending or empty End of Pilot Survey events now surface the related counselling session (intervention details and internal notes) in the timeline drawer, so practitioners see session context while the survey is being completed ([`src/services/dataverse.ts`](src/services/dataverse.ts), [`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx)).
- End-of-pilot survey records linked to a session (rather than directly to the student) are now matched correctly when building the timeline ([`src/App.tsx`](src/App.tsx)).
- AI analysis session detail now always includes counsellor notes when present on the timeline event ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).

### Added: Branded EMCI loading screen

- Replaced the plain spinner shown while the app is loading with a custom branded loading screen — the animated EMCI growth-bars emblem, wordmark and a progress bar on the brand navy background. Used for both the initial auth check and the "connecting to the platform" state, and it respects reduced-motion preferences ([`src/components/EmciLoadingScreen.tsx`](src/components/EmciLoadingScreen.tsx), [`src/App.tsx`](src/App.tsx)).

### Changed: Auto-score Career Guidance students on load

- When a student in the Career Guidance stage is opened and has no stored tracking score yet, the score is now generated automatically on load instead of waiting for a manual trigger. It runs once per student until the result is cached; students in other stages still score on demand ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Changed: Richer watch-out tooltips on the Student Journey

- Watch-out chips now reveal the same custom hover tooltip used by the tracking-score breakdown, explaining in more depth why each one was flagged (and the recommended next step where one applies) instead of a short native tooltip ([`src/components/StudentWatchouts.tsx`](src/components/StudentWatchouts.tsx)).

### Fixed: Inaccurate career signals in the score tooltips

- The Career score tooltip could claim a "part-time job" the student didn't have (a brittle keyword match producing false positives) and report "no work experience" for a student who did work experience in a session. Work experience is now detected from session interventions as well as surveys — so the Career tooltip, the score, and the Quick Insights panel agree ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts)).
- Part-time-job and independent-career-research signals are no longer keyword-guessed; the AI now infers them from the actual notes and surveys, and is instructed not to confuse a work-experience placement with a paid job ([`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Bumped the rating cache so affected students are re-scored automatically ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Fixed: In-progress students wrongly described as "completed" in score tooltips

- The attendance & momentum tooltip could read "Completed programme, full recency awarded" for a student still in Career Guidance. Root cause: the completion override was left for the AI to infer from a numeric stage value, which it mis-applied. Completion is now decided in code and passed to the model as an explicit `programmeComplete` flag, and the rubric forbids describing a non-complete student as finished ([`src/lib/studentRating.ts`](src/lib/studentRating.ts), [`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Bumped the rating cache so affected students are re-scored automatically ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Fixed: Completed students no longer penalised for inactivity

- The attendance & momentum score no longer counts days-since-last-activity against a student who has finished the programme. The AI rubric now applies a completion override that awards full recency for completed students (`stageProgress = 4`) and frames their status as "completed" rather than citing inactivity ([`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Inactivity watch-outs ("Active but no activity in N days" and "Stalled") no longer fire for completed students, since post-completion inactivity is expected ([`src/lib/studentWatchouts.ts`](src/lib/studentWatchouts.ts), [`src/lib/studentWatchouts.test.ts`](src/lib/studentWatchouts.test.ts)).
- Bumped the rating cache version so existing students are re-scored with the corrected rubric on next view, without a manual regenerate ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Added: DE Analytics Dashboard (Phase 1)

- Introduced a dedicated, aggregated analytics dashboard for Department of Education oversight users at `/de/analytics`, gated to the DE role group (ACCE can preview). DE users are routed here as their home on sign-in ([`src/routes/DeAnalyticsRoute.tsx`](src/routes/DeAnalyticsRoute.tsx), [`src/App.tsx`](src/App.tsx), [`src/types/roles.ts`](src/types/roles.ts)).
- Added a "DE Analytics" sidebar entry shown only to roles with access ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx), [`src/routes/MainShell.tsx`](src/routes/MainShell.tsx)).
- The dashboard presents five de-identified, aggregate-only views — no student names, identifiers or counsellor details ever leave the metrics layer ([`src/lib/deAnalyticsMetrics.ts`](src/lib/deAnalyticsMetrics.ts), [`src/components/de/DeAnalyticsDashboard.tsx`](src/components/de/DeAnalyticsDashboard.tsx)):
  - **Programme Overview** — enrolled students, active schools, completion rate, students in career guidance, and students needing follow-up (stalled journeys).
  - **Outcomes by Student Type** — completion and career outcomes (Career Action Plan, Work Experience, Morrisby profile) compared across Disability, Koorie, Out-of-Home Care, Youth Justice, At Risk and Standard cohorts.
  - **Stage Progress Funnel** — Referral to Complete, filterable by cohort.
  - **Completion Gap Analysis** — each priority cohort's completion rate against the overall population, surfacing equity gaps.
  - **Regional Performance** — completion, engagement and stalled rates by region.
- Added `recharts` for the funnel, cohort and regional charts.
- Made the dashboard navigable with a view switcher — Overview, By Cohort, Stage Funnel, Completion Gap and Regional tabs — so each view is focused rather than one long scroll ([`src/components/de/DeAnalyticsDashboard.tsx`](src/components/de/DeAnalyticsDashboard.tsx)).
- Added user-settable filters (region and student status) that scope every view, with a live student count and a one-click clear ([`src/components/de/DeAnalyticsFilters.tsx`](src/components/de/DeAnalyticsFilters.tsx), [`src/lib/deAnalyticsMetrics.ts`](src/lib/deAnalyticsMetrics.ts)). The Stage Funnel keeps its own per-view cohort selector.
- Cohort breakdowns read the existing recorded cohort tags; the dashboard degrades gracefully where cohort data is sparse.

### Changed: App icon / favicon

- Replaced the app icon with the EMCI growth-bars logo, with its white background removed (transparent, auto-cropped and squared). Generated `favicon.ico` (multi-size), `favicon.png` and `apple-touch-icon.png` and wired them into [`index.html`](index.html) ([`public/favicon.png`](public/favicon.png)).
- Updated the sidebar header to use the same logo instead of the generic network icon ([`src/components/layout/MainSidebar.tsx`](src/components/layout/MainSidebar.tsx)).
- Updated the login screen header to the EMCI icon + wordmark lockup ([`public/emci-logo-lockup.png`](public/emci-logo-lockup.png), [`src/components/LoginPage.tsx`](src/components/LoginPage.tsx)).
- Refined the login screen with a more premium feel: layered card shadows, frosted glass panel, slow ambient background motion, spring entry animations, sliding tab indicator, and subtle hover lift on primary actions ([`src/components/LoginPage.tsx`](src/components/LoginPage.tsx)).
- Added a 1200×630 Open Graph / Twitter preview image ([`public/og-image.png`](public/og-image.png)) and expanded social meta tags in [`index.html`](index.html) (`og:image`, dimensions, alt text, Twitter `summary_large_image`, `en_AU` locale). Optional `VITE_SITE_URL` in [`.env.example`](.env.example) injects absolute preview URLs at build time via [`vite.config.ts`](vite.config.ts).

### Added: Proactive student watch-outs on the Student Journey

- The Student Journey header now surfaces proactive "watch-outs" beneath the tracking score — small severity-coloured chips that flag things worth a look without the user having to dig, e.g. "Active but no activity in 129 days", "In Career Guidance with no sessions logged", or "Completed without a Career Action Plan" ([`src/components/StudentWatchouts.tsx`](src/components/StudentWatchouts.tsx)).
- Watch-outs are computed by a new pure, side-effect-free engine from the existing student record, derived timeline events and (when generated) the AI rating — no extra data fetches or writes. Most checks are deterministic and factual; a few softer signals (wellbeing concern, disengagement, thriving, equity escalation) come from the AI rating flags ([`src/lib/studentWatchouts.ts`](src/lib/studentWatchouts.ts)).
- Each watch-out carries a severity — Action (follow up soon), Watch (keep an eye on) or Positive (recognise) — and the strip is ordered by severity. Low-confidence ratings tag their AI-derived signals with a "verify first" hint. Hidden in redacted (no-PII) views.
- Thresholds and the wider design are documented in [`STUDENT_WATCHOUTS.md`](STUDENT_WATCHOUTS.md); the engine is covered by unit tests ([`src/lib/studentWatchouts.test.ts`](src/lib/studentWatchouts.test.ts)).

### Added: Tracking-score category breakdown on the Student Journey

- Beside the tracking score in the Student Journey header, a minimalist breakdown now shows the four rubric categories that make up the headline number — Engagement, Career, Attendance and Wellbeing — each with a short plain-language description of what it measures, a thin score-coloured meter and the 0–100 value ([`src/components/StudentRatingBreakdown.tsx`](src/components/StudentRatingBreakdown.tsx)).
- Hovering (or focusing) a category reveals a custom tooltip explaining how that category is scored — its weight, the signal-by-signal point rubric, the AI's short reason for this student, and a note that the headline number blends categories by weight. The tooltip renders in a portal so it is never clipped by the header card.
- Refined the breakdown's typographic hierarchy: an uppercase category label, a prominent score with a muted "/100", the meter, then a caption description.
- Categories with no supporting data render muted with an em dash. The strip appears only once a score has been generated and is hidden in redacted (no-PII) views.
- The rating state was lifted into the journey header so the score badge and the breakdown share a single source; `StudentRatingBadge` is now presentational ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/StudentRatingBadge.tsx`](src/components/StudentRatingBadge.tsx)).

### Added: Student tracking score (AI-core, code-finalised)

- Introduced a per-student tracking score shown as a minimal, text-free progress ring in the Student Journey header — a quick at-a-glance read of how a student is tracking, sized to sit quietly beside their name (Linear-style restraint) ([`src/components/StudentRatingBadge.tsx`](src/components/StudentRatingBadge.tsx), [`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- Scoring is manually triggered: until a score exists the badge shows a text-free empty state — an on-brand gauge-and-sparkle icon ([`public/rating-empty-state.png`](public/rating-empty-state.png)) — that the user clicks to generate, with a loading ring while it runs and a clickable retry state if it fails. Clicking an existing score regenerates it.
- Added a dedicated `rate-student` Supabase edge function that grades a compact, name-redacted data packet against a fixed rubric (engagement, career outcomes/CAP/WEX, attendance & momentum, growth & wellbeing) at `temperature: 0` and returns bounded category scores via OpenAI structured output — kept separate from `analyze-student` to avoid mixing concerns ([`supabase/functions/rate-student/index.ts`](supabase/functions/rate-student/index.ts)).
- Score aggregation, banding and support-need are computed deterministically in code, not by the model: weighted overall, band thresholds, and a support-need read derived from year level and cohort. Disadvantage indicators raise support need but never lower the achievement score ([`src/lib/studentRating.ts`](src/lib/studentRating.ts)).
- Ratings are cached in `localStorage` keyed by the same source fingerprint used for analysis, so the model is only re-run when the underlying student record changes; hidden entirely in redacted (no-PII) views ([`src/hooks/useStudentRating.ts`](src/hooks/useStudentRating.ts)).

### Added: Full session intervention detail in the slideout and AI analysis

- The activity timeline slideout now surfaces every EMCI-specific session field, not just three. Added Intervention Areas, Morrisby Activities, Career Action Plan, Industry Engagement, Work Experience Prep, Work Readiness, Other Intervention and the session Notes — each resolved from its `@FormattedValue` label for the multiselect picklists ([`src/services/surveyFields.ts`](src/services/surveyFields.ts), [`src/services/dataverse.ts`](src/services/dataverse.ts)).
- The AI analysis now receives the full per-session intervention detail (`sessionDetails`) as reference context, so summaries can reflect what actually happened in counselling sessions (Morrisby, CAP, industry engagement, work-readiness, notes) rather than just deterministic counts and survey snapshots ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts), [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts), [`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts)).
- Session detail is included in the analysis source fingerprint, so changes to session interventions correctly mark an existing analysis as out of date.

### Added: At-a-glance highlight chips on generated EMCI analyses

- When an analysis is generated, up to three minimal highlight chips now appear above the prose so a practitioner can instantly recognise a student — **Career Interest** (e.g. Firefighter), **Strength** (e.g. Music) and **Current Work** (e.g. KFC) ([`src/components/AnalysisHighlights.tsx`](src/components/AnalysisHighlights.tsx), [`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- Each chip renders a fitting icon chosen by the model from a fixed Lucide allowlist, keeping them consistent and instant (no per-value image generation) ([`src/lib/analysisHighlights.ts`](src/lib/analysisHighlights.ts)).
- The `analyze-student` edge function now returns structured highlights alongside the prose using OpenAI structured output, with values constrained to short, non-identifying terms ([`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts)).
- Highlights are persisted with the analysis (same encrypted field, backward-compatible JSON wrapper) and shown dimmed alongside an out-of-date analysis in the stale state ([`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts)).

### Added: On-brand illustrations for Analysis Summary states

- Generated two new empty-state illustrations matching the existing career guidance analysis icon style (peach circle, navy outlines, sparkle accents): [`public/analysis-not-yet-available.png`](public/analysis-not-yet-available.png) for the referral-stage "not yet available" state, and [`public/analysis-needs-regenerate.png`](public/analysis-needs-regenerate.png) for the stale "needs regenerate" state ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).

### Added: Context-aware Analysis Summary states on the Student Journey page

- The Analysis Summary card now shows distinct states based on programme progress and analysis freshness ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts)):
  - **Too early** (referral/consent, `stageProgress` &lt; 3): informational message only — no generate button, as insufficient data exists yet.
  - **Ready** (career guidance or complete, no stored analysis): existing empty state with "Generate EMCI Analysis" call-to-action.
  - **Current**: stored analysis displayed with optional Regenerate link.
  - **Stale**: amber banner when student data has changed since the analysis was generated, with a Regenerate prompt; previous analysis shown dimmed below.
- Staleness is detected by comparing a deterministic input fingerprint (`buildAnalysisSourceFingerprint`) against a `source_hash` persisted with each analysis ([`src/lib/studentInsights.ts`](src/lib/studentInsights.ts); Supabase migration `student_analysis_source_hash`).

### Changed: Consistent typography hierarchy across the Student Journey page

- Unified the page on a single Linear-inspired type scale — title (`text-2xl font-bold tracking-tight`), section eyebrow (`text-[10px] font-bold uppercase tracking-widest`), card heading (`text-sm font-semibold text-slate-900`), body prose (`text-sm text-slate-600`), inline label (`text-sm font-medium text-slate-700`) and caption (`text-xs text-slate-400`).
- Brought the Analysis Summary card into line: student name now uses tight tracking, analysis/fallback/empty-state prose use the shared `slate-600` body colour, and the empty-state heading matches the `slate-900` card-heading tier ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)). Quick Insights and Activity Timeline already conformed and were left unchanged.

### Changed: Per-step icons in the Student Journey progress stepper

- Each stepper node now shows a minimal, on-brand Lucide icon instead of a plain dot: Referral (`UserPlus`), Career Guidance (`Compass`) and Complete (`Flag`). Completed steps still display a check, and pending steps render their icon in muted slate ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- Stepper labels now use the Linear-inspired typography used across the app — sentence-case, `font-medium`, tight tracking — instead of wide uppercase micro-caps, with the current step emphasised in slate-900 and pending steps muted.

### Changed: Richer empty state for the Analysis Summary card

- Replaced the plain dashed "Generate EMCI Analysis" button with a friendly empty state featuring an illustration, a "No analysis generated yet" heading, a short description, and a solid primary call-to-action button ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- Added an on-brand AI-insight illustration generated for the empty state ([`public/analysis-empty-state.png`](public/analysis-empty-state.png)).

### Fixed: Student Journey header & progress stepper rendering inconsistencies

- Year level no longer disappears for students without a linked school. The school name and year badge were both gated behind `schoolName`, so a student with no school showed no year at all. The year badge now renders independently using the shared `formatYearLevelLine` helper ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).
- The progress stepper is now driven by the numeric `stageProgress` (0–4) — the same value the AI analysis reports as "X/4" — instead of the nullable `currentStage`. This removes the desync where a completed or inactive student could render an inconsistent or empty stepper while the analysis claimed "4/4". The stepper now renders deterministically and identically for every student regardless of status.
- Completed students (`stageProgress` 4) show all three steps as done; students in career guidance (3) show Referral done and Career Guidance current; not-yet-started students (0) show all steps pending.

### Fixed: Student header card "missing" on some students when navigating between profiles

- The `/student/:studentId` route reused a single scroll container across student navigations, so opening a new student inherited the previous scroll position. Combined with a redundant nested scroll container, the header card (name + progress stepper) could open already scrolled out of view, making it look like it was missing for "random" students — especially those with a tall generated analysis. ([`src/routes/StudentJourneyRoute.tsx`](src/routes/StudentJourneyRoute.tsx), [`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx))
- The breadcrumb/action bar is now pinned and only the content area scrolls, the redundant inner scroller was removed, and scroll resets to the top whenever the viewed student changes — so the header card is always visible when opening any student.

### Changed: Pointer cursor on all clickable elements in the Student Journey page

- Added `cursor-pointer` to every interactive element across the student page: breadcrumb button, View Details, Export PDF, Generate/Regenerate/Try again analysis buttons, timeline filter tabs, timeline event rows, event drawer close button, modal close button, and both modal/drawer backdrop overlays.

---

## — 2026-06-01

### Fixed: Student Journey header card disappearing for some students

- `StudentTimeline` called `format(parseISO(event.date), ...)` and `date.localeCompare()` without guarding against `null`/unparseable dates. For students whose Dataverse records contained a `null` or malformed `createdon`/`modifiedon` value, this threw a `RangeError`, crashing the component tree (no error boundary) and unmounting the entire `StudentJourneySummary` — including the header card.
- Fixed in [`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx): added `safeParse`/`safeFormat` helpers (backed by `date-fns` `isValid`) that return a `'—'` fallback instead of throwing, and guarded the sort comparator with `?? ''` on both sides.

### Added: Minimalist Linear-inspired Activity Timeline on the Student Journey screen

- New `StudentTimeline` component ([`src/components/StudentTimeline.tsx`](src/components/StudentTimeline.tsx)) renders a compact, grouped-by-month activity feed below the Analysis Summary and Quick Insights panels.
- Design is inspired by Linear.app: small coloured dots, type labels as uppercase pill badges, monospace dates, and a clean vertical connector line — no heavy cards.
- Filter tabs (All / Referral / Consent / Sessions / Surveys / Absences) appear when more than one event type is present; tab set is adaptive to what data exists.
- Clicking any event opens a minimal side drawer with full event detail (type, status, recorded-by, description, survey/session fields, and created/modified dates).
- Empty state with a neutral icon and label when no events match the active filter.
- Integrated into [`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx) as the third section after the analysis grid.

---

### Changed: Subtle modern refresh of the Student Journey progress stepper

- The progress stepper (Referral → Career Guidance → Complete) now adds a soft focus ring and shadow to active/completed step markers, rounds the connector lines, and uses smoother transitions — a light visual polish with no layout or behaviour changes ([`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx)).

### Added: AI-driven Analysis Summary + deterministic Quick Insights with pilot-survey shift narration

- The **Analysis Summary** card on the Student Journey page is now powered by the `analyze-student` Supabase Edge Function (GPT-4o mini) instead of static prose. A "Generate EMCI Analysis" button kicks off the call; loading / error / success states are surfaced inline, with a Regenerate action.
- **Quick Insights** panel rebuilt around the requested categories:
  - **Career Action Plan** — counts CAP-tagged sessions; renders `{count} · Complete|Pending`.
  - **Morrisby Unpack** — counts unpack/Morrisby-tagged sessions; renders `{count} · Complete|Pending`.
  - **Morrisby Profile** — Yes / No based on the student record.
  - **Work Experience** — Yes / No derived from affirmative responses on initial / mid / end pilot survey fields.
  - **Absences** — recorded count with an attention flag when the threshold is exceeded.
- **Pilot survey comparison** — start / mid / end survey snapshots are extracted from the student's timeline and passed to the edge function, which now narrates how the student's responses shifted across the programme (preparedness, understanding of strengths, work-experience exposure, programme helpfulness, focus areas).
- [`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts) extended to accept `insights` and `surveyShifts` in the request body, with an updated system prompt that requires the model to reference each insight category and to describe survey shifts when multiple stages are available. Deployed as version 2 (verify_jwt preserved as false).
- [`src/lib/studentInsights.ts`](src/lib/studentInsights.ts) (new) — `computeQuickInsights()` and `buildSurveyShifts()` operating on `TimelineEvent[]` + `Student`.
- [`src/components/QuickInsightsPanel.tsx`](src/components/QuickInsightsPanel.tsx) (new) — presentational component for the five insight rows.
- [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts) now accepts `events` and forwards the computed insights + survey shifts to the edge function.
- [`src/components/StudentJourneySummary.tsx`](src/components/StudentJourneySummary.tsx), [`src/components/StudentOverviewTab.tsx`](src/components/StudentOverviewTab.tsx), and [`src/components/StudentJourneyModal.tsx`](src/components/StudentJourneyModal.tsx) updated to accept and forward `events`.
- [`src/routes/StudentJourneyRoute.tsx`](src/routes/StudentJourneyRoute.tsx) re-derives the student's redacted timeline events from `studentEventsMap` and passes them to both the summary and the modal.
- Privacy-restricted mode (`hidePii`) keeps a deterministic static fallback summary instead of calling the AI.

### Changed: View Details modal merged into a single combined overview

- The student **View Details** modal no longer uses tabs (Overview / Profile / Timeline / Details). Everything is now shown in one scrollable view.
- New layout: the student profile card alongside programme progress, key details and AI Counsellor Analysis.

### Removed: Timeline from the View Details modal

- The student journey timeline is no longer rendered inside the View Details modal (it remains available on the main Student Journey page).
- `StudentJourneyModal` simplified (removed tab state, the unused `student` prop, and the `studentEvents` prop); `StudentJourneyRoute` no longer derives or passes timeline events to the modal; `ProfileSnapshot` and `StudentOverviewTab` adjusted to render as cards within the modal.

---

## — 2026-05-28

### Changed: Sidebar collapsed by default with hover-to-expand animation

- `MainSidebar` now renders collapsed (`w-14`, icon-only) by default and smoothly expands to full width (`w-64`) on hover.
- Smooth `transition-[width] duration-300 ease-in-out` on the `<aside>` element.
- Labels fade in with a short delay after the width starts opening (`opacity` transition + `delay-100`), and fade out immediately on collapse.
- Icons remain centered when collapsed; native `title` tooltips provide accessible labels in the collapsed state.
- No changes to `MainShell` or any other file — self-contained within `MainSidebar.tsx`.

---

## — 2026-05-28

### Added: Overview tab with AI-powered EMCI analysis

- New **Overview** tab (first tab in the student details modal) — shows:
  - 4-step programme stage tracker (Referral → Consent → Career Guidance → Complete) with done/in-progress/pending states
  - Key stats grid: Interview, Morrisby Profile, Absences, Student Type
  - AI Counsellor Analysis — calls the new `analyze-student` Supabase Edge Function (GPT-4o mini) to generate a professional EMCI engagement note; respects privacy mode (disabled when PII is hidden)
- [`supabase/functions/analyze-student/index.ts`](supabase/functions/analyze-student/index.ts): Deno edge function that accepts student programme data and returns an OpenAI-generated counsellor note. OpenAI key stored as a Supabase secret (`OPENAI_API_KEY`).
- [`src/hooks/useStudentAnalysis.ts`](src/hooks/useStudentAnalysis.ts): React hook (`useStudentAnalysis`) that calls the edge function via `supabase.functions.invoke`.
- [`src/components/StudentOverviewTab.tsx`](src/components/StudentOverviewTab.tsx): new component rendering the overview layout.
- `.env.example` updated with documentation for the Supabase secret setup.

### Deployment required

```bash
# 1. Set the OpenAI API key as a Supabase secret
supabase secrets set OPENAI_API_KEY=sk-proj-...

# 2. Deploy the edge function
supabase functions deploy analyze-student --project-ref yfvvroesornchrxufwut
```

---



- [`StudentJourneyModal`](src/components/StudentJourneyModal.tsx): new modal with three tabs — **Profile** (ProfileSnapshot), **Timeline** (TimelineCore), **Details** (ContextPanel). Clicking a timeline event auto-switches to the Details tab.
- Modal uses spring-animated sliding tab indicator, backdrop blur, and spring entry/exit — styled after the Linear app (clean, minimal, slate palette).
- Closes on `Escape` key or backdrop click.
- [`StudentJourneyRoute`](src/routes/StudentJourneyRoute.tsx): summary view is always the base; modal overlays it. Removed inline 3-panel body and now-unused `selectedEvent` state.

---



- New default view on the Student Journey page — replaces the three-panel layout as the entry point.
- [`StudentJourneySummary`](src/components/StudentJourneySummary.tsx): student name + status badge, school + year badge, horizontal 3-step progress stepper (Referral → Career Guidance → Complete), Analysis Summary paragraph derived from student data, and Quick Insights tags (colour-coded: default / success / warning).
- "View Details" toggle button in the header bar switches between the new summary view and the existing full three-panel layout (ProfileSnapshot + TimelineCore + ContextPanel).

### Changed

- Breadcrumb updated to: **Students → [Name] → [YearLevelLabel]** (was Dashboard → School/Students → Name).
- "Export to PDF" button label shortened to "Export PDF" for consistency with the new header layout.

---



- New [`src/lib/studentRedaction.ts`](src/lib/studentRedaction.ts): pattern builder, literal + fuzzy typo scrubbing, pseudonym labels, timeline event redaction, and unit tests (`npm run test`).
- **DE roles** (`de_staff`, `de_admin`): may open the **Students** roster (pseudonym column, no name/Morrisby/year/counsellor filters) and a **read-only Student Journey** with structured PII hidden and session/survey free-text scrubbed.
- [`canViewStudentRoster`](src/types/roles.ts) separated from [`canSeeStudentNames`](src/types/roles.ts); DE `canAccessPage('student')` enabled for read-only journey.
- [`ProfileSnapshot`](src/components/ProfileSnapshot.tsx), [`ContextPanel`](src/components/ContextPanel.tsx), [`StudentJourneyRoute`](src/routes/StudentJourneyRoute.tsx), and [`NetworkOverview`](src/components/NetworkOverview.tsx) updated for DE privacy mode.
- Dataverse [`cr89a_studentname`](src/services/dataverse.ts) mapped to `student.studentName` for redaction patterns.
- [`ROLES_AND_ACCESS.md`](ROLES_AND_ACCESS.md) updated to describe anonymized roster, redacted journey, and residual free-text risk.

---

## — 2026-05-07

### Changed: Unified searchable dropdown UI

- Added [`SearchableDropdown`](src/components/ui/SearchableDropdown.tsx) (counsellor **Filter by school** pattern: bordered trigger, search field, scrollable list, primary highlight, optional counts).
- Replaced native `<select>` and DevLab-style filter menus on **Students**, **Schools**, **School cohort**, **Counsellors**, **Team Management**, **Student Search**, and **Dataverse Lab** with the shared component.

### Fixed: SPA routes on Vercel (refresh / direct URLs)

- [`vercel.json`](vercel.json): catch-all rewrite to `index.html` so paths such as `/counsellors`, `/schools`, and `/student/:id` work on refresh and when opened directly (not only via in-app navigation).

### Changed: Counsellors page student roster

- [`CounsellorView`](src/components/CounsellorView.tsx): roster rows navigate to **`/student/:id`** when the role may open the student journey (same as schools/students lists).
- Student roster is **paginated** (10 per page) with Previous/Next and page numbers; page resets when counsellor or school filter changes.

### Changed: App title

- Browser tab, Open Graph title, sidebar tagline, and login branding use **EMCI Student Management Platform** (replacing **Student Intelligence Interface** / split **Platform** label).

### Changed: Australian English (programme)

- User-facing copy and docs use **programme** / **Programme** for EMCI and school context; existing **counsellor**, **enrolment**, and **organisation** forms retained. Internal module names (`networkProgramMetrics`, `SELECT_PROGRAM_CLASS`, `ProgramDataSkeleton`) unchanged.

### Changed: Schools list — region filter removed

- **Schools** (`/schools`): removed **Region** filter pills from the table toolbar; region is not implemented in Dataverse yet. Search by name or Morrisby ID is unchanged.

### Changed: Students list and student journey UI

- **Students** (`/students`): filter dropdowns (counsellor, stage, year level, status, school) use a shared **grid** on large screens so **All Schools** stays aligned with the other filters instead of wrapping alone on a second row.
- **Student journey** (`/student/:id`): removed the top **metric tile** row (Progress, Absences, Guidance Sessions, Current Stage); profile sidebar and timeline are unchanged.

### Changed: Students list (`/students`) table toolbar

- **Search** and **filters** (counsellor, stage, year level, status, school) moved from the page header into the **white table card** toolbar — same pattern as [`SchoolDashboard`](src/components/SchoolDashboard.tsx) and the schools list.
- Page header is **Students** title only.

### Changed: Schools list (`/schools`) table toolbar

- **Search** and **region** filters moved from the page header into the **white table card** toolbar (same pattern as [`SchoolDashboard`](src/components/SchoolDashboard.tsx): search left, region pills right).
- Page header is **Schools** title only; KPI strip unchanged above the table.

### Changed: en-AU locale for displayed numbers

- KPI counts and similar `toLocaleString()` output use **`en-AU`** in [`networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts), [`NetworkOverview.tsx`](src/components/NetworkOverview.tsx), [`SchoolDashboard.tsx`](src/components/SchoolDashboard.tsx), and [`DataverseLab.tsx`](src/components/DataverseLab.tsx).

### Changed: US spelling — program; shared code symbols renamed

- User-facing copy and docs use **program** / **Program** consistently (replacing **programme** / **Programme**) across the app, [`README.md`](README.md), [`ROLES_AND_ACCESS.md`](ROLES_AND_ACCESS.md), [`DATAVERSE_CONNECTION_REFERENCE.md`](DATAVERSE_CONNECTION_REFERENCE.md) prose, and [`index.html`](index.html) meta tags (exact Dataverse attribute logical names in tables are unchanged where they differ).
- Renamed modules: [`selectProgramClass.ts`](src/lib/selectProgramClass.ts) (`SELECT_PROGRAM_CLASS`, `SELECT_PROGRAM_CORE`), [`networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts) (`getProgramVisibleScope`, `buildProgramKpiCards`, `ProgramKpiCard`), [`ProgramDataSkeleton.tsx`](src/components/skeletons/ProgramDataSkeleton.tsx).

### Changed: Schools list (`/schools`) header

- **Region** filter pills moved from the top-right of the header to a row **below** the header (above the KPI strip), so the bar is **Schools** + search only.

### Changed: School cohort page (`/school/:id`)

- [`SchoolDashboard`](src/components/SchoolDashboard.tsx) uses the same **white bordered header** pattern as program list views: **school name**, **Morrisby ID**, and status; removed breadcrumb and **Back to dashboard**. [`SchoolRoute`](src/routes/SchoolRoute.tsx) no longer passes **`onBack`**.

### Changed: MainSidebar

- Nav buttons (**Dashboard**, **Schools**, **Students**, **Counsellors**, **Dataverse Lab**, **Team Management**) and **Sign out** include **`cursor-pointer`**.

### Changed: Program loading UX

- **Connecting to EMCI Student Management Platform…** (with spinner) is shown **only** while the Dataverse **token** is fetched immediately after sign-in (`stage === 'ready'`), not while schools/students/events are loading.
- Program **data load and refresh** use a full-view **[`ProgramDataSkeleton`](src/components/skeletons/ProgramDataSkeleton.tsx)** overlay (responsive pulse placeholders) instead of that copy.

### Changed: Students program list (`/students`)

- **Student Roster** page heading renamed to **Students** in [`NetworkOverview`](src/components/NetworkOverview.tsx).
- Removed the **Actions** column from the students table; roles that can open the student journey still do so by **clicking the row**.
- Added compact roster **filters** (counsellor, current stage, year level, status) above the students table, combined with search and school scope.
- **Students** page: roster filters sit in the **same header band** as the school scope control (right-aligned cluster on large screens) so they line up with **All Schools**.

### Fixed: Dataverse `cr89a_yearlevel` (EMCI Students)

- Picklist codes aligned with Dataverse choices: **1000–1006** mapped in **[`dataverse.ts`](src/services/dataverse.ts)** (including **1006** EMCI 2025 Y9 and **1003** **15+** via internal bucket **`YEAR_LEVEL_PLUS_BUCKET`** in [`studentsData.ts`](src/data/studentsData.ts)); removed incorrect **1003 → Year 11** and the **`code - 1000`** fallback that could mis-decode unknown options.
- **[`formatYearLevelLine`](src/data/studentsData.ts)** used across roster/school tables, profile, PDF export, counsellor/survey tools, and DevLab student search so **cohort labels** and **15+** display correctly.

### Changed: Auth session refresh (tab refocus)

- **[`AuthContext`](src/context/AuthContext.tsx)** treats **`TOKEN_REFRESHED`** (common when returning to the browser tab) as a **silent** revalidation: it skips forcing **`stage === 'loading'`**, which was flashing the full-screen bootstrap UI and felt like a reload.

### Changed: Program network headers

- Removed the placeholder **notification bell** from the **Schools** and **Students** [`NetworkOverview`](src/components/NetworkOverview.tsx) headers (notifications deferred).

- **`/counsellors`**, **`/student/:studentId`**, and **`/student/:studentId/pdf`** now render inside **[`MainShell`](src/routes/MainShell.tsx)** with the same **[`MainSidebar`](src/components/layout/MainSidebar.tsx)** as the program dashboard, schools list, students list, and school drill-in (shared data error banner above the outlet).
- **Students** nav highlights for **`/students`** and any path under **`/student/`**; **Counsellors** highlights on **`/counsellors`**.
- **[`CounsellorView`](src/components/CounsellorView.tsx)** uses **`h-full` / `min-h-0`** for the shell outlet and no longer shows a duplicate “back to dashboard” header.
- **[`StudentJourneyRoute`](src/routes/StudentJourneyRoute.tsx)** removes the duplicate data-error strip and **Sign out** (handled in **`MainShell`** / sidebar); journey columns use **`min-h-0`** for reliable flex scrolling.

### Added: Student absence count (risk context)

- **`Student.absenceCount`** reflects linked **absence** records: set in **[`enrichStudents`](src/services/dataverse.ts)** (with **[`mapStudent`](src/services/dataverse.ts)** default `0`), aligned with demo **`riskLevel`** in seed data.
- **[`NetworkOverview`](src/components/NetworkOverview.tsx)** and **[`SchoolDashboard`](src/components/SchoolDashboard.tsx)** show the count beside at-risk context; **[`ProfileSnapshot`](src/components/ProfileSnapshot.tsx)** shows **Absences** on the student journey.

### Changed: Native `<select>` styling (program chrome)

- Shared **[`SELECT_PROGRAM_CLASS`](src/lib/selectProgramClass.ts)** / **`SELECT_PROGRAM_CORE`** (slate fill, no border, `rounded-lg`, compact height) applied across roster/school filters, **[`DataverseLab`](src/components/DataverseLab.tsx)** toolbar selects, and **[`TeamManagement`](src/components/TeamManagement.tsx)** invite / inline role controls so native dropdowns match the **School** scope control. **Preview as** controls in Team admin stay amber-themed.

### Added: URL routing (React Router)

- **`react-router-dom`** with **`BrowserRouter`** in [`src/main.tsx`](src/main.tsx). Authenticated app screens use **`Routes`** in [`src/App.tsx`](src/App.tsx) with opaque **Dataverse primary keys** in paths: **`/school/:schoolId`**, **`/student/:studentId`**, **`/student/:studentId/pdf`** (see [`src/lib/recordIdParam.ts`](src/lib/recordIdParam.ts) for param validation).
- **Program paths:** **`/dashboard`** (landing), **`/schools`** (all-schools directory), **`/students`** (network roster); **[`DashboardHome`](src/components/DashboardHome.tsx)** + **[`SchoolsListRoute`](src/routes/SchoolsListRoute.tsx)** / **[`StudentsListRoute`](src/routes/StudentsListRoute.tsx)**; shared KPI logic in [`src/lib/networkProgramMetrics.ts`](src/lib/networkProgramMetrics.ts).
- **Nested dev lab paths:** **`/devlab/survey-search`**, **`/devlab/student-search`** under **`/devlab`**.
- Shared data for route modules via **[`OutletContextBridge`](src/routes/OutletContextBridge.tsx)** + **`AppShellOutletContext`** ([`src/routes/shellContext.ts`](src/routes/shellContext.ts)); **[`MainShell`](src/routes/MainShell.tsx)** wraps the main program shell (dashboard, schools, students, school drill-in, counsellors, student journey, PDF) with **`MainSidebar`**.
- **School-role home** still runs once per role + school id but now **`navigate('/school/{id}', { replace: true })`** so the address bar matches the school view.

### Changed: Shared shell for dashboard and school drill-in

- **[`MainSidebar`](src/components/layout/MainSidebar.tsx)** includes an explicit **Dashboard** item and path-based active states: **`/dashboard`**, **`/schools`** / **`/school/...`**, **`/students`** / **`/student/...`**, **`/counsellors`** (where the role may see those items).
- **[`NetworkOverview`](src/components/NetworkOverview.tsx)** is used only on **`/schools`** and **`/students`**; KPI scope matches [`getProgramVisibleScope`](src/lib/networkProgramMetrics.ts).
- **[`SchoolDashboard`](src/components/SchoolDashboard.tsx)** sits in that shell with **`flex-1`** layout (no duplicate full-screen chrome header).

### Fixed: Navigation edge cases

- **School-role home redirect** runs **once per `userRole` + `schoolId`** (ref marker), not on every `schools` array identity change from `loadData`, so school users can stay on the **program dashboard** after a refresh.
- **School drill-in** remains gated with **`canAccessPage(role, 'school')`**; **school users** are redirected to their own **`/school/{id}`** if the path id does not match their assigned school.
- Invalid or unknown **school** ids in the URL redirect to **`/schools`**; invalid **student** / forbidden cases redirect to **`/dashboard`**.

### Added: Student deactivation display (Dataverse read-only)

- Extended student `$select` and mapping for **`cr89a_studentdeactivation`**, **`cr89a_studentdeactivationtimestamp`**, and **`cr89a_studentdeactivationyeargroup`** (see `DATAVERSE_CONNECTION_REFERENCE.md`).
- **Student journey** (`ProfileSnapshot`): when any of those fields are present, shows **read-only** reason, recorded time, and year group at exit. EMCI does **not** PATCH deactivation or load picklist metadata for editing.

### Added: Sign out

- **`signOutUser`** on `AuthContext` calls Supabase `signOut` and clears role preview state.
- **Network Overview** sidebar footer and **student journey** header include **Sign out**.

### Changed: Navigation shell and naming

- Sidebar tagline **Network Management** → **Student Management**; removed redundant **Dashboard** nav row that duplicated **Schools** and caused a double-active highlight; main schools view title **Network Overview** → **Dashboard**.
- **Counsellor View** and **School Dashboard** back links use **Dashboard** wording; school breadcrumb **Network** → **Dashboard**.
- **School Dashboard** header: removed non-functional fake nav, bell/settings placeholders, and stock avatar; kept a single clear title and existing table search/filters.

### Removed

- Unused **`Header.tsx`** component (was imported but never rendered; used placeholder images).

### Changed: Post-sign-in loading copy and layout

- **Connecting to EMCI Student Management Platform…** appears only during the **token** step after login; program data loading uses a skeleton overlay (see **Changed: Program loading UX** above).
- Spinner (`Loader2`) is shown inline beside the EMCI status text; `role="status"` and `aria-live="polite"` retained for that screen.

### Changed: School roles can now view student journeys (read-only)

- `canAccessPage(role, 'student')` now allows the **school** role group as well as ACCE.
- School Admin / School Staff can click into a student from either the Network Overview roster or their School Dashboard and view the full timeline / event history for their school's students.
- PDF export remains ACCE-only (separate gate at `canAccessPage(role, 'pdf')`).
- DE roles continue to be blocked from any student journey access.
- Aligns the implementation with `ROLES_AND_ACCESS.md` lines 76 ("View the activity feed and event history for students at their school") which had previously contradicted the access matrix.

### Fixed: Production Dataverse proxy — strip injected `path` query param

- The Vercel rewrite for `/dataverse/:path*` injects a `path=...` query parameter, which the proxy was forwarding to Dataverse along with the original `$select`/`$filter` params.
- Dataverse rejected the unknown `path` param with HTTP 400 `0x80060888` ("The query parameter [path] is not supported"), causing all student and school fetches in production to fail.
- The proxy now strips the `path` parameter from the forwarded query string, preserving literal `$select` etc. (regex-based to avoid URL re-encoding).
- Localhost was unaffected because the Vite dev server uses a different proxy mechanism that doesn't inject `path`.

### Fixed: Access control audit — DE student identifier leaks closed

- **DE roles no longer see the Students roster tab** in Network Overview — the spec requires DE access to be aggregated only, no per-student rows.
- **DE roles no longer see student-identifying columns** (Name, Year, Counsellor) if the roster is reached via a future code path. The Name column is replaced with a generic "Student" column showing an `EyeOff` icon and a redacted label as defence-in-depth.
- **Column headers stay aligned with cells**: when `showStudentNames === false`, the Name/Year/Counsellor `<th>` headers are hidden in lockstep with their `<td>` cells (previously headers showed but cells displayed `—`, breaking layout intent).
- **Actions column** is now gated on `showStudentJourney` for both header and cells, keeping column counts balanced across all three role tiers (DE: 5 cols, School: 7 cols, ACCE: 8 cols).
- If an `acce_admin` previews as a DE role while sitting on the Students view, the view auto-switches back to Schools so no roster data flashes.

### Added: Role impersonation / Preview As

- `acce_admin` can now preview the UI as any role directly from the Team Management page.
- A "Preview as role" panel appears at the top of Team Management with Type, Role, and (when School is selected) a school name dropdown.
- Clicking **Preview** overrides the effective role for all UI rendering — page visibility, data redaction, nav items, and permission gates all respond as if that role were logged in.
- A persistent amber banner is shown on every page while a preview is active, showing the current preview role and a **Restore my access** button.
- Impersonation is stored in `sessionStorage` so it survives page refreshes within the tab but is cleared when the tab closes or the user signs out.
- No database changes are made — this is purely a UI state override.

---

### Changed: Add team member modal — Type selector and school name dropdown

- Added **Type** dropdown to the Add team member modal (ACCE / School / Department of Education), visible for `acce_admin` only.
- Role dropdown now filters to only show roles belonging to the selected type (e.g. selecting "School" shows only School Admin / School Staff).
- Replaced the raw GUID text field for school assignment with a **school name dropdown** populated from the loaded Dataverse school list. Falls back to a text input if schools haven't loaded.
- For `school_admin`, the school field now shows the school name (not raw ID) and remains locked to their own school.
- `App.tsx` passes the loaded `schools` list to `TeamManagement` so the dropdown is populated without an extra fetch.

### Fixed: Dataverse 400 errors on schools and students fetch

- Removed `new_studenttypemultiselect` and `cr89a_prioritycohort` from the students `$select` — these fields use a different Dataverse solution publisher prefix (`new_`) and do not exist on all instances, causing `0x80060888`.
- Added explicit `SCHOOL_SELECT` to `fetchSchools` — without it Dataverse attempted to return non-queryable metadata columns and returned 400.

---

## [Unreleased] — 2026-05-06

### Added: Role-Based Access Control (RBAC), Team Management UI, and Multi-Auth

Implemented a full six-role RBAC system across three role groups. Each group has an Admin and a Staff sub-role. Added a Team Management page, email/password login with enforced MFA for external users, and role-scoped page/data visibility.

#### Added: Supabase — `emci_user_roles` table and helpers
- New `emci_role` PostgreSQL enum: `acce_admin`, `acce_staff`, `school_admin`, `school_staff`, `de_admin`, `de_staff`.
- `emci_user_roles` table: stores user_id, email, display_name, role, school_id, is_active, created_at, created_by.
- Supports email-based invite flow — rows with `user_id = null` are claimed on first login by matching email.
- RLS policies: users always read their own row; `acce_admin` full CRUD; `acce_staff` reads all; `school_admin/staff` scoped to their school; `de_admin/staff` scoped to DE roles.
- Helper functions: `emci_get_my_role()` and `emci_get_my_school_id()` (SECURITY DEFINER, used by RLS without recursion).

#### Added: `src/types/roles.ts`
- `AppRole` type, `RoleGroup` type, `Page` type (moved here from App.tsx).
- Helpers: `getRoleGroup`, `isAdminRole`, `canAccessPage`, `canSeeStudentNames`, `canWrite`, `canManageTeam`, `assignableRoles`.
- `ROLE_LABELS` and `ROLE_GROUP_LABELS` display maps.

#### Added: `src/context/AuthContext.tsx`
- `AuthProvider` wraps the app and exposes `authUser`, `userRole`, `schoolId`, `stage`, and `refresh`.
- Auth stages: `loading`, `unauthenticated`, `mfa_required`, `mfa_enroll`, `no_role`, `ready`.
- ACCE users (SSO) are not subject to MFA checks. External users must reach `aal2` before `stage = 'ready'`.
- New users with no role row see a "Access pending" screen until an admin assigns their role.

#### Updated: `src/services/supabase.ts`
- Added `signInWithEmail(email, password)` for external user login.
- Added `getMfaFactors`, `isMfaVerified`, `enrollMfa`, `challengeMfa`, `verifyMfa`, `unenrollMfa` for full Supabase TOTP MFA flow.
- Added `getUserRole(userId, email)` — fetches role record, claims pending email-only invites by updating user_id.
- Added `listTeamMembers`, `addTeamMember`, `updateTeamMemberRole`, `toggleTeamMemberActive` for team management.

#### Updated: `src/components/LoginPage.tsx`
- Split into two tabs: **ACCE Staff** (Microsoft SSO) and **School / DE Login** (email + password).
- MFA enrolment screen: shown on first external login — displays TOTP QR code and manual secret, prompts for 6-digit code.
- MFA verification screen: shown on subsequent external logins when session is AAL1 only.
- "Access pending" screen: shown when role is not yet assigned.
- All screens share a consistent `AuthShell` layout.

#### Added: `src/components/TeamManagement.tsx`
- Full team management UI accessible to `acce_admin`, `school_admin`, and `de_admin`.
- Searchable, filterable table of all users (by role group, active status, name/email).
- Inline role editor: change a user's role with a dropdown and save button.
- Activate/deactivate toggle per user.
- "Add user" modal: enter email, optional display name, role, and school ID (required for school roles).
- Scoped by admin type: `school_admin` can only assign school roles; `de_admin` can only assign DE roles; `acce_admin` can assign any role.

#### Updated: `src/App.tsx`
- Wrapped `AppInner` in `AuthProvider`.
- Auth gate uses `stage` from `AuthContext` instead of bare `authUser` check.
- All `goTo(page)` calls pass through `canAccessPage(userRole, page)` guard.
- `SchoolDashboard.onSelectStudent` is `undefined` for school/DE roles (read-only mode).
- School users land directly on their school dashboard on login (matched by `school_id`).
- DE users land on the Network Overview (aggregated stats only).
- PDF export button hidden for roles without `canAccessPage(role, 'pdf')`.
- Team Management page wired at `page === 'team'`.

#### Updated: `src/components/NetworkOverview.tsx`
- Accepts `userRole: AppRole`, `onGoToTeam` props.
- Counsellors nav item hidden for non-ACCE roles.
- Dataverse Lab nav item hidden for non-ACCE roles.
- Team Management nav item shown for admin roles only.
- Sidebar user display shows real `authUser.displayName` and `ROLE_LABELS[userRole]` instead of hardcoded "EMCI Admin".
- Student roster: names, year level, Morrisby ID, and counsellor columns redacted for DE users (`showStudentNames = false`).
- Student rows are not clickable for roles without `canAccessPage(role, 'student')`.

#### Updated: `src/components/SchoolDashboard.tsx`
- `onSelectStudent` prop is now optional (`?`). When absent, rows are not clickable and the Actions column is hidden.

---

### Changed: SEO and App Identity

Updated `index.html`, `package.json`, and added `public/robots.txt` to correctly identify the platform.

#### Updated: `index.html`
- `<title>` changed from "My Google AI Studio App" to "EMCI — Student Intelligence Interface".
- Added `<meta name="description">` with EMCI product description and SecureLogic Solutions attribution.
- Added `<meta name="application-name">` (`EMCI`) and `<meta name="author">` (`SecureLogic Solutions`).
- Added Open Graph tags: `og:type`, `og:title`, `og:description`, `og:site_name`.
- Added `<meta name="theme-color">` (`#0f172a`).
- Added `<link rel="icon">` pointing to `/favicon.ico`.
- Added `<meta name="robots" content="noindex, nofollow">` — private authenticated platform, not for public indexing.

#### Added: `public/robots.txt`
- Disallows all crawler access (`User-agent: * / Disallow: /`). Private app — no public content to index.

#### Updated: `package.json`
- `name` changed from `react-example` to `emci-student-intelligence-interface`.
- Added `description` field.

---

### Changed: Roles & Access Restructure

Replaced the previous seven-role structure in [`ROLES_AND_ACCESS.md`](./ROLES_AND_ACCESS.md) with a streamlined three-role model and documented the authentication method for each role.

- **ACCE Users** — internal ACCE / EMCI staff. Authenticate via **Microsoft SSO (Azure AD)**. Full read/write access across the entire platform; can view all schools, all students (including names and identifiers), counsellor data, dashboards, PDF exports, the Dataverse Developer Lab, and system configuration.
- **School Administrators / Principals** — authenticate via **username + password + mandatory MFA**. Read-only access scoped strictly to their own school. Can view their school's student names, stage progress, counsellor assignments, and dashboard. Cannot see any data from other schools.
- **Department of Education / DE External Users** — authenticate via **username + password + mandatory MFA**. Aggregated read-only access only. **Must never see student names, IDs, year levels, Morrisby IDs, or any other individual student identifier anywhere in the platform.** Limited to network-level KPIs, per-school completion percentages, regional breakdowns, and anonymised exports.

#### Updated: `ROLES_AND_ACCESS.md`
- Tier table rewritten to map the three role groups to their authentication methods.
- Role Definitions section consolidated from seven roles to three, each with explicit authentication, "What They Can Do", "What They Cannot Do", and Data Scope.
- Access Matrix reduced from seven columns to three; access values updated to match the new model.
- Role Assignment table now includes an Authentication Method column alongside the suggested AAD groups (`EMCI-ACCEUsers`, `EMCI-SchoolAdmins`, `EMCI-DoE`).
- Data Privacy & Compliance section reinforced — DE External Users are explicitly prohibited from viewing any student PII at both the data and presentation layers; MFA is mandatory for all non-SSO sign-ins.
- MFA enrolment enforced on first login for all username + password roles — access is blocked until MFA setup is complete; MFA cannot be bypassed or deferred.
- MFA session tokens expire in less than 24 hours — users must re-authenticate with MFA on each new session.

---

## [Unreleased] — 2026-03-24

### Vercel Deployment Support

Added full Vercel serverless deployment support, replacing Vite development-only server plugins with production-ready API routes.

#### Added: `api/devtoken.ts`
- Vercel serverless function that handles `POST /devtoken`, exchanging Azure AD client credentials for an access token.
- Reads `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, and `TOKEN_SCOPE` from server-side environment variables (no `VITE_` prefix — never exposed to the browser).
- Returns Azure AD token response with CORS headers for consumption by the frontend Dataverse service.

#### Added: `api/dataverse.ts`
- Vercel serverless proxy function that handles `/dataverse/:path*` requests, forwarding them to `https://mcicrm.crm6.dynamics.com`.
- Passes through the client-supplied `Authorization` header, `Prefer`, and OData headers.

#### Added: `vercel.json`
- Rewrites `/devtoken` → `/api/devtoken` and `/dataverse/:path*` → `/api/dataverse` so the frontend URL structure remains unchanged between dev and production.
- Sets `maxDuration` for both functions (10s token, 30s proxy).

#### Updated: `vite.config.ts`
- Azure AD credentials now read from non-`VITE_`-prefixed env vars (`TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `TOKEN_SCOPE`) with fallback to old `VITE_`-prefixed names for backwards compatibility.

#### Updated: `.env` / `.env.example`
- Azure AD secrets updated to use `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `TOKEN_SCOPE` (no `VITE_` prefix). Supabase public keys retain the `VITE_` prefix.
- **Security fix:** `VITE_`-prefixed vars are baked into the browser bundle by Vite — removing the prefix from secrets ensures they remain server-side only.

**Vercel environment variables to add in Dashboard → Settings → Environment Variables:**

| Variable | Where used |
|---|---|
| `TENANT_ID` | `api/devtoken.ts` (server only) |
| `CLIENT_ID` | `api/devtoken.ts` (server only) |
| `CLIENT_SECRET` | `api/devtoken.ts` (server only) |
| `TOKEN_SCOPE` | `api/devtoken.ts` (server only) |
| `VITE_SUPABASE_URL` | Frontend (Supabase client) |
| `VITE_SUPABASE_ANON_KEY` | Frontend (Supabase client) |

---

## [Unreleased] — 2026-03-20

### Microsoft SSO via Supabase Auth

Implemented Microsoft Azure AD Single Sign-On using Supabase Auth as the identity broker. Users must authenticate with their SecureLogic Microsoft account before accessing the platform.

#### Added: `src/services/supabase.ts`
- Initialises `@supabase/supabase-js` client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars.
- `signInWithMicrosoft()` — triggers `supabase.auth.signInWithOAuth({ provider: 'azure' })` with `openid profile email` scopes and `redirectTo: window.location.origin`.
- `signOut()` — calls `supabase.auth.signOut()`.
- `getSession()` — returns current Supabase session.
- `mapUser(user)` — maps Supabase `User` to `AppUser` (`id`, `email`, `displayName`, `firstName`, `avatarUrl`) from Microsoft `user_metadata`.

#### Added: `src/components/LoginPage.tsx`
- Full-screen branded login page with EMCI logo, background ring decoration, and "Sign in with Microsoft" button (black, Microsoft four-square logo).
- Shows inline error if OAuth fails to initiate.
- Loading state persists while browser redirects to Microsoft.
- Security note: "credentials are never stored by EMCI."

#### Updated: `src/App.tsx`
- Imports `supabase`, `mapUser`, `AppUser` from `src/services/supabase.ts`.
- `authUser` + `authLoading` state managed via `supabase.auth.getSession()` on mount and `supabase.auth.onAuthStateChange` listener (subscription cleaned up on unmount).
- **SSO gate:** renders a spinner while auth state is loading, then `<LoginPage />` if unauthenticated — all existing app pages are unreachable without a valid Supabase session.
- `authUser` available to pass to Header for name/avatar display.

#### Updated: `.env` / `.env.example`
- Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

#### Setup required (one-time, manual):
1. **Supabase Dashboard** → Authentication → Providers → Azure → Enable, enter:
   - Client ID: *(see .env / Azure Portal)*
   - Client Secret: *(see .env — never commit)*
   - Azure Tenant URL: `https://login.microsoftonline.com/<tenant-id>`
2. **Azure Portal** → App Registrations → Authentication → Add redirect URI:
   - `https://<project>.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** → Authentication → URL Configuration → add `http://localhost:5173` to Allowed Redirect URLs (for local dev).

### New Feature: Student Search page (Dataverse Lab)

A new **Student Search** page accessible from Dataverse Lab via the "Student Search" button in the header.

#### Added: `src/components/StudentSearch.tsx`
- Full-screen page with free-text search + 9 categorical filter dropdowns.
- **Free-text** searches across: first name, last name, preferred name, Morrisby ID, email, counsellor, school name, student type, year level label, stage label, and record ID simultaneously.
- **Filter dropdowns** (each with inline search when > 6 options): Year Level, Status, Stage, Risk Level, Counsellor, School, Student Type, Interviewed (Yes/No), Has Profile (Yes/No).
- Filters toggle panel (collapsible) with a live badge count of active filters.
- "Reset" button in header clears all filters and query at once.
- Results table with column headers: Name, Year, School, Stage, Risk, Status, Flags (interviewed/profile icons).
- Click any row to **expand** a full field grid showing all 16 student fields (full name, preferred name, Morrisby ID, email, year label, school, counsellor, status, stage, progress, risk, student type, interviewed, has profile, last activity, record ID).
- Footer shows result count and icon legend.

#### Updated: `src/App.tsx`
- Added `'studentsearch'` to the `Page` union type.
- Renders `<StudentSearch students schools onBack>` for the new page.
- `DataverseLab` now receives `onGoToStudentSearch` prop.

#### Updated: `src/components/DataverseLab.tsx`
- Added optional `onGoToStudentSearch?: () => void` prop.
- Added `Users` lucide icon import.
- Added "Student Search" button in the header action bar (alongside Survey Search).

### Network Overview — Remove "All Regions" button

#### Updated: `src/components/NetworkOverview.tsx`
- Removed the "All Regions" pill button from the region filter bar by filtering `r !== 'all'` from the render loop.
- `handleRegion` updated to toggle behaviour: clicking an already-active region pill resets the filter back to `'all'` (deselects it), preserving the ability to clear the filter without the dedicated "All Regions" button.

### PDF Export — Full redesign to match concept

Rebuilt `PdfPreview.tsx` from scratch to match the `concept/screen.png` and `concept/code.html` reference design.

#### Updated: `src/components/PdfPreview.tsx`
- **Toolbar (no-print):** breadcrumb "Student Journey / PDF Export", report title, Print button and orange "Export PDF" button calling `window.print()`.
- **A4 page layout:** white `210mm × 297mm` page with `20mm` padding, subtle shadow, thin orange right-edge accent stripe, and absolute footer.
- **Report Header:** student initials avatar, name, `Year X · Student ID`, school name on the left; EMCI grid logo, "Official Progress Report" label and generated date on the right. Separated from body by an orange-tinted border.
- **Stage Timeline:** 4-stage horizontal grid (Referral → Consent → Career Guidance → Complete) with connecting line; stages show Completed/Active/Upcoming state derived from real `currentStage` + `stageProgress` props.
- **Academic Trends:** static bar chart placeholder (6-month bars, orange highlights on recent months).
- **Attendance:** SVG donut ring chart derived from the student's absence count.
- **Work Readiness Checklist:** 3-column grid — Program Milestones checklist, Survey Records tags, Program Progress bars — all driven by real event data.
- **Activity Log:** table of up to 8 most recent timeline events (date, title, description truncated, status badge) from real `events` prop.
- **Counsellor Insights:** contextual quote generated from `currentStage`, with counsellor name and signature line.
- **Footer:** page number, year, confidential note.
- **Print tip banner (no-print):** info box reminding about print settings.
- Removed dependency on `timelineData` static fixture and `date-fns differenceInDays`.

#### Updated: `src/App.tsx`
- `PdfPreview` now receives `currentStage`, `stageProgress`, and `events` props.

#### Updated: `src/index.css`
- Added `@media print` block: hides `.no-print` elements, resets body background and overflow, collapses A4 page margins/shadow for clean print output.

### Counsellor View — School filter UX improvements

#### Updated: `src/components/CounsellorView.tsx`
- Removed school name pills from the counsellor profile header card; replaced with a compact "N schools" subtitle.
- Replaced the plain `<select>` school filter with a **custom searchable dropdown**: click the trigger button to open a panel with a live-search input and a scrollable list of school options (each showing student count). Closes on outside click.
- Added `schoolDropdownOpen`, `schoolSearch`, `filteredSchoolOptions`, `selectedSchoolName` state/memos.
- Added `dropdownRef` + `useEffect` outside-click handler to auto-close the dropdown.
- Added `Search`, `X` icon imports; removed unused `Award` import.

### Counsellor View — School Filter on Student Roster

#### Updated: `src/components/CounsellorView.tsx`
- Added `selectedSchoolId` state (defaults to `'all'`) that resets when switching counsellors.
- `counsellorStats()` now returns `schoolObjects: { id, name }[]` — the unique schools (sorted by name) that the counsellor has students in — in addition to the existing `schoolsServed` name list.
- Added a **school filter dropdown** (`<select>`) that appears above the Student Roster header when a counsellor serves more than one school. Each option shows the school name and student count.
- A **"Clear" link** appears when a school is actively filtered, allowing quick reset back to all schools.
- Roster header now shows a `"N of M students"` count in orange when a school filter is active.
- Student rows filtered via a `rosterStudents` memo derived from `selectedSchoolId`.
- Added `ChevronDown` and `AnimatePresence` imports for the dropdown chevron and clear-button animation.

### New Feature: Survey Search Page

A new **Survey Search** page has been added, accessible from Dataverse Lab via the "Survey Search" button in the header.

#### Added: `src/components/SurveySearch.tsx`
- New full-screen page component allowing selection of any student to view all their survey responses.
- Left panel: searchable student list with survey count badges per student.
- Right panel: shows all survey-type timeline events for the selected student, grouped with collapsible cards per survey record.
- Each survey card displays the survey type label (Initial / Initial 2026 / Mid-Pilot / End of Pilot / End of Pilot 2026), completion status badge, date, and counsellor, plus all `surveyFields` rendered as a 2-column grid of label/value pairs.
- Filter bar appears when a student has multiple survey types, allowing filtering by survey category.
- Graceful empty states for students with no survey records.

#### Updated: `src/App.tsx`
- Added `'surveysearch'` to the `Page` union type.
- Imports and renders `<SurveySearch>` with the pre-built `students` and `studentEventsMap` from the existing data load.
- Navigation: `DevLab → Survey Search` (back button returns to DevLab).
- `DataverseLab` now receives `onGoToSurveySearch` prop.

#### Updated: `src/components/DataverseLab.tsx`
- Added optional `onGoToSurveySearch?: () => void` prop to `DataversLabProps`.
- Added `ClipboardList` lucide icon import.
- Added "Survey Search" button in the header action bar (violet styled, consistent with DevLab accent).

---

### Survey Matching — Diagnosis Complete + UX Cleanup

**Finding from diagnostic logging:** The `EndOfPilotSurveys2026` table has only 1 record, linked to a test account ("Securelogic Student", `stage=null`) — it will never match a real student. The legacy end-of-pilot surveys (61 records) correctly match 60 real students. Students without survey data were showing a misleading "Post-program survey completed" fallback.

#### Updated: `src/App.tsx`
- Removed all diagnostic `console.log` / `console.warn` blocks now that the root cause is identified.

#### Updated: `src/services/dataverse.ts`
- Fallback end survey event: `status` changed from `'Completed'` → `'Pending'`; `description` changed to `'No survey responses recorded yet.'`; `notes` cleared.

#### Updated: `src/components/TimelineCore.tsx`
- Modal now shows a proper empty-state panel (icon + "No survey responses on record" + explainer text) when `surveyFields` is empty and no meaningful description is present, instead of misleading fallback notes.

**Root cause:** The generic `fetchActivity` helper pre-filtered every record where `_regardingobjectid_value` is `null` before any student matching took place. For custom Dataverse Activity types (the survey entities), the "Regarding" field is not always required in the form, so large numbers of valid survey records were silently discarded before reaching `deriveStudentEvents`. Additionally there was no OData pagination support, so entity sets with more than one page of results were truncated.

#### Updated: `src/services/dataverse.ts`
- **`fetchActivity`** — Added `requireStudentLink` flag (default `true`). When `false`, all records are returned and the student-matching logic in App.tsx handles filtering.
- **`fetchActivity`** — Added OData `@odata.nextLink` pagination loop so results are never truncated at the server default page size.
- **`fetchActivity`** — Added diagnostic `console.log` / `console.warn` (visible in browser DevTools) showing total records fetched vs records with a student link; if all records are unlinked it logs the candidate key names so the actual student lookup field is identifiable.
- **Survey fetches** (`fetchInitialSurveys`, `fetchInitialSurveys2026`, `fetchEndOfPilotSurveysLegacy`, `fetchEndOfPilotSurveys2026`, `fetchMidPilotStudentSurveys`) — all now pass `requireStudentLink = false`.

#### Updated: `src/App.tsx`
- **`matchesStudent` helper** — replaces the single `_regardingobjectid_value === sid` equality check with a multi-field matcher that also checks `_cr89a_wlpcstudent_value`, `_cr89a_student_value`, and `cr89a_wlpcstudentid`, and normalises both sides to lowercase to guard against GUID casing differences from Dataverse.

#### Added: `src/services/surveyFields.ts`
- New dedicated service file for all survey field extraction logic.
- Exports `SurveyField` interface (`{ label: string; value: string }`).
- Exports `buildSurveyFields()` core helper (filters null/empty pairs).
- Individual typed builder functions extracted for each survey/event type:
  - `buildSessionFields(s, sessionLength, interventionType)`
  - `buildInitialSurveyLegacyFields(s)`
  - `buildInitialSurvey2026Fields(s)`
  - `buildMidPilotStudentFields(s)`
  - `buildEndOfPilotLegacyFields(s)`
  - `buildEndOfPilotSurvey2026Fields(s)`

#### Updated: `src/services/dataverse.ts`
- Removed `SurveyField` interface and `buildSurveyFields` function (now in `surveyFields.ts`).
- Re-exports `SurveyField` type from `surveyFields.ts` for backward compatibility.
- All inline `buildSurveyFields([...])` blocks replaced with calls to the typed builder functions above.
- File reduced from 811 → 759 lines.

#### Updated: `src/components/TimelineCore.tsx`
- **Modal now displays survey/session fields** when `surveyFields` data is present.
- Replaced old `Session Details` block (showing only duration/type icons) with a unified **"Survey Responses" / "Session Details"** section that iterates all `surveyFields` as labelled rows.
- Falls back to a plain Notes block for events with no structured fields.
- Removed unused `Clock` and `Tag` icon imports.

#### Updated: `src/components/ContextPanel.tsx`
- Updated `SurveyField` import to point to `../services/surveyFields` (direct source).

#### Updated: `src/services/dataverse.ts`
- **Added** — `SurveyField` interface `{ label: string; value: string }` and `surveyFields?: SurveyField[]` property on `TimelineEvent`.
- **Added** — `buildSurveyFields()` helper that filters null/empty values and converts to display-ready pairs.
- **Populated** `surveyFields` on all event types:
  - **Session** — Session Length, Intervention Type, External Support.
  - **Initial Survey (Legacy)** — Thoughts After School, Strengths, Career Activities, Has Part-Time Job, Why Meeting Today, Enjoys at School, Would Change at School.
  - **Initial Survey 2026** — Prepared for Life After School, Understanding Interests & Strengths, Completed Work Experience, Part-Time/Casual Job, Researching Careers Independently, Career Activities, Previously in Career Activity.
  - **Mid-Pilot Student Survey** — Have Sessions Helped, Focus Next 6 Months, Elements Supporting Students, Likely to Use Morrisby Again, Program Impact on Attendance, Suggestions for Improvement.
  - **End-of-Pilot Survey (Legacy)** — Overall Experience Rating, Rating Explanation, Most Enjoyed Activity, What Enjoyed, Not Enjoyed/Unhelpful, Helped Identify Career Interest, Aware of Interests & Strengths, Connection to School Subjects, Exploring Careers Independently, Learned About Jobs & Careers, Understood Future Education Needed.
  - **End-of-Pilot Survey 2026** — Prepared for Life After School, Understanding Interests & Strengths, EMCI Helpfulness Rating, Completed Work Experience, Part-Time/Casual Job, Researching Careers Independently, Career Activities, Previously in Career Activity.

#### Updated: `src/components/ContextPanel.tsx`
- **Redesigned** — Event detail view now shows: Title + date, Status badge (emerald for Completed, orange for Active), Recorded By (with user icon), Survey Responses / Session Details section (labelled field rows from `surveyFields`), Description paragraph (when distinct from notes), Notes/Session Notes (with orange left border).
- **Imported** — `SurveyField` type from `../services/dataverse` and `FileText` icon.
- **Removed** — Generic "Teacher Notes" label; replaced with context-aware "Session Notes" or "Notes" depending on event type.

---

### Network Overview — Student Roster View

#### Updated: `src/components/NetworkOverview.tsx`
- **Added** — Internal `view` state (`'schools'` | `'students'`) — sidebar "Students" nav item now switches to the new Student Roster view; "Schools" / "Dashboard" restore the network view.
- **Added** — Student Roster header: search input (name, ID or counsellor) and a school dropdown (All Schools + each school by name). Selecting a school filters the table instantly.
- **Added** — School info strip above the table when a specific school is selected: shows school name, Morrisby ID, and filtered student count.
- **Added** — Student Roster table with columns: Name (initials avatar, at-risk amber + warning icon), Year, School, Counsellor, Current Stage (colour pill), Progress (bar + %), Status (emerald/blue/slate badge), Actions.
- **Added** — Pagination (10 per page) with Previous/Next and page number buttons.
- **Added** — `onSelectStudent` prop — clicking any student row navigates directly to their journey.

#### Updated: `src/App.tsx`
- **Updated** — `NetworkOverview` now receives `onSelectStudent={handleSelectStudent}` prop.

---

### Context Panel — Copy

#### Updated: `src/components/ContextPanel.tsx`
- **Updated** — Idle-state section label renamed from "CONTEXT DETAILS" to "STUDENT DETAILS".

---

### School Dashboard — Subtitle

#### Updated: `src/components/SchoolDashboard.tsx`
- **Removed** — "Region:" line from the school header subtitle; subtitle now shows only Morrisby ID.

---

### School Dashboard — Full Redesign (Concept Alignment)

#### Updated: `src/components/SchoolDashboard.tsx`
- **Redesigned** — Complete rewrite to match the new concept reference screenshot and HTML.
- **Added** — Self-contained top navigation bar: EMCI Platform logo (Building2 icon + primary orange), nav links (Dashboard, Schools active with underline, Students, Reports), global search input, Bell + Settings icon buttons, user avatar with primary border.
- **Added** — Breadcrumb inside the component (Network › School name) with clickable "Network" link calling `onBack`.
- **Added** — School heading row: 3xl bold school name + status badge (emerald for Active, primary for Onboarding, slate for Inactive); Morrisby ID subtitle; "← Back to Network" button (slate bg, top-right).
- **Redesigned** — KPI cards now show label + icon (top row), large number, and an animated colored bottom bar: Total Students (`bg-primary` full width), Active (`bg-emerald-500` proportional), In Progress (`bg-blue-500` proportional), Completed (`bg-amber-500` proportional).
- **Redesigned** — Student table moved inside a white card. Toolbar includes search, All Stages / Year Level / All Counsellors `<select>` filters, and an orange "+ Enroll" button.
- **Added** — Proper `<table>` element with columns: Name, Year, Counsellor, Current Stage, Progress, Status (center), Actions (right).
- **Added** — Avatar initials in cells: amber background for at-risk students, slate for normal. At-risk rows show an `AlertTriangle` icon and red "At Risk" subtitle.
- **Added** — Stage pills with distinct colors: `career_guidance` = orange primary, `complete` = emerald green, `referral`/`consent` = slate neutral.
- **Added** — Progress column: colored bar (`bg-primary` default, `bg-red-400` for at-risk, `bg-emerald-500` for complete) + percentage label.
- **Added** — Status badges: Active = emerald, Pending = blue, Inactive/other = slate.
- **Added** — Pagination: 10 rows per page with "Showing X to Y of Z students" message, Previous/Next buttons, and page number buttons (current page highlighted in primary orange).
- **Added** — `onBack: () => void` prop added to `SchoolDashboardProps`.

#### Updated: `src/App.tsx`
- **Removed** — External breadcrumb wrapper div for the school page (now handled inside `SchoolDashboard`).
- **Updated** — `SchoolDashboard` now receives `onBack={() => goTo('network')}` prop.

---

### Network Overview — Full Redesign (Concept Alignment)

#### Updated: `src/components/NetworkOverview.tsx`
- **Redesigned** — Complete rewrite to match the new concept reference layout.
- **Added** — Left sidebar navigation (`w-64`) with: EMCI logo (orange rounded square + Network icon), nav items (Dashboard active, Schools, Students, Counsellors, Settings), Dataverse Lab as a subtle secondary item, and user profile footer.
- **Added** — "Counsellors" nav item wired to `onGoToCounsellors()`; "Dataverse Lab" wired to `onGoToDevLab()`.
- **Updated** — Top header now shows "Network Overview" title, inline search bar (`bg-slate-100` pill), dynamic region filter pills (derived from real school data), and a notification bell with orange dot.
- **Redesigned** — KPI section changed from 5 icon cards to a single white card with 6 columns divided by vertical lines (Total Schools, Total Students, Active Students, In Progress, Completed %, Counsellors). Completed % value renders in `text-primary` orange.
- **Redesigned** — Schools list changed from a 3-column card grid to a full-width table with columns: School Name, Morrisby ID, Region, Status, Program Completion (orange bar + %), Total Students.
- **Updated** — Status display: dot indicator + text (`bg-emerald-500` green for Active, `bg-primary` orange for Onboarding, `bg-slate-400` for Inactive).
- **Updated** — Region shown as a grey rounded pill badge.
- **Updated** — Completion bar always uses `bg-primary` orange (no colour-shifting logic).
- **Added** — Table footer with "Showing X of Y schools" count and prev/next pagination (10 schools per page).
- **Removed** — Old `STATUS_COLORS`, `colorMap`, `schoolStats` card layout, and standalone Counsellor View / Dataverse Lab header buttons.

---

## [Unreleased] — 2026-03-20

### Global Colour Scheme — Orange Theme Applied Across All Views

Removed all remaining blue and violet/purple accent colours from every page in the app. The colour system is now consistent everywhere:

- **Orange** (`primary`) — brand, interactive, progress, referral/session stages
- **Green** (`emerald`) — positive outcomes, consent/complete stages, active status
- **Slate** — neutral, inactive
- **Red / Amber** — risk and warnings (unchanged)

#### Updated: `src/components/NetworkOverview.tsx`
- EMCI logo/shield: `text-blue-600` → `text-primary`
- "Counsellor View" button: `bg-violet-600` → `bg-primary`; FlaskConical icon: `text-violet-300` → `text-slate-300`
- KPI card icon map: removed `blue` and `violet` entries → both now use `bg-primary/10 text-primary`
- School card hover border: `hover:border-blue-300` → `hover:border-primary/40`
- School name hover: `group-hover:text-blue-600` → `group-hover:text-primary`
- Progress bar mid-range fill: `bg-blue-500` → `bg-primary`
- "View students" ghost link: `text-blue-600` → `text-primary`
- Search focus ring: `focus:ring-blue-500/30` → `focus:ring-primary/30`

#### Updated: `src/components/SchoolDashboard.tsx`
- EMCI logo/shield: `text-blue-600` → `text-primary`
- `STAGE_COLORS`: referral/career_guidance now use `bg-primary/10 text-primary border-primary/20`; consent/complete stay emerald
- `StageProgressBar` segment colours: blue → primary, violet → emerald, amber → primary/70
- Stat cards: Total Students and In Progress changed from blue/violet to `text-primary bg-primary/10`; Completed changed from amber to emerald
- All `focus:ring-blue-500/30` → `focus:ring-primary/30`; `focus:border-blue-400` → `focus:border-primary/40`
- "View Journey" action link: `text-blue-600` → `text-primary`

#### Updated: `src/components/CounsellorView.tsx`
- `STAGE_COLORS`: full rewrite matching SchoolDashboard; added `bar` property for stage breakdown bars (replaces brittle `.replace('-50','-400')` hack)
- Back button hover and shield icon: blue → primary
- Counsellor sidebar active state: `bg-blue-50 border-blue-200` → `bg-primary/10 border-primary/20`
- Counsellor avatar icons (sidebar + profile card): blue → primary
- Active counsellor name text: `text-blue-700` → `text-primary`
- School badge tags: `bg-blue-50 text-blue-700 border-blue-200` → `bg-primary/10 text-primary border-primary/20`
- KPI chips: Total Students (blue → primary); In Progress (violet → primary); Completed (amber → emerald)
- Completion bar gradient: `from-blue-500` → `from-primary`
- Stage breakdown section icon: `text-violet-500` → `text-primary`

#### Updated: `src/App.tsx`
- Loading spinner: `text-blue-500` → `text-primary`
- School page breadcrumb back button hover: `hover:text-blue-600` → `hover:text-primary`

---

## [Unreleased] — 2026-03-20

### Student Journey — Colour Palette Consolidation

Removed all blue and violet/purple accent colours from the student journey page to create a clean, consistent two-accent system on top of the orange brand colour.

**New palette rules:**
- **Orange** (`primary`) — referral events, session events, active states, brand interactions
- **Green** (`emerald`) — consent events, survey events, completed/submitted status badges (positive milestones)
- **Slate** — all neutral/inactive states
- **Red/Amber** — risk and warning states (unchanged)

#### Updated: `src/components/TimelineCore.tsx`
- **Replaced** — `typeBadgeColor` map: `referral` blue → `bg-primary/10 text-primary border-primary/20`; `consent` violet → `bg-emerald-50 text-emerald-700 border-emerald-200`; `session` amber → `bg-primary/10 text-primary border-primary/20`; `survey` stays emerald.
- **Added** — `typeIconBg` map: card icon boxes now use type-based background colours (orange for referral/session, green for consent/survey) instead of a first/rest positional rule.
- **Fixed** — Stage-1 expansion "Referral" pill: `bg-blue-100 text-blue-700` → `bg-primary/10 text-primary`.
- **Fixed** — Stage-1 expansion "Consent" section: icon, title, and pill all changed from violet → emerald green.
- **Removed** — `typeIconColor` map and `CheckCircle2` import (no longer needed).

---

## [Unreleased] — 2026-03-20

### Student Journey Page — UI Cleanup & Orange Theme Alignment

#### Updated: `src/App.tsx`
- **Removed** — `<Header>` component from the student journey page; the top bar now only shows the breadcrumb and Export button, eliminating the duplicate "EMCI Students / Student Name / Active / Assigned Counsellor" strip.
- **Fixed** — Breadcrumb hover colours changed from `hover:text-blue-600` to `hover:text-primary` (orange).
- **Fixed** — "Export to PDF" button colour changed from `bg-blue-600` to `bg-primary`.

#### Updated: `src/components/TimelineCore.tsx`
- **Updated** — "Student Journey" heading is now centred (`text-center w-full`) within the stage tracker header bar.

#### Updated: `src/components/ProfileSnapshot.tsx`
- **Removed** — Stats footer (Progress X/4 and Year) from the bottom of the left panel.

#### Updated: `src/components/ContextPanel.tsx`
- **Removed** — "Risk Level" row from the Context Details section.

---

## [Unreleased] — 2026-03-20

### Student Journey Page — UI/UX Redesign (Concept Alignment)

#### Updated: `src/index.css`
- **Added** — `--color-primary: #ec5b13` (burnt orange) and `--color-primary-light: #f8f6f6` to the `@theme` block, making `bg-primary`, `text-primary`, `border-primary`, and opacity variants (`bg-primary/10`, etc.) available as Tailwind utilities throughout the app.

#### Updated: `src/components/ProfileSnapshot.tsx`
- **Redesigned** — Full redesign of the left panel to match the concept reference.
- **Added** — Centred avatar with rounded-2xl styling, `border-4 border-white shadow-sm`, and initials fallback when no avatar URL is present.
- **Added** — Risk-level badge anchored below the avatar (At Risk / Monitor / On Track) with colour-coded styling (red/amber/green).
- **Added** — Student name in bold with "Preferred: [name] | Year [X]" subtitle.
- **Added** — Info card (rounded-xl bg-slate-50) displaying Morrisby ID, Counsellor (truncated), and Status using the orange `text-primary` colour.
- **Added** — Navigation button group: "Student Profile" (active, orange bg), "Test Results", and "Documents" using Lucide icons.
- **Updated** — Stats footer now shows Stage Progress (X/4) and Year level instead of last-activity timestamp.

#### Updated: `src/components/TimelineCore.tsx`
- **Redesigned** — Stage tracker replaced from pill-shaped interactive buttons to horizontal circular nodes with connector lines, matching the concept.
- **Completed stages** — Filled orange circle (`bg-primary`) with a `Check` icon and an orange connector line to the next stage.
- **Active stage** — Filled orange circle with the stage's icon; grey connector line onwards.
- **Future stages** — White circle with grey border and ring.
- **Connector lines** — Use `absolute top-5 left-1/2 w-full h-[2px]` positioning so lines connect from the centre of one node to the centre of the next, sitting behind the circles via `z-10`.
- **Stage click expansion** — Preserved; clicking a stage node still expands the detail panel below the tracker using `AnimatePresence`.
- **Redesigned** — Timeline activity feed uses the concept's border-l-2 vertical-line layout: each item has `relative pl-8 border-l-2 border-slate-200` with an `absolute -left-[11px]` dot indicator.
- **Updated** — Most-recent event (first after reverse) gets an orange dot (`border-primary`) and full-opacity card styling; older events use a grey dot and `opacity-85`.
- **Updated** — Activity cards show icon box (`size-8 rounded-lg bg-primary/10 text-primary` for first item, grey for others), title with hover colour transition, "By" subtitle, date (right-aligned), and type/status tags.
- **Updated** — Section header changed to "Student Journey Timeline" with "+ Add Milestone" button using orange text.
- **Updated** — Empty state shown when no events exist.
- **Updated** — Modal "Open in Context Panel" button uses `bg-primary` instead of blue.

#### Updated: `src/components/ContextPanel.tsx`
- **Redesigned** — Default (idle) state now renders "Information Context" as section header with a `MoreVertical` kebab button.
- **Added** — "Student Overview" subsection: auto-generated descriptive paragraph built from the student's year level, risk level, current stage, and interview status.
- **Added** — "Context Details" subsection: bordered rows (`p-3 rounded-lg border border-slate-100`) for Student Type, Year Level, Student Interviewed, Has Profile, and Risk Level.
- **Updated** — Boolean fields now use coloured dot indicators (`size-2 rounded-full bg-green-500 / bg-slate-300`) matching the concept instead of icon-based display.
- **Updated** — Event details view uses `border-l-2 border-primary/30` on teacher notes for a branded accent.

#### Updated: `src/components/Header.tsx`
- **Updated** — Active status badge uses `bg-primary/10 border-primary/20 text-primary` instead of blue/emerald.
- **Updated** — Counsellor avatar border updated to `border-primary/20`.
- **Updated** — Header height reduced to `h-14` for a more compact look.

#### Updated: `src/App.tsx`
- **Updated** — Student journey page panel widths changed from percentage-based (`18%/64%/18%`) to fixed-width (`w-72` left, `w-[380px]` right, `flex-1` centre) for proportions closer to the concept reference.

---

## [Unreleased] — 2026-03-19

### Documentation — Dataverse Connection Reference

#### New: `DATAVERSE_CONNECTION_REFERENCE.md`
- **Added** — Comprehensive data connection map documenting every Dataverse entity, entity set name, field, type, annotation, and how each maps to app properties.
- **Included** — Connection details (API base URL, auth method, required headers), full entity overview table (11 entities), and per-entity field tables.
- **Included** — Year level code map, status decode table, stage derivation logic, risk level derivation rules, OData annotation pattern explanation.
- **Included** — Full relationship map showing how all entities link to students and schools.
- **Included** — App `Student` interface → Dataverse source field quick-reference table with fallback values.
- **Purpose** — Serves as a standalone guide for re-implementing or porting the Dataverse integration to another application without needing to read the source code.

---

### Survey Types Refactor — New `surveyTypes.ts` + Full Schema Alignment

#### New: `src/services/surveyTypes.ts`
- **Added** — New dedicated file for all Dataverse survey entity interfaces. Removes the survey type clutter from `dataverse.ts` and provides a single documented reference for all 6 survey entities.
- **Added** — `RawMidPilotStudentSurvey` — replaces the former `RawMidPilotSurvey2026`/`RawSchoolSurvey` confusion. Correctly typed against `cr89a_emcimidpilotschoolinitialsurveies` (student-level mid-pilot survey) with all EMCI-specific fields: `cr89a_havethesessionshelped`, `cr89a_focusoverthenext6months`, `cr89a_likelytousemorrisbyprofileagain`, `cr89a_programimpactonstudentattendanceengagement`, `cr89a_elementsofemcisupportingstudents`, `cr89a_suggestionstohelpimproveourprogramin2025`.
- **Added** — `RawMidPilotSchoolSurvey` — new school-level mid-pilot survey interface correctly mapped to `cr89a_midpilotschoolsurveies` (was previously missing entirely or conflated with student surveys).
- **Fixed** — `RawEndOfPilotSurveyLegacy` expanded with all fields from actual schema: `cr89a_activityorsessionenjoyedthemost`, `cr89a_anythingyoudidnotenjoyorfoundunhelpful`, `cr89a_awareaboutowninterestsandstrengths`, `cr89a_connectiontoschoolsubjectbyexploringcareers`, `cr89a_learnabouttypesofjobandcareers`, `cr89a_understandfutureeducationneededforcareers` and their `FormattedValue` annotations.
- **Fixed** — `RawEndOfPilotSurvey2026` expanded with `cr89a_parttimeorcasualjobvolunteering`, `cr89a_researchingcoursesandcareersonyourown`, `cr89a_participatedincareeractivitybeforetoday`, and all `name` annotation fields.

#### `src/services/dataverse.ts`
- **Changed** — `RawActivity` is now exported so `surveyTypes.ts` can extend it without duplication.
- **Removed** — All inline survey interfaces removed; replaced with re-exports from `surveyTypes.ts`.
- **Fixed** — `fetchMidPilotStudentSurveys` (renamed from `fetchMidPilotSurveys2026`) now correctly uses entity set `cr89a_emcimidpilotschoolinitialsurveies`.
- **Added** — `fetchMidPilotSchoolSurveys` fetches the school-level survey from the correct entity set `cr89a_midpilotschoolsurveies`.
- **Fixed** — `deriveStudentEvents` mid-pilot section renamed parameter to `midStudentSurveys` and uses correct typed fields (`cr89a_focusoverthenext6months`, `cr89a_havethesessionshelped`, `cr89a_suggestionstohelpimproveourprogramin2025`) for description and notes.
- **Fixed** — End-of-pilot legacy and 2026 survey builders are now separate typed loops (same pattern as initial surveys), with each using the correct fields for description/notes. Legacy notes now additionally fall back to `cr89a_activityorsessionwhatdidyouenjoyaboutit`.

#### `src/App.tsx`
- **Changed** — Updated to use `fetchMidPilotStudentSurveys` and `RawMidPilotStudentSurvey` throughout. Variable renamed from `midSurveys2026` to `midStudentSurveys` for clarity.

---

### Initial Survey Schema & Field Mapping Fix

#### `src/services/dataverse.ts`
- **Fixed** — `RawInitialSurvey` (legacy, `cr89a_emcistudentinitialsurveies`) interface updated to include all actual Dataverse fields: `cr89a_thoughtsaboutwhatyoumightdoafterschool`, `cr89a_careeractivitiesthestudenthasparticipated`, `cr89a_whatdoyouthinkyouarequitegoodat`, `cr89a_haveyouhadhaveaparttimecasualjob`, `cr89a_doyouknowwhywearecatchinguptoday`, `cr89a_whatdoyouenjoyaboutcomingtoschool`, `cr89a_ifyoucouldchangesomethingaboutschool`, and their associated `name` / `other` variants.
- **Fixed** — `RawInitialSurvey2026` (`cr89a_emcistudentinitialsurvey2026s`) interface updated to include all actual 2026 fields with full `FormattedValue` annotations: `cr89a_parttimeorcasualjobvolunteering`, `cr89a_researchingcoursesandcareersonyourown`, `cr89a_careeractivitiesdetailsmultiselectname`, and `cr89a_participatedincareeractivitybeforetoday`.
- **Fixed** — `deriveStudentEvents` initial survey section split into two separate typed loops (legacy and 2026) instead of merging all records into a single untyped loop. Each loop now uses the correct fields for description and notes:
  - Legacy: description uses `cr89a_thoughtsaboutwhatyoumightdoafterschoolname` (formatted picklist label), falling back to `cr89a_whatdoyouthinkyouarequitegoodat` (free text). Notes use `cr89a_careeractivitiesthestudenthasparticipated`. Title defaults to `'EMCI Initial Survey (Legacy)'`.
  - 2026: description uses `cr89a_feelingpreparedforlifeafterschool@...FormattedValue`. Notes use `cr89a_careeractivitiesdetailsmultiselectname`. Title defaults to `'EMCI Initial Survey 2026'`.
- **Confirmed** — No extra date-based filtering is required for the "legacy only for pre-2026 students" requirement. The existing `_regardingobjectid_value === sid` filter in `App.tsx` means a legacy survey event only appears on a student's timeline if Dataverse has a record for them in that entity set.

---

### Student Table — Generic User Icon

#### `src/components/SchoolDashboard.tsx`
- **Changed** — Student avatar `<img>` replaced with a generic `User` icon in a neutral slate circle. Removes the placeholder `picsum.photos` images; no real student photo data is available from Dataverse.

---

#### `src/services/dataverse.ts`
- **Fixed** — Counsellor name is now read directly from `_ownerid_value@OData.Community.Display.V1.FormattedValue` on the student record itself, rather than defaulting to an empty string. The student record `ownerid` is the assigned counsellor in Dataverse.
- **Added** — `_ownerid_value` and its `FormattedValue` annotation added to `RawStudent` interface and `STUDENT_SELECT` query so the field is fetched from the API.
- **Changed** — `enrichStudents` session-owner override is retained as a secondary source: if sessions exist, the most recent session's owner name still takes precedence (handles reassignment scenarios). The student-level owner is now the correct fallback instead of blank.

---

#### `src/services/dataverse.ts`
- **Fixed** — `decodeYearLevel` now uses an explicit lookup table (`YEAR_LEVEL_CODE_MAP`) keyed on the actual production option codes. The previous `val - 1000` offset assumed codes started at `1001` but real data starts at `1000` (Year 9 = `1000`, Year 10 = `1001`).
- **Fixed** — Removed the broken `parseInt(formattedValue.replace(/\D/g, ''))` approach. The `FormattedValue` label is a cohort name in many cases (e.g. `"EMCI 2024 Students (Y9)"`) — stripping non-digits would yield `2024`, not `9`. The raw code is always the correct source for the numeric year.
- **Added** — `yearLevelLabel` is now captured from the `FormattedValue` annotation and stored separately on the mapped student, preserving the original Dataverse label (e.g. `"EMCI 2024 Students (Y9)"`) for display or filtering purposes without corrupting the numeric `yearLevel`.
- **Added** — Documented known production code-to-year mappings in `YEAR_LEVEL_CODE_MAP` with a broad `val - 1000` best-effort fallback for any unmapped codes.

#### `src/data/studentsData.ts`
- **Added** — `yearLevelLabel?: string` field to the `Student` interface to hold the raw Dataverse picklist label.

---

#### `src/services/dataverse.ts`
- **Fixed** — `cr89a_yearlevel` (Picklist) mapper now consistently reads the OData `FormattedValue` annotation as the primary source (e.g. `"Year 9"` → strips non-digits → `9`), falling back to the raw numeric option code only when the annotation is absent.
- **Cleaned** — `decodeYearLevel` fallback removed the redundant `val >= 9 && val <= 12` branch — plain integers pass through unchanged by default. Retained only the offset-code branch (`1001–1012` → subtract 1000). Added explanatory comment documenting the two-layer resolution strategy.
- **Fixed** — `studentType` mapper reads `new_studenttypemultiselect@OData.Community.Display.V1.FormattedValue` (formatted picklist label) as the primary source, falling back to the raw field string, then `'Standard'`. `cr89a_studenttype` removed from the mapper and `$select` query list entirely.

---

#### `src/components/TimelineCore.tsx`
- **Fixed** — Clarified the 3-pill / 4-stage-key mapping: `referral` (progress 1) and `consent` (progress 2) both live in Stage 1 "Referral & Consent"; `career_guidance` (progress 3) is Stage 2; `complete` (progress 4) is Stage 3.
- **Fixed** — Stage 1 pill now correctly shows as "active" when referral is done but consent is pending, and "completed" only when both referral and consent are obtained (`stageProgress >= 2`).
- **Fixed** — Stage 1 icon logic corrected: shows `CheckCircle2` when fully completed, the stage icon when active, and an empty circle when not yet started (previously `active` and `completed` icon logic was inverted for stages 2 and 3).
- **Added** — Stage 1 pill now displays inline Referral / Consent sub-step indicators (small dot icons with "Ref" and "Con" labels) when a referral has been obtained, showing whether consent is also complete.
- **Fixed** — Stage 1 expansion panel now shows both the referral and consent sub-events as separate rows, including their individual dates and notes. Previously only the referral event was shown.
- **Added** — Stage 1 expansion panel shows a "Consent not yet recorded" notice when referral is done but no consent event exists.
- **Fixed** — Modal "Last Modified" date now uses `dd MMM yyyy` format, consistent with all other date displays in the application. Previously used the US-format `M/d/yyyy h:mm aa`.

#### `src/components/SchoolDashboard.tsx`
- **Fixed** — `StageProgressBar` documented with clear comment mapping its 4 segments to `stageProgress` values 1–4 (Referral → Consent → Career Guidance → Complete), confirming the `i < progress` fill logic is correct.

---

#### New: `ROLES_AND_ACCESS.md`
- **Added** — Comprehensive roles and access levels document covering all platform user types.
- **Added** — Seven defined roles across three tiers: Operational (EMCI Counsellor, School Counsellor / Guidance Officer), Administrative (School Administrator / Principal, EMCI Program Manager, System Administrator / Developer), and Oversight (Department of Education User, EMCI Executive).
- **Added** — Per-role breakdown of what each user can and cannot do, scoped data access tables, and a full access matrix summary across all platform views and features.
- **Added** — Azure AD role assignment guidance with suggested AAD security group names for each role.
- **Added** — Data privacy and compliance section noting obligations under the Australian Privacy Act 1988 and state education data governance frameworks.

---

## [Unreleased] — 2026-03-19

### Live Dataverse Integration

#### New: `src/services/dataverse.ts`
- **Added** — New data service as the single source of truth for all Dataverse API communication.
- **Added** — `fetchStudents(token)` — fetches all students from `cr89a_wlpcstudents` via the `/dataverse` Vite proxy using a `$select` of all key fields; maps raw Dataverse field names to the app's `Student` interface.
- **Added** — `fetchSchools(token)` — fetches all schools from `cr89a_wlpcschools`; removed strict `$select` to avoid 400 errors from unknown field names; mapper dynamically resolves the school name from any matching field pattern (`cr89a_name`, `cr89a_schoolname`, `cr89a_wlpcschoolname`, or any field ending in `name`).
- **Added** — `deriveStudentEvents(student)` — synthesises timeline events from student boolean stage flags (`cr89a_referralobtained`, `cr89a_consentobtained`, `cr89a_guidanceinprogress`, `cr89a_guidancecomplete`) instead of static mock data.
- **Added** — Field decoders: year level option-set decoder (`1009 → 9`), status decoder (`statecode 0 → Active`), and stage progression derivation (`most advanced flag wins`).

#### `src/App.tsx` — Token management & data bootstrapping
- **Changed** — Token fetch and auto-refresh logic lifted out of `DataverseLab` and into `App.tsx` as the global auth owner.
- **Added** — On mount: fetches Bearer token from `/devtoken` Vite middleware, then immediately loads students and schools in parallel via `Promise.all`.
- **Added** — Auto-refresh timer: token is refreshed 5 minutes before expiry; timer is cleared on unmount.
- **Added** — Full-screen loading spinner shown while token is initialising or data is first loading.
- **Added** — Inline error banner with Retry button shown on all pages if the data fetch fails.
- **Changed** — All page branches now pass `students`, `schools`, `school`, and `student` as props to every component — no component reads from mock data files directly.

#### `src/components/Header.tsx`
- **Changed** — Accepts `student: Student | null` prop; renders live student full name and assigned counsellor name.
- **Added** — Status badge colour changes dynamically with `student.status` (Active / Inactive / Pending).

#### `src/components/ProfileSnapshot.tsx`
- **Changed** — Accepts `student: Student | null` and `schoolName?: string` props.
- **Changed** — All fields now populated from live data: first name, last name, preferred name, email, school name, Morrisby ID, status dot, and last-updated timestamp.

#### `src/components/ContextPanel.tsx`
- **Changed** — Accepts `student: Student | null` prop.
- **Changed** — Default (no-event) view renders live `student.studentType`, `student.interviewed`, `student.yearLevel`, and `student.hasProfile` instead of hardcoded values.
- **Changed** — Boolean fields now show a green tick or grey cross icon based on actual value.

#### `src/components/TimelineCore.tsx`
- **Changed** — Accepts `student: Student | null` prop; removed static `import { timelineData }`.
- **Changed** — Activity feed and stage tracker now built from `deriveStudentEvents(student)` — events shown reflect the student's actual stage progression.

#### `src/components/SchoolDashboard.tsx`
- **Changed** — Accepts `students: Student[]` and `school: School | null` props; removed `import { schoolStudents }`.
- **Changed** — Filters students internally by matching `student.schoolId === school.id`.
- **Changed** — School name in top navigation header comes from the `school` prop, not a hardcoded string.

#### `src/components/NetworkOverview.tsx`
- **Changed** — Accepts `students: Student[]` and `schools: School[]` props; removed `import { schools, networkStudents, counsellors }`.
- **Changed** — All KPI cards (Total Students, Active Students, In Progress, Total Schools, Counsellors) and school-card stats now computed from live data.
- **Changed** — Counsellor count derived dynamically from unique `student.counsellor` values across all students.

#### `src/components/CounsellorView.tsx`
- **Changed** — Accepts `students: Student[]` and `schools: School[]` props; removed `import { counsellors, networkStudents, schools }`.
- **Changed** — Counsellor list derived from unique `student.counsellor` values; no longer depends on a static `Counsellor[]` array.
- **Changed** — Student roster, stage breakdown, and KPI chips all computed from live student data.
- **Changed** — Avatar images replaced with icon placeholder (no avatar data available from Dataverse).

#### `src/data/studentsData.ts`
- **Changed** — Added optional `schoolId?: string` field to the `Student` interface to support school-student relationships from Dataverse (`_cr89a_wlpcschool_value`).

---

## [Unreleased] — 2026-03-18

### Network Overview (`NetworkOverview.tsx`)
- **Fixed** — KPI card label corrected from "Active Students / X% of total" to **"In Progress / Across all stages"**, with a dedicated counter for students actively working through a stage.
- **Added** — Region filter dropdown in the schools search bar, dynamically populated from the unique regions present in `networkData.ts`. Filters combine with the existing Status filter and search box.
- **Removed** — "Network Program Completion" progress-bar card that previously appeared between the KPI row and the filters. Its data is now surfaced per-school via the individual school card bars.
- **Removed** — Avatar image from school cards. Cards now show school name, region/Morrisby ID, status badge, completion bar, student stats, and footer without a logo image.

### School Dashboard (`SchoolDashboard.tsx`)
- **Removed** — "Not Started" option from the Stage filter dropdown. Students with no stage assigned are no longer a filter target.
- **Added** — Year Level filter dropdown, dynamically populated from distinct year levels in `studentsData.ts`. Combines with Stage, Counsellor, and name/ID search filters.

### Student Journey — Timeline (`TimelineCore.tsx`)
- **Changed** — Stage tracker reduced from 4 steps to 3 steps by merging **Referral** and **Consent** into a single **"Referral & Consent"** stage (Stage 1). Career Guidance becomes Stage 2; Complete becomes Stage 3.
- **Added** — Click-to-open event modal replacing the previous "View more" accordion and action-icon buttons on activity cards.
  - Cards are now fully clickable (hover reveals "View →" affordance).
  - Modal slides in from the right as an overlay panel.
  - Modal displays: title, date, status & type badges, recorded-by counsellor, full description, session details (duration, intervention type), notes, created and last-modified dates.
  - "Open in Context Panel" button in the modal footer passes the event to the right-hand `ContextPanel`.
  - Backdrop click closes the modal.

---

## [0.6.0] — 2026-03-18

### Dataverse Developer Lab (`DataverseLab.tsx`)
- **Added** — `src/components/DataverseLab.tsx` — full-featured developer testing page accessible from the Network Overview header.
  - Connection configuration panel: base URL and bearer token fields with show/hide toggle.
  - JWT expiry decoder: displays token validity state (green = valid, red = expired) with time-remaining label.
  - Quick entity shortcuts for WLPC Students, Schools, Accounts, Contacts, System Users, and Entity Definitions.
  - Request builder: method selector (`GET / POST / PATCH / DELETE`), endpoint, `$select`, `$filter`, `$top`, `$orderby`, `$expand`, raw body JSON.
  - Live generated URL preview.
  - Response panel with status code, duration, response size, and tabs for Pretty JSON (syntax highlighted), Raw text, Headers, and Table view.
  - Request history drawer.
- **Added** — Auto-refresh of Bearer token via server-side Vite middleware (`/devtoken`); token is refreshed 5 minutes before expiry.
- **Fixed** — `AADSTS9002326` cross-origin token redemption error resolved by moving the OAuth2 client-credentials token request to a Node.js `configureServer` middleware in `vite.config.ts`. The browser never touches the Azure AD token endpoint directly.

### Vite Configuration (`vite.config.ts`)
- **Added** — `/dataverse` proxy rule forwarding to `https://mcicrm.crm6.dynamics.com` with `Authorization` header pass-through — bypasses browser CORS for all Dataverse API calls.
- **Added** — Custom `configureServer` plugin middleware that handles `POST /devtoken` by performing the OAuth2 client-credentials token exchange server-side using Node.js `fetch`, returning the `access_token` to the browser.

### Documentation
- **Added** — `CHANGELOG.md` — this file; records all changes from initial commit onward.
- **Updated** — `README.md` — fully rewritten to describe EMCI's purpose, program stages, navigation structure, tech stack, project layout, data interfaces, and local setup instructions.

---

## [0.5.0] — 2026-03-17

### Multi-school Network & Counsellor Views
- **Added** — `src/data/networkData.ts` — defines `School`, `Counsellor`, and `NetworkStudent` interfaces with 6 schools, 4 counsellors, and 25 mock students across the network.
- **Added** — `src/components/NetworkOverview.tsx` — top-level page showing all schools, global KPI cards, network completion bar, school cards with per-school completion stats.
- **Added** — `src/components/CounsellorView.tsx` — counsellor analytics page with a sidebar to switch between counsellors, KPI chips, completion rate bar, students-by-stage bar chart, and a full student roster table.
- **Changed** — `src/App.tsx` — upgraded to a 5-level in-memory navigation system (`network | school | student | pdf | counsellors`) with breadcrumbs and `NetworkOverview` as the default landing page.

---

## [0.4.0] — 2026-03-14

### PDF Preview & Work Readiness
- **Added** — `src/components/PdfPreview.tsx` — A4-style print preview with report header, summary KPIs, stage timeline, academic/attendance charts, activity log, counsellor insights, and a Work Readiness section (industry immersion checklist, career interest tags, industry exposure progress bar).
- **Fixed** — PDF page was unscrollable due to a global `body { overflow: hidden }` in `index.css`. A `useEffect` in `PdfPreview` now temporarily sets `document.body.style.overflow = 'auto'` and restores it on unmount.

---

## [0.3.0] — 2026-03-12

### School Dashboard
- **Added** — `src/data/studentsData.ts` — `Student` interface and 8 mock students for Ashwood School (Year 9 and 10 only).
- **Added** — `src/components/SchoolDashboard.tsx` — student management page with top nav, stat cards (Total / Active / In Progress / Completed), search, stage/counsellor filters, and a student table with stage progress bars.
- **Removed** — Risk column, `RISK_COLORS` constant, and "1 student flagged as high risk" banner from `SchoolDashboard`.

---

## [0.2.0] — 2026-03-10

### Timeline & Activity Cards
- **Changed** — `src/components/TimelineCore.tsx` — replaced D3-based attendance/academic graph with a 4-stage progress tracker and an activity feed (Dynamics 365-style cards showing document icon, title, Active badge, By line, description, modified date, expandable View more section).
- **Changed** — `src/data/timelineData.ts` — enriched event records with `modifiedDate`, `status`, `by`, `description`, `sessionLength`, `interventionType` fields and updated `type` values to `referral | consent | session | survey`.
- **Changed** — Year level standardised to **Year 9 and Year 10 only** across all components and mock data.

---

## [0.1.0] — 2026-03-07

### Initial Student Journey View
- **Added** — `src/components/ProfileSnapshot.tsx` — left-hand student profile panel (Student Name, First/Last Name, Preferred Name, Email, year level, school, counsellor assignment).
- **Added** — `src/components/Header.tsx` — top navigation bar with EMCI branding, student name, and "Assigned to EMCI Counsellor" label.
- **Added** — `src/components/ContextPanel.tsx` — right-hand detail panel with event details, Student Type field, and "Student Has Profile" indicator.
- **Changed** — Removed duplicate student name subtitle under main `h1` in `ProfileSnapshot`.
- **Changed** — Removed redundant School/Year fields from `Header` (already shown in `ContextPanel`).
- **Changed** — Typography increased across all components for improved readability.


### Network Overview (`NetworkOverview.tsx`)
- **Fixed** — KPI card label corrected from "Active Students / X% of total" to **"In Progress / Across all stages"**, with a dedicated counter for students actively working through a stage.
- **Added** — Region filter dropdown in the schools search bar, dynamically populated from the unique regions present in `networkData.ts`. Filters combine with the existing Status filter and search box.
- **Removed** — "Network Program Completion" progress-bar card that previously appeared between the KPI row and the filters. Its data is now surfaced per-school via the individual school card bars.
- **Removed** — Avatar image from school cards. Cards now show school name, region/Morrisby ID, status badge, completion bar, student stats, and footer without a logo image.

### School Dashboard (`SchoolDashboard.tsx`)
- **Removed** — "Not Started" option from the Stage filter dropdown. Students with no stage assigned are no longer a filter target.
- **Added** — Year Level filter dropdown, dynamically populated from distinct year levels in `studentsData.ts`. Combines with Stage, Counsellor, and name/ID search filters.

### Student Journey — Timeline (`TimelineCore.tsx`)
- **Changed** — Stage tracker reduced from 4 steps to 3 steps by merging **Referral** and **Consent** into a single **"Referral & Consent"** stage (Stage 1). Career Guidance becomes Stage 2; Complete becomes Stage 3.
- **Added** — Click-to-open event modal replacing the previous "View more" accordion and action-icon buttons on activity cards.
  - Cards are now fully clickable (hover reveals "View →" affordance).
  - Modal slides in from the right as an overlay panel.
  - Modal displays: title, date, status & type badges, recorded-by counsellor, full description, session details (duration, intervention type), notes, created and last-modified dates.
  - "Open in Context Panel" button in the modal footer passes the event to the right-hand `ContextPanel`.
  - Backdrop click closes the modal.

---

## [0.5.0] — 2026-03-17

### Multi-school Network & Counsellor Views
- **Added** — `src/data/networkData.ts` — defines `School`, `Counsellor`, and `NetworkStudent` interfaces with 6 schools, 4 counsellors, and 25 mock students across the network.
- **Added** — `src/components/NetworkOverview.tsx` — top-level page showing all schools, global KPI cards, network completion bar, school cards with per-school completion stats.
- **Added** — `src/components/CounsellorView.tsx` — counsellor analytics page with a sidebar to switch between counsellors, KPI chips, completion rate bar, students-by-stage bar chart, and a full student roster table.
- **Changed** — `src/App.tsx` — upgraded to a 5-level in-memory navigation system (`network | school | student | pdf | counsellors`) with breadcrumbs and `NetworkOverview` as the default landing page.

---

## [0.4.0] — 2026-03-14

### PDF Preview & Work Readiness
- **Added** — `src/components/PdfPreview.tsx` — A4-style print preview with report header, summary KPIs, stage timeline, academic/attendance charts, activity log, counsellor insights, and a Work Readiness section (industry immersion checklist, career interest tags, industry exposure progress bar).
- **Fixed** — PDF page was unscrollable due to a global `body { overflow: hidden }` in `index.css`. A `useEffect` in `PdfPreview` now temporarily sets `document.body.style.overflow = 'auto'` and restores it on unmount.

---

## [0.3.0] — 2026-03-12

### School Dashboard
- **Added** — `src/data/studentsData.ts` — `Student` interface and 8 mock students for Ashwood School (Year 9 and 10 only).
- **Added** — `src/components/SchoolDashboard.tsx` — student management page with top nav, stat cards (Total / Active / In Progress / Completed), search, stage/counsellor filters, and a student table with stage progress bars.
- **Removed** — Risk column, `RISK_COLORS` constant, and "1 student flagged as high risk" banner from `SchoolDashboard`.

---

## [0.2.0] — 2026-03-10

### Timeline & Activity Cards
- **Changed** — `src/components/TimelineCore.tsx` — replaced D3-based attendance/academic graph with a 4-stage progress tracker and an activity feed (Dynamics 365-style cards showing document icon, title, Active badge, By line, description, modified date, expandable View more section).
- **Changed** — `src/data/timelineData.ts` — enriched event records with `modifiedDate`, `status`, `by`, `description`, `sessionLength`, `interventionType` fields and updated `type` values to `referral | consent | session | survey`.
- **Changed** — Year level standardised to **Year 9 and Year 10 only** across all components and mock data.

---

## [0.1.0] — 2026-03-07

### Initial Student Journey View
- **Added** — `src/components/ProfileSnapshot.tsx` — left-hand student profile panel (Student Name, First/Last Name, Preferred Name, Email, year level, school, counsellor assignment).
- **Added** — `src/components/Header.tsx` — top navigation bar with EMCI branding, student name, and "Assigned to EMCI Counsellor" label.
- **Added** — `src/components/ContextPanel.tsx` — right-hand detail panel with event details, Student Type field, and "Student Has Profile" indicator.
- **Changed** — Removed duplicate student name subtitle under main `h1` in `ProfileSnapshot`.
- **Changed** — Removed redundant School/Year fields from `Header` (already shown in `ContextPanel`).
- **Changed** — Typography increased across all components for improved readability.
