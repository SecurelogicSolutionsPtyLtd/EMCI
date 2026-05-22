import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, TrendingUp,
  CheckCircle2, BookOpen, BarChart2, UserCheck, Building2,
  Star, Circle,
} from 'lucide-react';
import { SearchableDropdown } from './ui/SearchableDropdown';
import { type Student, formatYearLevelLine } from '../data/studentsData';
import type { School } from '../data/networkData';
import { useAuth } from '../context/AuthContext';
import { canAccessPage } from '../types/roles';

const PAGE_SIZE = 10;

interface CounsellorViewProps {
  students: Student[];
  schools: School[];
}

const STAGE_LABELS: Record<string, string> = {
  referral: 'Referral', consent: 'Consent',
  career_guidance: 'Career Guidance', complete: 'Complete',
};

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  referral:        { bg: 'bg-primary/10',  text: 'text-primary',     border: 'border-primary/20',  bar: 'bg-primary'     },
  consent:         { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-400' },
  career_guidance: { bg: 'bg-primary/10',  text: 'text-primary',     border: 'border-primary/20',  bar: 'bg-primary/70'  },
  complete:        { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' },
};

interface DerivedCounsellor {
  id: string;
  name: string;
}

function counsellorStats(counsellorName: string, allStudents: Student[], allSchools: School[]) {
  const myStudents  = allStudents.filter(s => s.counsellor === counsellorName);
  const total       = myStudents.length;
  const active      = myStudents.filter(s => s.status === 'Active').length;
  const completed   = myStudents.filter(s => s.currentStage === 'complete').length;
  const inProgress  = myStudents.filter(s => s.stageProgress > 0 && s.currentStage !== 'complete').length;
  const notStarted  = myStudents.filter(s => s.stageProgress === 0).length;
  const pct         = total > 0 ? Math.round((completed / total) * 100) : 0;
  const interviewed = myStudents.filter(s => s.interviewed).length;
  const profiled    = myStudents.filter(s => s.hasProfile).length;
  const schoolsServed = Array.from(new Set(myStudents.map(s => {
    const school = allSchools.find(sc => sc.id === (s as any).schoolId);
    return school?.name ?? (s as any).schoolId ?? '';
  }).filter(Boolean)));

  // Unique schools with both id and name for the filter
  const schoolObjects: { id: string; name: string }[] = [];
  const seenIds = new Set<string>();
  for (const s of myStudents) {
    const sid = (s as any).schoolId as string | undefined;
    if (sid && !seenIds.has(sid)) {
      seenIds.add(sid);
      const school = allSchools.find(sc => sc.id === sid);
      schoolObjects.push({ id: sid, name: school?.name ?? sid });
    }
  }
  schoolObjects.sort((a, b) => a.name.localeCompare(b.name));

  return { total, active, completed, inProgress, notStarted, pct, interviewed, profiled, schoolsServed, schoolObjects, students: myStudents };
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${color}`}>
      <span className="text-xl font-bold leading-tight">{value}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold mt-0.5">{label}</span>
    </div>
  );
}

export function CounsellorView({ students, schools }: CounsellorViewProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const showStudentJourney = canAccessPage(userRole, 'student');

  // Derive unique counsellor list from students
  const counsellors: DerivedCounsellor[] = Array.from(
    new Set(students.map(s => s.counsellor).filter(Boolean))
  ).map((name, i) => ({ id: `c-${i}`, name }));

  const [selected, setSelected] = useState<DerivedCounsellor>(counsellors[0] ?? { id: '', name: '' });
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [rosterPage, setRosterPage] = useState(1);

  const stats = counsellorStats(selected.name, students, schools);

  // Reset school filter when counsellor changes
  function handleSelectCounsellor(c: DerivedCounsellor) {
    setSelected(c);
    setSelectedSchoolId('all');
    setRosterPage(1);
  }

  function handleSelectSchool(schoolId: string) {
    setSelectedSchoolId(schoolId);
    setRosterPage(1);
  }

  const schoolDropdownOptions = useMemo(
    () => [
      { value: 'all', label: 'All schools', count: stats.students.length },
      ...stats.schoolObjects.map(sc => ({
        value: sc.id,
        label: sc.name,
        count: stats.students.filter(s => (s as { schoolId?: string }).schoolId === sc.id).length,
      })),
    ],
    [stats.students, stats.schoolObjects],
  );

  // Filtered student list based on school dropdown
  const rosterStudents = useMemo(() => {
    if (selectedSchoolId === 'all') return stats.students;
    return stats.students.filter(s => (s as any).schoolId === selectedSchoolId);
  }, [stats.students, selectedSchoolId]);

  const totalRosterPages = Math.max(1, Math.ceil(rosterStudents.length / PAGE_SIZE));
  const safeRosterPage = Math.min(rosterPage, totalRosterPages);
  const rosterSlice = rosterStudents.slice(
    (safeRosterPage - 1) * PAGE_SIZE,
    safeRosterPage * PAGE_SIZE,
  );
  const rosterShowingFrom = rosterStudents.length === 0 ? 0 : (safeRosterPage - 1) * PAGE_SIZE + 1;
  const rosterShowingTo = Math.min(safeRosterPage * PAGE_SIZE, rosterStudents.length);
  const rosterPageNumbers: number[] = [];
  for (let i = Math.max(1, safeRosterPage - 2); i <= Math.min(totalRosterPages, safeRosterPage + 2); i++) {
    rosterPageNumbers.push(i);
  }

  const selectedSchoolName = selectedSchoolId === 'all'
    ? null
    : stats.schoolObjects.find(sc => sc.id === selectedSchoolId)?.name ?? null;

  const stageBreakdown = ['referral', 'consent', 'career_guidance', 'complete'].map(stage => ({
    stage,
    count: stats.students.filter(s => s.currentStage === stage).length,
  }));
  const notStartedCount = stats.students.filter(s => !s.currentStage).length;

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

        {/* ── Counsellor sidebar ────────────────────────────── */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-3">Counsellors</p>
          </div>
          <div className="flex flex-col gap-1 px-3 pb-4">
            {counsellors.map(c => {
              const s = counsellorStats(c.name, students, schools);
              const isActive = c.id === selected.id;
              return (
                <button
                  key={c.id}
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
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-slate-600'}`}>{s.total}</div>
                    <div className="text-[10px] text-slate-400">students</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Main detail panel ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">

            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Counsellor profile header ──────────────────── */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                  <UserCheck className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-sm text-slate-500">EMCI Counsellor · {stats.schoolObjects.length} school{stats.schoolObjects.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* ── KPI row ──────────────────────────────────── */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatChip label="Total Students"  value={stats.total}      color="bg-primary/10 text-primary border-primary/20"          />
                <StatChip label="Active"          value={stats.active}     color="bg-emerald-50 text-emerald-700 border-emerald-200"      />
                <StatChip label="Completed"       value={stats.completed}  color="bg-emerald-50 text-emerald-700 border-emerald-200"      />
                <StatChip label="In Progress"     value={stats.inProgress} color="bg-primary/10 text-primary border-primary/20"          />
              </div>

              {/* ── Completion progress ───────────────────────── */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Programme Completion Rate</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{stats.pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    key={selected.id + '-bar'}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                  />
                </div>
                <div className="flex justify-between mt-2 text-[11px] text-slate-400">
                  <span>{stats.completed} completed out of {stats.total}</span>
                  <span>{stats.interviewed} interviewed · {stats.profiled} have Morrisby profile</span>
                </div>
              </div>

              {/* ── Stage breakdown ───────────────────────────── */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Students by Stage</span>
                </div>
                <div className="flex flex-col gap-3">
                  {stageBreakdown.map(({ stage, count }) => {
                    const c = STAGE_COLORS[stage];
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wider w-32 shrink-0 ${c.text}`}>
                          {STAGE_LABELS[stage]}
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <motion.div
                            key={selected.id + stage}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${c.bar}`}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-700 w-6 text-right shrink-0">{count}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider w-32 shrink-0 text-slate-400">Not Started</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <motion.div
                        key={selected.id + '-ns'}
                        initial={{ width: 0 }}
                        animate={{ width: stats.total > 0 ? `${Math.round(notStartedCount / stats.total * 100)}%` : '0%' }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full bg-slate-300"
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-400 w-6 text-right shrink-0">{notStartedCount}</span>
                  </div>
                </div>
              </div>

              {/* ── Student list ─────────────────────────────── */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

                {/* School filter */}
                {stats.schoolObjects.length > 1 && (
                  <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-500 shrink-0">Filter by school</span>

                    <SearchableDropdown
                      value={selectedSchoolId}
                      onChange={handleSelectSchool}
                      options={schoolDropdownOptions}
                      placeholder={`All schools (${stats.students.length})`}
                      searchPlaceholder="Search schools…"
                      emptyMessage="No schools match"
                      panelWidthClass="w-64"
                      triggerClassName="max-w-[240px]"
                    />

                    {selectedSchoolId !== 'all' && (
                      <AnimatePresence>
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => handleSelectSchool('all')}
                          className="text-[11px] text-slate-400 hover:text-slate-600 underline transition-colors"
                        >
                          Clear
                        </motion.button>
                      </AnimatePresence>
                    )}
                  </div>
                )}

                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Student Roster</span>
                  {selectedSchoolId !== 'all' && (
                    <span className="ml-auto text-[11px] text-primary font-semibold">
                      {rosterStudents.length} of {stats.students.length} students
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {rosterStudents.length === 0 ? (
                    <div className="py-10 text-center">
                      <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No students assigned.</p>
                    </div>
                  ) : (
                    rosterSlice.map(student => {
                      const stageCols = student.currentStage ? STAGE_COLORS[student.currentStage] : null;
                      const school = schools.find(s => s.id === (student as any).schoolId);
                      const rowClass = `flex items-center gap-4 px-5 py-3 w-full text-left transition-colors ${
                        showStudentJourney ? 'hover:bg-slate-50 cursor-pointer group' : ''
                      }`;
                      const rowContent = (
                        <>
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Circle className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold text-slate-800 ${showStudentJourney ? 'group-hover:text-primary transition-colors' : ''}`}>
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-slate-400">{school?.name ?? '—'} · {formatYearLevelLine(student)} · {student.morrisbyId}</div>
                          </div>
                          {student.currentStage && stageCols ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${stageCols.bg} ${stageCols.text} ${stageCols.border}`}>
                              {STAGE_LABELS[student.currentStage]}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic shrink-0">Not started</span>
                          )}
                          <div className="flex items-center gap-1 shrink-0 pointer-events-none">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${student.interviewed ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <Star className={`w-3.5 h-3.5 ${student.hasProfile ? 'text-amber-400' : 'text-slate-300'}`} />
                          </div>
                        </>
                      );
                      return showStudentJourney ? (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => navigate(`/student/${student.id}`)}
                          className={rowClass}
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div key={student.id} className={rowClass}>
                          {rowContent}
                        </div>
                      );
                    })
                  )}
                </div>
                {rosterStudents.length > 0 && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Showing{' '}
                      <span className="font-bold text-slate-900">{rosterShowingFrom}</span>
                      {' '}to{' '}
                      <span className="font-bold text-slate-900">{rosterShowingTo}</span>
                      {' '}of{' '}
                      <span className="font-bold text-slate-900">{rosterStudents.length}</span>
                      {' '}students
                    </p>
                    {totalRosterPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                          disabled={safeRosterPage === 1}
                          className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        {rosterPageNumbers.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRosterPage(n)}
                            className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                              n === safeRosterPage
                                ? 'bg-primary text-white'
                                : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
                          disabled={safeRosterPage === totalRosterPages}
                          className="px-3 py-1 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex gap-4 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Interviewed</div>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Has Morrisby profile</div>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
