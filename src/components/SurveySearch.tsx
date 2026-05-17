import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Search, ClipboardList, User, Calendar,
  CheckCircle2, Clock, AlertCircle, X, ChevronDown, ChevronUp,
  FileSearch, Info,
} from 'lucide-react';
import { type Student, formatYearLevelLine } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';

interface SurveySearchProps {
  students: Student[];
  studentEventsMap: Record<string, TimelineEvent[]>;
  onBack: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function surveyTypeLabel(title: string): { label: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes('initial') && t.includes('2026'))   return { label: 'Initial 2026',       color: 'bg-blue-100 text-blue-700 border-blue-200'   };
  if (t.includes('initial'))                         return { label: 'Initial',             color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
  if (t.includes('mid'))                             return { label: 'Mid-Pilot',           color: 'bg-amber-100 text-amber-700 border-amber-200'   };
  if (t.includes('end') && t.includes('2026'))       return { label: 'End of Pilot 2026',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (t.includes('end'))                             return { label: 'End of Pilot',        color: 'bg-teal-100 text-teal-700 border-teal-200'     };
  return { label: 'Survey', color: 'bg-slate-100 text-slate-600 border-slate-200' };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'Completed') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Completed
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        <Clock className="w-2.5 h-2.5" />
        Pending
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
      <AlertCircle className="w-2.5 h-2.5" />
      {status}
    </span>
  );
}

function SurveyCard({ event, index }: { event: TimelineEvent; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const { label, color } = surveyTypeLabel(event.title);
  const hasFields = (event.surveyFields?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
    >
      {/* Card header */}
      <button
        className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${color}`}>
              {label}
            </span>
            <StatusBadge status={event.status} />
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{event.title}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3" />
              {formatDate(event.date)}
            </span>
            {event.by && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <User className="w-3 h-3" />
                {event.by}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 mt-0.5 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-100">
              {/* Description */}
              {event.description && event.description !== 'No survey responses recorded yet.' && (
                <p className="text-xs text-slate-500 mt-3 mb-3 italic leading-relaxed">
                  {event.description}
                </p>
              )}

              {hasFields ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {event.surveyFields!.map((f, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5 leading-tight">
                        {f.label}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 leading-snug">
                        {f.value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  No survey response data available for this record.
                </div>
              )}

              {/* Notes */}
              {event.notes && event.notes.trim() && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Notes</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{event.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function SurveySearch({ students, studentEventsMap, onBack }: SurveySearchProps) {
  const [search, setSearch]               = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [surveyFilter, setSurveyFilter]   = useState<string>('all');

  // Filtered student list
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.preferredName?.toLowerCase().includes(q) ||
      s.morrisbyId?.toLowerCase().includes(q) ||
      String(s.yearLevel).includes(q) ||
      (s.yearLevelLabel?.toLowerCase().includes(q) ?? false) ||
      formatYearLevelLine(s).toLowerCase().includes(q),
    );
  }, [students, search]);

  // Survey events for the selected student
  const allSurveyEvents = useMemo(() => {
    if (!selectedStudent) return [];
    const events = studentEventsMap[selectedStudent.id] ?? [];
    return events.filter(e => e.type === 'survey');
  }, [selectedStudent, studentEventsMap]);

  // Unique survey type labels for the filter bar
  const availableSurveyTypes = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const e of allSurveyEvents) {
      const { label } = surveyTypeLabel(e.title);
      if (!seen.has(label)) { seen.add(label); labels.push(label); }
    }
    return labels;
  }, [allSurveyEvents]);

  // Apply filter
  const visibleEvents = useMemo(() => {
    if (surveyFilter === 'all') return allSurveyEvents;
    return allSurveyEvents.filter(e => surveyTypeLabel(e.title).label === surveyFilter);
  }, [allSurveyEvents, surveyFilter]);

  function handleSelectStudent(s: Student) {
    setSelectedStudent(s);
    setSurveyFilter('all');
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          DevLab
        </button>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-800">Survey Search</span>
        </div>
        <div className="ml-auto text-xs text-slate-400 font-mono">
          {students.length} students · {Object.values(studentEventsMap).flat().filter(e => e.type === 'survey').length} surveys
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel: student selector ────────────────────────── */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="shrink-0 px-3 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-xs text-slate-400 gap-1.5">
                <Search className="w-5 h-5" />
                No students match
              </div>
            ) : (
              filteredStudents.map(s => {
                const isActive = selectedStudent?.id === s.id;
                const surveyCount = (studentEventsMap[s.id] ?? []).filter(e => e.type === 'survey').length;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      isActive ? 'bg-violet-50 border-l-2 border-l-violet-400' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-violet-600">
                        {s.firstName[0]}{s.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-violet-700' : 'text-slate-800'}`}>
                        {s.firstName} {s.lastName}
                        {s.preferredName && s.preferredName !== s.firstName && (
                          <span className="font-normal text-slate-400"> ({s.preferredName})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{formatYearLevelLine(s)}</p>
                    </div>
                    {surveyCount > 0 && (
                      <span className={`shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                        isActive ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {surveyCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel: survey results ─────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
                <FileSearch className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Select a student</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Choose a student from the list on the left to view their survey responses.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Student info bar */}
              <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-violet-600">
                      {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                      {selectedStudent.preferredName && selectedStudent.preferredName !== selectedStudent.firstName && (
                        <span className="font-normal text-slate-400 ml-1">({selectedStudent.preferredName})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 truncate max-w-[14rem]" title={formatYearLevelLine(selectedStudent)}>
                        {formatYearLevelLine(selectedStudent)}
                      </span>
                      <span className="text-[11px] text-slate-400">·</span>
                      <span className="text-[11px] text-slate-500">{selectedStudent.counsellor}</span>
                      <span className="text-[11px] text-slate-400">·</span>
                      <span className={`text-[11px] font-semibold capitalize ${
                        selectedStudent.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {selectedStudent.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-mono">
                    {allSurveyEvents.length} survey{allSurveyEvents.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => { setSelectedStudent(null); setSurveyFilter('all'); }}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Survey type filter tabs */}
              {availableSurveyTypes.length > 1 && (
                <div className="shrink-0 bg-white border-b border-slate-100 px-4 flex items-center gap-1 overflow-x-auto py-2">
                  <button
                    onClick={() => setSurveyFilter('all')}
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      surveyFilter === 'all'
                        ? 'bg-violet-500 text-white border-violet-500'
                        : 'text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                    }`}
                  >
                    All ({allSurveyEvents.length})
                  </button>
                  {availableSurveyTypes.map(t => {
                    const count = allSurveyEvents.filter(e => surveyTypeLabel(e.title).label === t).length;
                    const { color } = surveyTypeLabel(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setSurveyFilter(t)}
                        className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          surveyFilter === t
                            ? 'bg-violet-500 text-white border-violet-500'
                            : `${color} hover:border-violet-300`
                        }`}
                      >
                        {t} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Surveys list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <AnimatePresence mode="wait">
                  {visibleEvents.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-48 gap-3"
                    >
                      <ClipboardList className="w-8 h-8 text-slate-300" />
                      <p className="text-sm text-slate-400">
                        {allSurveyEvents.length === 0
                          ? 'No survey records found for this student.'
                          : `No surveys match the "${surveyFilter}" filter.`}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="surveys" className="space-y-3">
                      {visibleEvents.map((event, i) => (
                        <SurveyCard key={event.id} event={event} index={i} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
