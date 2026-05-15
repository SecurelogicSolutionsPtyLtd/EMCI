# EMCI — Changelog

All notable changes to the EMCI student intelligence interface are documented here.  
Entries are ordered newest-first within each release.

---

## — 2026-05-07 (latest)

### Changed: Programme loading UX

- **Connecting to EMCI Student Management Platform…** (with spinner) is shown **only** while the Dataverse **token** is fetched immediately after sign-in (`stage === 'ready'`), not while schools/students/events are loading.
- Programme **data load and refresh** use a full-view **[`ProgrammeDataSkeleton`](src/components/skeletons/ProgrammeDataSkeleton.tsx)** overlay (responsive pulse placeholders) instead of that copy.

### Changed: Students programme list (`/students`)

- **Student Roster** page heading renamed to **Students** in [`NetworkOverview`](src/components/NetworkOverview.tsx).
- Removed the **Actions** column from the students table; roles that can open the student journey still do so by **clicking the row**.
- Added compact roster **filters** (counsellor, current stage, year level, status) above the students table, combined with search and school scope.

### Changed: Programme network headers

- Removed the placeholder **notification bell** from the **Schools** and **Students** [`NetworkOverview`](src/components/NetworkOverview.tsx) headers (notifications deferred).

### Changed: Main shell and programme navigation

- **`/counsellors`**, **`/student/:studentId`**, and **`/student/:studentId/pdf`** now render inside **[`MainShell`](src/routes/MainShell.tsx)** with the same **[`MainSidebar`](src/components/layout/MainSidebar.tsx)** as the programme dashboard, schools list, students list, and school drill-in (shared data error banner above the outlet).
- **Students** nav highlights for **`/students`** and any path under **`/student/`**; **Counsellors** highlights on **`/counsellors`**.
- **[`CounsellorView`](src/components/CounsellorView.tsx)** uses **`h-full` / `min-h-0`** for the shell outlet and no longer shows a duplicate “back to dashboard” header.
- **[`StudentJourneyRoute`](src/routes/StudentJourneyRoute.tsx)** removes the duplicate data-error strip and **Sign out** (handled in **`MainShell`** / sidebar); journey columns use **`min-h-0`** for reliable flex scrolling.

### Added: Student absence count (risk context)

- **`Student.absenceCount`** reflects linked **absence** records: set in **[`enrichStudents`](src/services/dataverse.ts)** (with **[`mapStudent`](src/services/dataverse.ts)** default `0`), aligned with demo **`riskLevel`** in seed data.
- **[`NetworkOverview`](src/components/NetworkOverview.tsx)** and **[`SchoolDashboard`](src/components/SchoolDashboard.tsx)** show the count beside at-risk context; **[`ProfileSnapshot`](src/components/ProfileSnapshot.tsx)** shows **Absences** on the student journey.

### Added: URL routing (React Router)

- **`react-router-dom`** with **`BrowserRouter`** in [`src/main.tsx`](src/main.tsx). Authenticated app screens use **`Routes`** in [`src/App.tsx`](src/App.tsx) with opaque **Dataverse primary keys** in paths: **`/school/:schoolId`**, **`/student/:studentId`**, **`/student/:studentId/pdf`** (see [`src/lib/recordIdParam.ts`](src/lib/recordIdParam.ts) for param validation).
- **Programme paths:** **`/dashboard`** (landing), **`/schools`** (all-schools directory), **`/students`** (network roster); **[`DashboardHome`](src/components/DashboardHome.tsx)** + **[`SchoolsListRoute`](src/routes/SchoolsListRoute.tsx)** / **[`StudentsListRoute`](src/routes/StudentsListRoute.tsx)**; shared KPI logic in [`src/lib/networkProgrammeMetrics.ts`](src/lib/networkProgrammeMetrics.ts).
- **Nested dev lab paths:** **`/devlab/survey-search`**, **`/devlab/student-search`** under **`/devlab`**.
- Shared data for route modules via **[`OutletContextBridge`](src/routes/OutletContextBridge.tsx)** + **`AppShellOutletContext`** ([`src/routes/shellContext.ts`](src/routes/shellContext.ts)); **[`MainShell`](src/routes/MainShell.tsx)** wraps the main programme shell (dashboard, schools, students, school drill-in, counsellors, student journey, PDF) with **`MainSidebar`**.
- **School-role home** still runs once per role + school id but now **`navigate('/school/{id}', { replace: true })`** so the address bar matches the school view.

### Changed: Shared shell for dashboard and school drill-in

- **[`MainSidebar`](src/components/layout/MainSidebar.tsx)** includes an explicit **Dashboard** item and path-based active states: **`/dashboard`**, **`/schools`** / **`/school/...`**, **`/students`** / **`/student/...`**, **`/counsellors`** (where the role may see those items).
- **[`NetworkOverview`](src/components/NetworkOverview.tsx)** is used only on **`/schools`** and **`/students`**; KPI scope matches [`getProgrammeVisibleScope`](src/lib/networkProgrammeMetrics.ts).
- **[`SchoolDashboard`](src/components/SchoolDashboard.tsx)** sits in that shell with **`flex-1`** layout (no duplicate full-screen chrome header).

### Fixed: Navigation edge cases

- **School-role home redirect** runs **once per `userRole` + `schoolId`** (ref marker), not on every `schools` array identity change from `loadData`, so school users can stay on the **programme dashboard** after a refresh.
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

- **Connecting to EMCI Student Management Platform…** appears only during the **token** step after login; programme data loading uses a skeleton overlay (see **Changed: Programme loading UX** above).
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
- **Work Readiness Checklist:** 3-column grid — Programme Milestones checklist, Survey Records tags, Programme Progress bars — all driven by real event data.
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

**Finding from diagnostic logging:** The `EndOfPilotSurveys2026` table has only 1 record, linked to a test account ("Securelogic Student", `stage=null`) — it will never match a real student. The legacy end-of-pilot surveys (61 records) correctly match 60 real students. Students without survey data were showing a misleading "Post-programme survey completed" fallback.

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
- **Redesigned** — Schools list changed from a 3-column card grid to a full-width table with columns: School Name, Morrisby ID, Region, Status, Programme Completion (orange bar + %), Total Students.
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
- **Added** — Seven defined roles across three tiers: Operational (EMCI Counsellor, School Counsellor / Guidance Officer), Administrative (School Administrator / Principal, EMCI Programme Manager, System Administrator / Developer), and Oversight (Department of Education User, EMCI Executive).
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
- **Removed** — "Network Programme Completion" progress-bar card that previously appeared between the KPI row and the filters. Its data is now surfaced per-school via the individual school card bars.
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
- **Updated** — `README.md` — fully rewritten to describe EMCI's purpose, programme stages, navigation structure, tech stack, project layout, data interfaces, and local setup instructions.

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
- **Removed** — "Network Programme Completion" progress-bar card that previously appeared between the KPI row and the filters. Its data is now surfaced per-school via the individual school card bars.
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
