import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ProfileSnapshot } from './components/ProfileSnapshot';
import { TimelineCore } from './components/TimelineCore';
import { ContextPanel } from './components/ContextPanel';
import { SchoolDashboard } from './components/SchoolDashboard';
import { PdfPreview } from './components/PdfPreview';
import { NetworkOverview } from './components/NetworkOverview';
import { CounsellorView } from './components/CounsellorView';
import { DataverseLab } from './components/DataverseLab';
import { SurveySearch } from './components/SurveySearch';
import { StudentSearch } from './components/StudentSearch';
import { LoginPage } from './components/LoginPage';
import { TeamManagement } from './components/TeamManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { Student } from './data/studentsData';
import type { School } from './data/networkData';
import {
  fetchStudents,
  fetchSchools,
  fetchSessions,
  fetchAbsences,
  fetchInitialSurveys,
  fetchInitialSurveys2026,
  fetchEndOfPilotSurveysLegacy,
  fetchEndOfPilotSurveys2026,
  fetchMidPilotStudentSurveys,
  enrichStudents,
  deriveStudentEvents,
  type TimelineEvent,
  type RawSession,
  type RawInitialSurvey,
  type RawInitialSurvey2026,
  type RawEndOfPilotSurveyLegacy,
  type RawEndOfPilotSurvey2026,
  type RawMidPilotStudentSurvey,
} from './services/dataverse';
import { canAccessPage, getRoleGroup, ROLE_LABELS } from './types/roles';
import type { Page } from './types/roles';
import { ChevronLeft, FileDown, ChevronRight, Loader2, AlertCircle, RefreshCw, Eye, RotateCcw } from 'lucide-react';

const TOKEN_URL = '/devtoken';

// ── Inner app (inside AuthProvider) ──────────────────────────────────────────

function AppInner() {
  const { authUser, userRole, schoolId, stage, isImpersonating, clearImpersonation } = useAuth();

  // ── Auth + data state ────────────────────────────────────────────────────
  const [token, setToken]               = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);
  const [students, setStudents]         = useState<Student[]>([]);
  const [schools, setSchools]           = useState<School[]>([]);
  const [dataLoading, setDataLoading]   = useState(false);
  const [dataError, setDataError]       = useState<string | null>(null);
  const refreshTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [studentEventsMap, setStudentEventsMap] = useState<Record<string, TimelineEvent[]>>({});

  // ── Navigation state ─────────────────────────────────────────────────────
  const [page, setPage]                       = useState<Page>('network');
  const [selectedSchool, setSelectedSchool]   = useState<School | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEvent, setSelectedEvent]     = useState<any | null>(null);

  // ── Token fetch ───────────────────────────────────────────────────────────
  const fetchToken = useCallback(async (): Promise<string> => {
    const res  = await fetch(TOKEN_URL, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description ?? data.error ?? `Token fetch HTTP ${res.status}`);
    }
    const newToken = data.access_token as string;
    setToken(newToken);
    const expiresInSec = (data.expires_in ?? 3600) as number;
    const refreshIn    = Math.max((expiresInSec - 300) * 1000, 30_000);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => fetchToken(), refreshIn);
    return newToken;
  }, []);

  // ── Load all Dataverse data ───────────────────────────────────────────────
  const loadData = useCallback(async (tok: string) => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [fetchedStudents, fetchedSchools] = await Promise.all([
        fetchStudents(tok),
        fetchSchools(tok),
      ]);
      const [
        sessionsRes, absencesRes, initSurveysRes, initSurveys2026Res,
        endSurveysLegacyRes, endSurveys2026Res, midStudentSurveysRes,
      ] = await Promise.allSettled([
        fetchSessions(tok),
        fetchAbsences(tok),
        fetchInitialSurveys(tok),
        fetchInitialSurveys2026(tok),
        fetchEndOfPilotSurveysLegacy(tok),
        fetchEndOfPilotSurveys2026(tok),
        fetchMidPilotStudentSurveys(tok),
      ]);

      const sessions          = sessionsRes.status          === 'fulfilled' ? sessionsRes.value          : [] as RawSession[];
      const absences          = absencesRes.status          === 'fulfilled' ? absencesRes.value          : [];
      const initSurveys       = initSurveysRes.status       === 'fulfilled' ? initSurveysRes.value       : [] as RawInitialSurvey[];
      const initSurveys2026   = initSurveys2026Res.status   === 'fulfilled' ? initSurveys2026Res.value   : [] as RawInitialSurvey2026[];
      const endSurveysLegacy  = endSurveysLegacyRes.status  === 'fulfilled' ? endSurveysLegacyRes.value  : [] as RawEndOfPilotSurveyLegacy[];
      const endSurveys2026    = endSurveys2026Res.status    === 'fulfilled' ? endSurveys2026Res.value    : [] as RawEndOfPilotSurvey2026[];
      const midStudentSurveys = midStudentSurveysRes.status === 'fulfilled' ? midStudentSurveysRes.value : [] as RawMidPilotStudentSurvey[];

      const enriched = enrichStudents(fetchedStudents, [], sessions, absences);

      const eventsMap: Record<string, TimelineEvent[]> = {};
      const matchesStudent = (record: { [key: string]: unknown }, sid: string): boolean => {
        const normalize = (v: unknown) => typeof v === 'string' ? v.toLowerCase() : null;
        const target = sid.toLowerCase();
        return (
          normalize(record['_regardingobjectid_value']) === target ||
          normalize(record['_cr89a_wlpcstudent_value'])  === target ||
          normalize(record['_cr89a_student_value'])       === target ||
          normalize(record['cr89a_wlpcstudentid'])        === target
        );
      };
      for (const student of enriched) {
        const sid = student.id;
        eventsMap[sid] = deriveStudentEvents(
          student,
          sessions.filter(s => matchesStudent(s, sid)),
          initSurveys.filter(s => matchesStudent(s, sid)),
          initSurveys2026.filter(s => matchesStudent(s, sid)),
          endSurveysLegacy.filter(s => matchesStudent(s, sid)),
          endSurveys2026.filter(s => matchesStudent(s, sid)),
          midStudentSurveys.filter(s => matchesStudent(s, sid)),
        );
      }

      setStudents(enriched);
      setSchools(fetchedSchools);
      setStudentEventsMap(eventsMap);
    } catch (e: any) {
      setDataError(e.message ?? 'Failed to load data from Dataverse');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ── Bootstrap on mount (only when authenticated) ──────────────────────────
  useEffect(() => {
    if (stage !== 'ready') return;
    (async () => {
      setTokenLoading(true);
      try {
        const tok = await fetchToken();
        await loadData(tok);
      } catch (e: any) {
        setDataError(e.message ?? 'Failed to initialise');
      } finally {
        setTokenLoading(false);
      }
    })();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Set landing page based on role ────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'ready' || !userRole) return;
    const group = getRoleGroup(userRole);
    if (group === 'school' && schoolId) {
      const school = schools.find(s => s.id === schoolId);
      if (school) { setSelectedSchool(school); setPage('school'); }
    }
  }, [stage, userRole, schoolId, schools]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  function handleSelectSchool(school: School) {
    setSelectedSchool(school);
    setSelectedStudent(null);
    setSelectedEvent(null);
    setPage('school');
  }

  function handleSelectStudent(student: Student) {
    if (!userRole || !canAccessPage(userRole, 'student')) return;
    setSelectedStudent(student);
    setSelectedEvent(null);
    setPage('student');
  }

  function goTo(p: Page) {
    if (!userRole || !canAccessPage(userRole, p)) return;
    setSelectedEvent(null);
    setPage(p);
  }

  const studentSchoolName = selectedStudent
    ? (schools.find(s => s.id === (selectedStudent as any).schoolId)?.name ?? selectedSchool?.name ?? undefined)
    : undefined;

  // ── Auth gates ────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (stage === 'unauthenticated' || stage === 'mfa_required' || stage === 'mfa_enroll' || stage === 'no_role') {
    return <LoginPage />;
  }

  // ── Data loading screen ───────────────────────────────────────────────────
  // ── Impersonation banner — fixed overlay, visible on every page ─────────
  const ImpersonationBanner = isImpersonating ? (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 bg-amber-400 px-4 py-1.5 shadow-md">
      <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
        <Eye className="w-3.5 h-3.5 shrink-0" />
        Previewing as: <span className="font-bold">{userRole ? ROLE_LABELS[userRole] : ''}</span>
        <span className="opacity-60">— UI only, no data or permissions are changed</span>
      </div>
      <button
        onClick={clearImpersonation}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 text-amber-900 text-xs font-bold transition-colors shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        Restore my access
      </button>
    </div>
  ) : null;

  if (tokenLoading || (dataLoading && students.length === 0)) {
    return (
      <>
        {ImpersonationBanner}
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4" style={{ paddingTop: isImpersonating ? 34 : 0 }}>
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
            {tokenLoading ? 'Connecting to Dataverse…' : 'Loading programme data…'}
          </p>
        </div>
      </>
    );
  }

  const ErrorBanner = dataError ? (
    <div className="shrink-0 bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-sm text-red-700 flex-1">{dataError}</p>
      <button
        onClick={() => token && loadData(token)}
        className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  ) : null;

  // ── Team management ───────────────────────────────────────────────────────
  if (page === 'team') {
    return (
      <>
        {ImpersonationBanner}
        <div style={{ paddingTop: isImpersonating ? 34 : 0 }} className="h-screen w-screen overflow-hidden">
          <TeamManagement onBack={() => goTo('network')} schools={schools} />
        </div>
      </>
    );
  }

  // ── Network overview ──────────────────────────────────────────────────────
  if (page === 'network') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ paddingTop: isImpersonating ? 34 : 0 }}>
        {ImpersonationBanner}
        {ErrorBanner}
        <NetworkOverview
          students={students}
          schools={schools}
          userRole={userRole!}
          onSelectSchool={handleSelectSchool}
          onSelectStudent={handleSelectStudent}
          onGoToCounsellors={() => goTo('counsellors')}
          onGoToDevLab={() => goTo('devlab')}
          onGoToTeam={() => goTo('team')}
        />
      </div>
    );
  }

  // ── Counsellor view ───────────────────────────────────────────────────────
  if (page === 'counsellors') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ paddingTop: isImpersonating ? 34 : 0 }}>
        {ImpersonationBanner}
        {ErrorBanner}
        <CounsellorView students={students} schools={schools} onBack={() => goTo('network')} />
      </div>
    );
  }

  // ── Dataverse lab ─────────────────────────────────────────────────────────
  if (page === 'devlab') {
    return (
      <>
        {ImpersonationBanner}
        <div style={{ paddingTop: isImpersonating ? 34 : 0 }} className="h-screen w-screen overflow-hidden">
          <DataverseLab onBack={() => goTo('network')} onGoToSurveySearch={() => goTo('surveysearch')} onGoToStudentSearch={() => goTo('studentsearch')} />
        </div>
      </>
    );
  }

  if (page === 'surveysearch') {
    return (
      <>
        {ImpersonationBanner}
        <div style={{ paddingTop: isImpersonating ? 34 : 0 }} className="h-screen w-screen overflow-hidden">
          <SurveySearch students={students} studentEventsMap={studentEventsMap} onBack={() => goTo('devlab')} />
        </div>
      </>
    );
  }

  if (page === 'studentsearch') {
    return (
      <>
        {ImpersonationBanner}
        <div style={{ paddingTop: isImpersonating ? 34 : 0 }} className="h-screen w-screen overflow-hidden">
          <StudentSearch students={students} schools={schools} onBack={() => goTo('devlab')} />
        </div>
      </>
    );
  }

  // ── School dashboard ──────────────────────────────────────────────────────
  if (page === 'school') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ paddingTop: isImpersonating ? 34 : 0 }}>
        {ImpersonationBanner}
        {ErrorBanner}
        <SchoolDashboard
          students={students}
          school={selectedSchool}
          onSelectStudent={userRole && canAccessPage(userRole, 'student') ? handleSelectStudent : undefined}
          onBack={() => goTo('network')}
        />
      </div>
    );
  }

  // ── PDF preview ───────────────────────────────────────────────────────────
  if (page === 'pdf') {
    return (
      <>
        {ImpersonationBanner}
        <div style={{ paddingTop: isImpersonating ? 34 : 0 }} className="h-screen w-screen overflow-hidden">
          <PdfPreview
            studentName={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '—'}
            morrisbyId={selectedStudent?.morrisbyId ?? '—'}
            schoolName={studentSchoolName ?? selectedSchool?.name ?? '—'}
            counsellor={selectedStudent?.counsellor ?? '—'}
            yearLevel={selectedStudent?.yearLevel ?? 0}
            currentStage={selectedStudent?.currentStage ?? null}
            stageProgress={selectedStudent?.stageProgress ?? 0}
            events={selectedStudent ? (studentEventsMap[selectedStudent.id] ?? []) : []}
            onBack={() => goTo('student')}
          />
        </div>
      </>
    );
  }

  // ── Student journey ───────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex flex-col bg-emci-bg text-emci-primary overflow-hidden" style={{ paddingTop: isImpersonating ? 34 : 0 }}>
      {ImpersonationBanner}
      <div className="shrink-0 bg-white border-b border-slate-100 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={() => goTo('network')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors font-medium group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Network
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <button onClick={() => goTo('school')}
            className="text-sm text-slate-500 hover:text-primary transition-colors font-medium">
            {selectedSchool?.name ?? 'School'}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-sm text-slate-800 font-semibold">
            {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Student Journey'}
          </span>
        </div>
        {userRole && canAccessPage(userRole, 'pdf') && (
          <button
            onClick={() => goTo('pdf')}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all rounded-lg shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Export to PDF
          </button>
        )}
      </div>
      {ErrorBanner}
      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col">
          <ProfileSnapshot student={selectedStudent} schoolName={studentSchoolName} />
        </div>
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <TimelineCore student={selectedStudent} events={selectedStudent ? (studentEventsMap[selectedStudent.id] ?? []) : []} onSelectEvent={setSelectedEvent} />
        </div>
        <div className="w-[380px] shrink-0 border-l border-slate-200 flex flex-col">
          <ContextPanel student={selectedStudent} selectedEvent={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </div>
      </div>
    </div>
  );
}

// ── Root export (wraps inner with AuthProvider) ───────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
