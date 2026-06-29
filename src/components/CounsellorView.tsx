import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { UserCheck } from 'lucide-react';
import { type Student } from '../data/studentsData';
import type { School } from '../data/networkData';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, canSeeStudentNames, isCounsellorScoped, isSecureLogicAdmin } from '../types/roles';
import type { OwnerLookup } from '../services/dataverse';
import type { TeamMember, InactiveCounsellorOverride } from '../services/supabase';
import { deriveCounsellorRoster, filterStudentsForCounsellorRoster, resolveInactiveCounsellorKeys } from '../lib/programStatsFilters';
import { studentMatchesCounsellorScope } from '../types/roles';
import { NetworkStudentRoster } from './NetworkStudentRoster';

interface CounsellorViewProps {
  students: Student[];
  schools: School[];
  ownerMap?: OwnerLookup;
  teamMembers?: TeamMember[];
  inactiveCounsellorOverrides?: InactiveCounsellorOverride[];
}

const STAGE_HEADER_LABELS: Record<string, string> = {
  referral: 'Referral',
  consent: 'Consent',
  career_guidance: 'Career Guidance',
  complete: 'Complete',
};

interface DerivedCounsellor {
  id: string;
  name: string;
  ownerId?: string;
  isInactive: boolean;
}

interface CounsellorStats {
  total: number;
  active: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  pct: number;
  interviewed: number;
  profiled: number;
  schoolObjects: { id: string; name: string }[];
  students: Student[];
  stageCounts: { stage: string; count: number }[];
}

function counsellorStats(rosterId: string, allStudents: Student[], allSchools: School[]): CounsellorStats {
  const myStudents  = filterStudentsForCounsellorRoster(allStudents, rosterId);
  const total       = myStudents.length;
  const active      = myStudents.filter(s => s.status === 'Active').length;
  const completed   = myStudents.filter(s => s.currentStage === 'complete').length;
  const inProgress  = myStudents.filter(s => s.stageProgress > 0 && s.currentStage !== 'complete').length;
  const notStarted  = myStudents.filter(s => s.stageProgress === 0).length;
  const pct         = total > 0 ? Math.round((completed / total) * 100) : 0;
  const interviewed = myStudents.filter(s => s.interviewed).length;
  const profiled    = myStudents.filter(s => s.hasProfile).length;

  const schoolObjects: { id: string; name: string }[] = [];
  const seenIds = new Set<string>();
  for (const s of myStudents) {
    const sid = (s as { schoolId?: string }).schoolId;
    if (sid && !seenIds.has(sid)) {
      seenIds.add(sid);
      const school = allSchools.find(sc => sc.id === sid);
      schoolObjects.push({ id: sid, name: school?.name ?? sid });
    }
  }
  schoolObjects.sort((a, b) => a.name.localeCompare(b.name));

  const stageCounts = ['referral', 'consent', 'career_guidance', 'complete'].map(stage => ({
    stage,
    count: myStudents.filter(s => s.currentStage === stage).length,
  }));

  return { total, active, completed, inProgress, notStarted, pct, interviewed, profiled, schoolObjects, students: myStudents, stageCounts };
}

function HeaderMetric({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="px-4 sm:px-6 py-4 min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">{label}</p>
      <p className={`text-2xl font-bold tabular-nums tracking-tight ${highlight ? 'text-primary' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function CounsellorOwnerIdLine({ ownerId, visible }: { ownerId?: string; visible: boolean }) {
  if (!visible || !ownerId?.trim()) return null;
  return (
    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5" title={ownerId}>
      {ownerId}
    </p>
  );
}

function CounsellorDetailPanel({
  selected,
  students,
  schools,
  showOwnerIds,
  showStudentNames,
  showStudentJourney,
  onSelectStudent,
}: {
  selected: DerivedCounsellor;
  students: Student[];
  schools: School[];
  showOwnerIds: boolean;
  showStudentNames: boolean;
  showStudentJourney: boolean;
  onSelectStudent?: (student: Student) => void;
}) {
  const stats = counsellorStats(selected.id, students, schools);
  const counsellorSchools = schools.filter(s => stats.schoolObjects.some(sc => sc.id === s.id));

  return (
    <>
      <header className="shrink-0 bg-white border-b border-slate-200">
        <div className="px-6 sm:px-8 py-5 flex items-start gap-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900 truncate">{selected.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selected.isInactive ? 'Inactive EMCI Counsellor' : 'EMCI Counsellor'}
              {' · '}
              {stats.schoolObjects.length} schools / campuses
            </p>
            <CounsellorOwnerIdLine ownerId={selected.ownerId} visible={showOwnerIds} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100">
          <HeaderMetric label="Total Students" value={stats.total} highlight />
          <HeaderMetric label="Active" value={stats.active} />
          <HeaderMetric label="Completed" value={stats.completed} />
          <HeaderMetric label="In Progress" value={stats.inProgress} />
          <HeaderMetric label="Completion" value={`${stats.pct}%`} />
        </div>

        <div className="px-6 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Stages</span>
            {stats.stageCounts.map(({ stage, count }) => (
              <span key={stage}>
                {STAGE_HEADER_LABELS[stage]} <span className="font-bold text-slate-800 tabular-nums">{count}</span>
              </span>
            ))}
            <span>
              Not started <span className="font-bold text-slate-800 tabular-nums">{stats.notStarted}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 shrink-0">
            {stats.interviewed} interviewed · {stats.profiled} Morrisby profile{stats.profiled !== 1 ? 's' : ''}
            {stats.completed > 0 && (
              <> · {stats.completed} completed of {stats.total}</>
            )}
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <NetworkStudentRoster
          students={stats.students}
          schools={counsellorSchools.length > 0 ? counsellorSchools : schools}
          showStudentNames={showStudentNames}
          showStudentJourney={showStudentJourney}
          onSelectStudent={onSelectStudent}
          hideCounsellor
        />
      </div>
    </>
  );
}

export function CounsellorView({
  students,
  schools,
  ownerMap,
  teamMembers,
  inactiveCounsellorOverrides,
}: CounsellorViewProps) {
  const navigate = useNavigate();
  const { userRole, counsellorScope, authUser } = useAuth();
  const showStudentJourney = canAccessPage(userRole, 'student', counsellorScope);
  const showStudentNames = canSeeStudentNames(userRole);
  const isScopedView = isCounsellorScoped(userRole, counsellorScope);
  const showOwnerIds = isSecureLogicAdmin(userRole);

  const inactiveKeys = useMemo(
    () => resolveInactiveCounsellorKeys(teamMembers, ownerMap, inactiveCounsellorOverrides),
    [teamMembers, ownerMap, inactiveCounsellorOverrides],
  );

  const counsellors: DerivedCounsellor[] = useMemo(() => {
    if (isScopedView && counsellorScope) {
      const scopedStudents = students.filter(s => studentMatchesCounsellorScope(s, counsellorScope));
      const first = scopedStudents[0];
      const ownerId = counsellorScope.ownerId?.trim().toLowerCase()
        ?? first?.counsellorOwnerId?.trim().toLowerCase();
      if (!ownerId) {
        return [{
          id: '',
          name: authUser?.displayName ?? 'My students',
          isInactive: false,
        }];
      }
      const name =
        first?.counsellor?.trim()
        ?? ownerMap?.get(ownerId)?.name?.trim()
        ?? authUser?.displayName
        ?? 'My students';
      return [{ id: `id:${ownerId}`, name, ownerId, isInactive: false }];
    }
    return deriveCounsellorRoster(students, ownerMap, inactiveKeys).map(c => ({
      id: c.id,
      name: c.name,
      ownerId: c.ownerId,
      isInactive: c.isInactive,
    }));
  }, [students, isScopedView, counsellorScope, authUser?.displayName, ownerMap, inactiveKeys]);

  const activeCounsellors = useMemo(
    () => counsellors.filter(c => !c.isInactive),
    [counsellors],
  );
  const inactiveCounsellors = useMemo(
    () => counsellors.filter(c => c.isInactive),
    [counsellors],
  );

  const [selected, setSelected] = useState<DerivedCounsellor>(counsellors[0] ?? { id: '', name: '', isInactive: false });

  React.useEffect(() => {
    if (counsellors.length === 0) return;
    if (!counsellors.some(c => c.id === selected.id)) {
      const next = activeCounsellors[0] ?? inactiveCounsellors[0] ?? counsellors[0]!;
      setSelected(next);
    }
  }, [counsellors, activeCounsellors, inactiveCounsellors, selected.id]);

  function handleSelectCounsellor(c: DerivedCounsellor) {
    setSelected(c);
  }

  if (counsellors.length === 0) {
    return (
      <div className="h-full min-h-0 w-full flex flex-col bg-slate-50 overflow-hidden">
        <div className="flex-1 flex items-center justify-center min-h-0 p-8">
          <div className="text-center">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">Counsellor view</p>
            <p className="text-sm text-slate-400">No counsellors found in student data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {!isScopedView && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-3">Counsellors</p>
          </div>
          <div className="flex flex-col gap-1 px-3 pb-4">
            {activeCounsellors.map(c => {
              const s = counsellorStats(c.id, students, schools);
              const isActive = c.id === selected.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCounsellor(c)}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-all duration-150 ${
                    isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-slate-800'}`}>{c.name}</div>
                    <div className="text-xs text-slate-400 truncate">EMCI Counsellor</div>
                    <CounsellorOwnerIdLine ownerId={c.ownerId} visible={showOwnerIds} />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-slate-600'}`}>{s.total}</div>
                    <div className="text-[10px] text-slate-400">students</div>
                  </div>
                </button>
              );
            })}
            {inactiveCounsellors.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-3 pt-4 pb-1">
                  Inactive
                </p>
                {inactiveCounsellors.map(c => {
                  const s = counsellorStats(c.id, students, schools);
                  const isActive = c.id === selected.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCounsellor(c)}
                      className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-all duration-150 opacity-75 ${
                        isActive ? 'bg-slate-100 border border-slate-200' : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <UserCheck className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold truncate ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>{c.name}</div>
                        <div className="text-xs text-slate-400 truncate">Inactive counsellor</div>
                        <CounsellorOwnerIdLine ownerId={c.ownerId} visible={showOwnerIds} />
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-slate-500">{s.total}</div>
                        <div className="text-[10px] text-slate-400">students</div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>
        )}

        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden"
            >
              <CounsellorDetailPanel
                selected={selected}
                students={students}
                schools={schools}
                showOwnerIds={showOwnerIds}
                showStudentNames={showStudentNames}
                showStudentJourney={showStudentJourney}
                onSelectStudent={showStudentJourney ? s => navigate(`/student/${s.id}`) : undefined}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
