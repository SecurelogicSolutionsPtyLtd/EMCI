import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, TrendingUp,
  CheckCircle2, BookOpen, BarChart2, UserCheck, Building2,
  Star, Circle, ChevronDown, Search, X
} from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { School } from '../data/networkData';

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
  // Derive unique counsellor list from students
  const counsellors: DerivedCounsellor[] = Array.from(
    new Set(students.map(s => s.counsellor).filter(Boolean))
  ).map((name, i) => ({ id: `c-${i}`, name }));

  const [selected, setSelected] = useState<DerivedCounsellor>(counsellors[0] ?? { id: '', name: '' });
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');

  const stats = counsellorStats(selected.name, students, schools);

  // Reset school filter when counsellor changes
  function handleSelectCounsellor(c: DerivedCounsellor) {
    setSelected(c);
    setSelectedSchoolId('all');
  }

  // Filtered student list based on school dropdown
  const rosterStudents = useMemo(() => {
    if (selectedSchoolId === 'all') return stats.students;
    return stats.students.filter(s => (s as any).schoolId === selectedSchoolId);
  }, [stats.students, selectedSchoolId]);

  // Searchable school dropdown state
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSchoolDropdownOpen(false);
        setSchoolSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredSchoolOptions = useMemo(() => {
    const q = schoolSearch.toLowerCase().trim();
    if (!q) return stats.schoolObjects;
    return stats.schoolObjects.filter(sc => sc.name.toLowerCase().includes(q));
  }, [stats.schoolObjects, schoolSearch]);

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

                    {/* Custom searchable dropdown */}
                    <div ref={dropdownRef} className="relative">
                      <button
                        onClick={() => { setSchoolDropdownOpen(v => !v); setSchoolSearch(''); }}
                        className={`flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          selectedSchoolId !== 'all'
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="max-w-[200px] truncate">
                          {selectedSchoolName ?? `All schools (${stats.students.length})`}
                        </span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${schoolDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {schoolDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.12 }}
                            className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                          >
                            {/* Search input */}
                            <div className="px-2 pt-2 pb-1 border-b border-slate-100">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Search schools…"
                                  value={schoolSearch}
                                  onChange={e => setSchoolSearch(e.target.value)}
                                  className="w-full pl-6 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary/40 placeholder-slate-400"
                                />
                                {schoolSearch && (
                                  <button onClick={() => setSchoolSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Options list */}
                            <div className="max-h-52 overflow-y-auto py-1">
                              {!schoolSearch && (
                                <button
                                  onClick={() => { setSelectedSchoolId('all'); setSchoolDropdownOpen(false); setSchoolSearch(''); }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                                    selectedSchoolId === 'all' ? 'font-bold text-primary' : 'text-slate-700'
                                  }`}
                                >
                                  <span>All schools</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{stats.students.length}</span>
                                </button>
                              )}
                              {filteredSchoolOptions.length === 0 ? (
                                <p className="px-3 py-3 text-xs text-slate-400 text-center">No schools match</p>
                              ) : (
                                filteredSchoolOptions.map(sc => {
                                  const count = stats.students.filter(s => (s as any).schoolId === sc.id).length;
                                  const isActive = selectedSchoolId === sc.id;
                                  return (
                                    <button
                                      key={sc.id}
                                      onClick={() => { setSelectedSchoolId(sc.id); setSchoolDropdownOpen(false); setSchoolSearch(''); }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                                        isActive ? 'font-bold text-primary bg-primary/5' : 'text-slate-700'
                                      }`}
                                    >
                                      <span className="truncate">{sc.name}</span>
                                      <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-2">{count}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {selectedSchoolId !== 'all' && (
                      <AnimatePresence>
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => setSelectedSchoolId('all')}
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
                    rosterStudents.map(student => {
                      const stageCols = student.currentStage ? STAGE_COLORS[student.currentStage] : null;
                      const school = schools.find(s => s.id === (student as any).schoolId);
                      return (
                        <div key={student.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Circle className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800">{student.firstName} {student.lastName}</div>
                            <div className="text-xs text-slate-400">{school?.name ?? '—'} · Year {student.yearLevel || '—'} · {student.morrisbyId}</div>
                          </div>
                          {student.currentStage && stageCols ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${stageCols.bg} ${stageCols.text} ${stageCols.border}`}>
                              {STAGE_LABELS[student.currentStage]}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic shrink-0">Not started</span>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${student.interviewed ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <Star className={`w-3.5 h-3.5 ${student.hasProfile ? 'text-amber-400' : 'text-slate-300'}`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
