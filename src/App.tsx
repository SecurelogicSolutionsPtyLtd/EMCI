/**
 * EMCI Student Intelligence Interface — root application shell.
 *
 * @author Zac Swalling
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  fetchMidPilotStudentSurveys2026,
  fetchAnnotations,
  enrichStudents,
  deriveStudentEvents,
  type TimelineEvent,
  type RawSession,
  type RawInitialSurvey,
  type RawInitialSurvey2026,
  type RawEndOfPilotSurveyLegacy,
  type RawEndOfPilotSurvey2026,
  type RawMidPilotStudentSurvey,
  type RawMidPilotStudentSurvey2026,
  type RawAnnotation,
} from './services/dataverse';
import { getRoleGroup, ROLE_LABELS } from './types/roles';
import { redactSensitiveEventsMap } from './redaction';
import { Eye, RotateCcw } from 'lucide-react';
import { EmciLoadingScreen } from './components/EmciLoadingScreen';
import { MainShell } from './routes/MainShell';
import { OutletContextBridge } from './routes/OutletContextBridge';
import { DashboardRoute } from './routes/DashboardRoute';
import { SchoolsListRoute } from './routes/SchoolsListRoute';
import { StudentsListRoute } from './routes/StudentsListRoute';
import { SchoolRoute } from './routes/SchoolRoute';
import { StudentJourneyRoute } from './routes/StudentJourneyRoute';
import { PdfRoute } from './routes/PdfRoute';
import { DeAnalyticsRoute } from './routes/DeAnalyticsRoute';
import { RequirePage } from './routes/RequirePage';
import type { AppShellOutletContext } from './routes/shellContext';

const TOKEN_URL = '/devtoken';

// ── Inner app (inside AuthProvider) ──────────────────────────────────────────

function AppInner() {
  const { userRole, schoolId, stage, isImpersonating, clearImpersonation } = useAuth();
  const navigate = useNavigate();

  // ── Auth + data state ────────────────────────────────────────────────────
  const [token, setToken]               = useState('');
  /** True only during Dataverse token fetch after `stage === 'ready'` (EMCI connecting message). */
  const [isConnectingToPlatform, setIsConnectingToPlatform] = useState(false);
  const [students, setStudents]         = useState<Student[]>([]);
  const [schools, setSchools]           = useState<School[]>([]);
  const [dataLoading, setDataLoading]   = useState(false);
  const [dataError, setDataError]       = useState<string | null>(null);
  const refreshTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True after the first successful data load — refreshes use the skeleton, not the full loading screen. */
  const hasLoadedRef                    = useRef(false);

  const [studentEventsMap, setStudentEventsMap] = useState<Record<string, TimelineEvent[]>>({});

  const schoolHomeAppliedRef = useRef<string | null>(null);
  const deHomeAppliedRef     = useRef<string | null>(null);

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
  const loadData = useCallback(async (tok: string): Promise<Student[] | null> => {
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
        midStudentSurveys2026Res, annotationsRes,
      ] = await Promise.allSettled([
        fetchSessions(tok),
        fetchAbsences(tok),
        fetchInitialSurveys(tok),
        fetchInitialSurveys2026(tok),
        fetchEndOfPilotSurveysLegacy(tok),
        fetchEndOfPilotSurveys2026(tok),
        fetchMidPilotStudentSurveys(tok),
        fetchMidPilotStudentSurveys2026(tok),
        fetchAnnotations(tok),
      ]);

      const sessions          = sessionsRes.status          === 'fulfilled' ? sessionsRes.value          : [] as RawSession[];
      const absences          = absencesRes.status          === 'fulfilled' ? absencesRes.value          : [];
      const initSurveys       = initSurveysRes.status       === 'fulfilled' ? initSurveysRes.value       : [] as RawInitialSurvey[];
      const initSurveys2026   = initSurveys2026Res.status   === 'fulfilled' ? initSurveys2026Res.value   : [] as RawInitialSurvey2026[];
      const endSurveysLegacy  = endSurveysLegacyRes.status  === 'fulfilled' ? endSurveysLegacyRes.value  : [] as RawEndOfPilotSurveyLegacy[];
      const endSurveys2026    = endSurveys2026Res.status    === 'fulfilled' ? endSurveys2026Res.value    : [] as RawEndOfPilotSurvey2026[];
      const midStudentSurveys = midStudentSurveysRes.status === 'fulfilled' ? midStudentSurveysRes.value : [] as RawMidPilotStudentSurvey[];
      const midStudentSurveys2026 = midStudentSurveys2026Res.status === 'fulfilled' ? midStudentSurveys2026Res.value : [] as RawMidPilotStudentSurvey2026[];
      const annotations       = annotationsRes.status       === 'fulfilled' ? annotationsRes.value       : [] as RawAnnotation[];

      const enriched = enrichStudents(fetchedStudents, [], sessions, absences);

      const eventsMap: Record<string, TimelineEvent[]> = {};
      const matchesStudent = (
        record: { [key: string]: unknown },
        sid: string,
        sessionIds?: ReadonlySet<string>,
      ): boolean => {
        const normalize = (v: unknown) => typeof v === 'string' ? v.toLowerCase() : null;
        const target = sid.toLowerCase();
        const regarding = normalize(record['_regardingobjectid_value']);
        if (regarding === target) return true;
        // End-of-pilot surveys are sometimes created with Regarding = the session, not the student.
        if (regarding && sessionIds?.has(regarding)) return true;
        return (
          normalize(record['_cr89a_wlpcstudent_value']) === target ||
          normalize(record['_cr89a_student_value'])       === target ||
          normalize(record['cr89a_wlpcstudentid'])        === target
        );
      };
      for (const student of enriched) {
        const sid = student.id;
        const studentSessions = sessions.filter(s => matchesStudent(s, sid));
        const sessionIds = new Set(
          studentSessions.map(s => s.activityid.toLowerCase()),
        );
        const matchesForStudent = (record: { [key: string]: unknown }) =>
          matchesStudent(record, sid, sessionIds);
        const studentAnnotations = annotations.filter(
          a => (a._objectid_value ?? '').toLowerCase() === sid.toLowerCase(),
        );
        const studentAbsences = absences.filter(matchesForStudent);
        eventsMap[sid] = deriveStudentEvents(
          student,
          studentSessions,
          initSurveys.filter(matchesForStudent),
          initSurveys2026.filter(matchesForStudent),
          endSurveysLegacy.filter(matchesForStudent),
          endSurveys2026.filter(matchesForStudent),
          midStudentSurveys.filter(matchesForStudent),
          midStudentSurveys2026.filter(matchesForStudent),
          studentAnnotations,
          studentAbsences,
        );
      }

      setStudents(enriched);
      setSchools(fetchedSchools);
      // Sensitive info (health, disability, family, contact details) is
      // redacted at this choke point so no consumer ever sees raw data.
      setStudentEventsMap(redactSensitiveEventsMap(eventsMap));
      hasLoadedRef.current = true;
      return enriched;
    } catch (e: any) {
      setDataError(e.message ?? 'Failed to load data from Dataverse');
      return null;
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ── Bootstrap when authenticated: token (EMCI copy) then programme data (skeleton overlay) ──
  useLayoutEffect(() => {
    if (stage !== 'ready') {
      setIsConnectingToPlatform(false);
      return;
    }
    let cancelled = false;
    setIsConnectingToPlatform(true);
    (async () => {
      try {
        const tok = await fetchToken();
        if (cancelled) return;
        setIsConnectingToPlatform(false);
        await loadData(tok);
      } catch (e: any) {
        if (!cancelled) {
          setIsConnectingToPlatform(false);
          setDataError(e.message ?? 'Failed to initialise');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── School-role home: once per role+schoolId, navigate to canonical school URL ──
  useEffect(() => {
    if (stage !== 'ready' || !userRole) return;
    if (getRoleGroup(userRole) !== 'school' || !schoolId) {
      schoolHomeAppliedRef.current = null;
      return;
    }
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;
    const marker = `${userRole}:${schoolId}`;
    if (schoolHomeAppliedRef.current === marker) return;
    schoolHomeAppliedRef.current = marker;
    navigate(`/school/${school.id}`, { replace: true });
  }, [stage, userRole, schoolId, schools, navigate]);

  // ── DE-role home: send DE users to the analytics dashboard once per session ──
  useEffect(() => {
    if (stage !== 'ready' || !userRole) return;
    if (getRoleGroup(userRole) !== 'de') {
      deHomeAppliedRef.current = null;
      return;
    }
    if (deHomeAppliedRef.current === userRole) return;
    deHomeAppliedRef.current = userRole;
    if (window.location.pathname === '/' || window.location.pathname === '/dashboard') {
      navigate('/de/analytics', { replace: true });
    }
  }, [stage, userRole, navigate]);

  const shellOutletContext: AppShellOutletContext = useMemo(
    () => ({
      students,
      schools,
      userRole: userRole as NonNullable<typeof userRole>,
      token,
      loadData,
      dataError,
      studentEventsMap,
    }),
    [students, schools, userRole, token, loadData, dataError, studentEventsMap],
  );

  // ── Auth gates ────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return <EmciLoadingScreen />;
  }

  if (stage === 'unauthenticated' || stage === 'mfa_required' || stage === 'mfa_enroll' || stage === 'no_role') {
    return <LoginPage />;
  }

  const ImpersonationBanner = isImpersonating ? (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 bg-amber-400 px-4 py-1.5 shadow-md">
      <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
        <Eye className="w-3.5 h-3.5 shrink-0" />
        Previewing as: <span className="font-bold">{userRole ? ROLE_LABELS[userRole] : ''}</span>
        <span className="opacity-60">— UI only, no data or permissions are changed</span>
      </div>
      <button
        type="button"
        onClick={clearImpersonation}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 text-amber-900 text-xs font-bold transition-colors shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        Restore my access
      </button>
    </div>
  ) : null;

  const impersonationPad = isImpersonating ? 34 : 0;

  const isInitialDataLoad = dataLoading && !hasLoadedRef.current;
  if (isConnectingToPlatform || isInitialDataLoad) {
    return (
      <>
        {ImpersonationBanner}
        <EmciLoadingScreen
          message={isConnectingToPlatform
            ? 'Connecting to the Student Management Platform…'
            : 'Loading programme data…'}
        />
      </>
    );
  }

  return (
    <>
      {ImpersonationBanner}
      <div className="h-screen w-screen overflow-hidden box-border relative" style={{ paddingTop: impersonationPad }}>
        <div className="h-full w-full overflow-hidden">
          <Routes>
            <Route element={<OutletContextBridge context={shellOutletContext} />}>
              <Route
                path="/team"
                element={(
                  <RequirePage page="team">
                    <div className="h-full w-full overflow-hidden">
                      <TeamManagement onBack={() => navigate('/dashboard')} schools={schools} />
                    </div>
                  </RequirePage>
                )}
              />
              <Route
                path="/devlab/survey-search"
                element={(
                  <RequirePage page="surveysearch">
                    <div className="h-full w-full overflow-hidden">
                      <SurveySearch students={students} studentEventsMap={studentEventsMap} onBack={() => navigate('/devlab')} />
                    </div>
                  </RequirePage>
                )}
              />
              <Route
                path="/devlab/student-search"
                element={(
                  <RequirePage page="studentsearch">
                    <div className="h-full w-full overflow-hidden">
                      <StudentSearch students={students} schools={schools} onBack={() => navigate('/devlab')} />
                    </div>
                  </RequirePage>
                )}
              />
              <Route
                path="/devlab"
                element={(
                  <RequirePage page="devlab">
                    <div className="h-full w-full overflow-hidden">
                      <DataverseLab
                        onBack={() => navigate('/dashboard')}
                        onGoToSurveySearch={() => navigate('/devlab/survey-search')}
                        onGoToStudentSearch={() => navigate('/devlab/student-search')}
                      />
                    </div>
                  </RequirePage>
                )}
              />
              <Route element={<MainShell context={shellOutletContext} />}>
                <Route path="/dashboard" element={<DashboardRoute />} />
                <Route path="/schools" element={<SchoolsListRoute />} />
                <Route path="/students" element={<StudentsListRoute />} />
                <Route path="/school/:schoolId" element={<SchoolRoute />} />
                <Route
                  path="/counsellors"
                  element={(
                    <RequirePage page="counsellors">
                      <CounsellorView students={students} schools={schools} />
                    </RequirePage>
                  )}
                />
                <Route
                  path="/student/:studentId/pdf"
                  element={(
                    <RequirePage page="pdf">
                      <PdfRoute />
                    </RequirePage>
                  )}
                />
                <Route
                  path="/de/analytics"
                  element={(
                    <RequirePage page="de_analytics">
                      <DeAnalyticsRoute />
                    </RequirePage>
                  )}
                />
                <Route path="/student/:studentId" element={<StudentJourneyRoute />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </div>
      </div>
    </>
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
