# EMCI — Enhanced My Career Insights (Pilot Program)

A purpose-built dashboard for EMCI counsellors and programme administrators to track, manage, and report on student career guidance journeys across a network of schools.

---

## What Is EMCI?

EMCI (Enhanced My Career Insights — Pilot Program) is a programme that guides secondary school students (Year 9–10) through a structured career readiness journey. The programme operates across multiple schools and is delivered by assigned EMCI counsellors.

This interface gives counsellors and administrators a single place to:

- View the entire school network at a glance
- Drill into individual schools and their student cohorts
- Track each student's progress through the EMCI programme stages
- Log and review counselling activities and sessions
- Export a student journey summary report (PDF preview)
- Monitor counsellor workloads and programme completion rates

---

## Programme Stages

Each student moves through three stages:

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Referral & Consent | School refers the student; parental consent is obtained |
| 2 | Career Guidance | Active counselling sessions, Morrisby unpacking, career planning |
| 3 | Complete | Student has completed the full EMCI programme |

---

## Navigation Structure

URLs use **React Router** (`BrowserRouter` in [`src/main.tsx`](src/main.tsx)). School and student segments use **record ids** (Dataverse GUIDs in production), not names or Morrisby codes.

| Path | Screen |
|------|--------|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Programme **landing** (KPI summary + links to schools and students) |
| `/schools` | All-schools directory (`NetworkOverview` schools view) |
| `/students` | Network student roster (`NetworkOverview` students view) |
| `/school/:schoolId` | School cohort dashboard |
| `/student/:studentId` | Student journey |
| `/student/:studentId/pdf` | PDF export preview (ACCE only) |
| `/counsellors` | Counsellor analytics |
| `/devlab` | Dataverse Lab |
| `/devlab/survey-search` | Survey search (from Lab) |
| `/devlab/student-search` | Student search (from Lab) |
| `/team` | Team management (admins) |

Logical flow:

```
/dashboard              (programme home)
/schools                (all schools)
├── /school/{schoolId}  (school cohort)
/students               (network roster)
/student/{studentId}
└── /student/{studentId}/pdf
```

### Dashboard (`/dashboard`)
Programme **home**: aggregate KPIs for your role scope and shortcuts to **`/schools`** and **`/students`** (students link hidden when the role cannot see names). Not the schools table or roster.

### Schools directory (`/schools`)
Browse **all schools** in the network with:
- Global KPI cards (Total Schools, Total Students, Active Students, In Progress, Counsellors)
- Per-school cards with programme completion bar, student counts, and region
- Filter by status (Active / Onboarding / Inactive) and region
- Text search across school name, region, and Morrisby ID

### Student roster (`/students`)
Network-wide student table (same component family as schools view) with search, school filter, and journey access where permitted.

### School Dashboard
Shows the full student cohort for a selected school (`/school/:schoolId`) with:
- Summary stat cards (Total, Active, In Progress, Completed)
- Student table with stage badges and progress bars
- Filter by stage, year level, and counsellor
- Search by name or Morrisby ID

### Student Journey
A three-panel view for a single student:
- **Left panel** — student profile (name, year, Morrisby ID, counsellor, student type)
- **Centre panel** — stage progress tracker + clickable activity feed; clicking an activity opens a detail modal
- **Right panel** — context panel showing event details or student overview

### PDF Export Preview
A styled A4-format report showing:
- Student summary KPIs
- Stage timeline
- Academic and attendance charts
- Activity log
- Work Readiness checklist (industry immersion, career interest tags, industry exposure)
- Counsellor insights

### Counsellor View
Analytics page for programme administrators showing:
- Counsellor roster sidebar
- KPI chips per counsellor (Total / Active / Completed / In Progress)
- Completion rate progress bar
- Students-by-stage breakdown
- Full student roster table for each counsellor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Routing | React Router 6 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |
| Date handling | date-fns |
| Charts | D3 (used in PDF preview) |

---

## Project Structure

```
src/
├── routes/                    # React Router screens + shell layout
│   ├── MainShell.tsx
│   ├── DashboardRoute.tsx
│   ├── SchoolsListRoute.tsx
│   ├── StudentsListRoute.tsx
│   ├── SchoolRoute.tsx
│   ├── StudentJourneyRoute.tsx
│   ├── PdfRoute.tsx
│   ├── RequirePage.tsx
│   ├── OutletContextBridge.tsx
│   └── shellContext.ts
├── lib/
│   ├── recordIdParam.ts            # URL id segment validation (GUID + safe fixture ids)
│   └── networkProgramMetrics.ts  # Shared KPI scope for dashboard + NetworkOverview
├── components/
│   ├── layout/
│   │   └── MainSidebar.tsx    # Shared nav + sign out for dashboard + school views
│   ├── DashboardHome.tsx      # /dashboard programme landing (KPIs + shortcuts)
│   ├── NetworkOverview.tsx    # /schools and /students main column (two modes)
│   ├── skeletons/
│   │   └── ProgramDataSkeleton.tsx  # Shown while programme data loads or refreshes
│   ├── CounsellorView.tsx     # Counsellor analytics page
│   ├── SchoolDashboard.tsx    # School-level student list
│   ├── ProfileSnapshot.tsx    # Left-hand student profile panel
│   ├── TimelineCore.tsx       # Stage tracker + activity feed + event modal
│   ├── ContextPanel.tsx       # Right-hand event/student detail panel
│   └── PdfPreview.tsx         # PDF export preview page
├── data/
│   ├── networkData.ts         # Schools, counsellors, and all network students
│   ├── studentsData.ts        # Ashwood School student records
│   └── timelineData.ts        # Student journey events and academic data
├── main.tsx                   # React root + BrowserRouter
└── App.tsx                    # Auth, data load, and route table
```

---

## Running Locally

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server (runs on port 3000)
npm run dev
```

The app will be available at `http://localhost:3000`.

```bash
# Type-check the project
npm run lint

# Build for production
npm run build
```

### Production hosting (SPA)

Every path (for example `/counsellors`, `/school/…`, `/student/…`) must resolve to **`index.html`** so React Router can handle the route — otherwise **refresh** on a client path returns a host 404. Configure your host with an **SPA fallback** to `index.html` for paths that are not static files.

**Vercel** ([`vercel.json`](vercel.json)) — API rewrites first, then the SPA shell:

```json
"rewrites": [
  { "source": "/devtoken", "destination": "/api/devtoken" },
  { "source": "/dataverse/:path*", "destination": "/api/dataverse?path=:path*" },
  { "source": "/(.*)", "destination": "/index.html" }
]
```

Other hosts: Azure Static Web Apps `navigationFallback`, nginx `try_files`, IIS URL Rewrite, and so on. If you cannot change server rules, switch **`BrowserRouter`** to **`HashRouter`** in [`src/main.tsx`](src/main.tsx) so URLs use a hash (`#/dashboard`, etc.).

---

## Data & Mock Data

All data in this interface is currently **mock data** — no live database connection. Data is defined in `src/data/`:

- **`networkData.ts`** — 6 schools, 4 counsellors, 25 students across the network
- **`studentsData.ts`** — 8 students for Ashwood School (used by `SchoolDashboard`)
- **`timelineData.ts`** — 4 journey events (referral, consent, session, survey) with academic and attendance data series

When connecting to a real backend, these files are the source of truth for the expected data shapes (TypeScript interfaces).

---

## Key Data Interfaces

```typescript
// A school in the EMCI network
interface School {
  id: string;
  name: string;
  morrisbyId: string;      // Morrisby platform identifier
  region: string;
  principalContact: string;
  status: 'Active' | 'Onboarding' | 'Inactive';
  joinedYear: number;
}

// A student in the programme
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  yearLevel: number;       // 9 or 10
  morrisbyId: string;
  counsellor: string;
  currentStage: 'referral' | 'consent' | 'career_guidance' | 'complete' | null;
  stageProgress: number;   // 0–4
  status: 'Active' | 'Inactive' | 'Pending';
  studentType: 'Standard' | 'At Risk';
  interviewed: boolean;
  hasProfile: boolean;
}
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full history of changes.
