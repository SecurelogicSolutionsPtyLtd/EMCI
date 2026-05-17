import React from 'react';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import {
  ChevronLeft, Printer, FileDown, CheckCircle2, Circle,
  Info,
} from 'lucide-react';
import type { TimelineEvent } from '../services/dataverse';
import type { StageKey } from '../data/studentsData';

interface PdfPreviewProps {
  studentName: string;
  morrisbyId: string;
  schoolName: string;
  counsellor: string;
  /** Display line for year / cohort (same copy as student profile / Dataverse label). */
  yearLevelDisplay: string;
  currentStage: StageKey | null;
  stageProgress: number;
  events: TimelineEvent[];
  onBack: () => void;
}

// ── Stage config ───────────────────────────────────────────────────────────

const PROGRAMME_STAGES = [
  { key: 'referral',        label: 'Referral',        sub: 'EMCI Referral'           },
  { key: 'consent',         label: 'Consent',         sub: 'Consent Obtained'        },
  { key: 'career_guidance', label: 'Career Guidance', sub: 'Morrisby Session'        },
  { key: 'complete',        label: 'Complete',        sub: 'End of Pilot Survey'     },
] as const;

const STAGE_ORDER: Record<string, number> = {
  referral: 0, consent: 1, career_guidance: 2, complete: 3,
};

// ── Small helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return '—'; }
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2);
}

// ── Attendance donut ───────────────────────────────────────────────────────

function AttendanceDonut({ pct }: { pct: number }) {
  const r = 15.9155;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="18" cy="18" r={r} fill="none"
            stroke="#ec5b13" strokeWidth="3"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none text-slate-800">{pct}%</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">On Time</span>
        </div>
      </div>
    </div>
  );
}

// ── Academic bar chart ─────────────────────────────────────────────────────

const ACADEMIC_BARS = [
  { month: 'Aug', h: 60 },
  { month: 'Oct', h: 75 },
  { month: 'Dec', h: 65 },
  { month: 'Feb', h: 85 },
  { month: 'Apr', h: 70 },
  { month: 'Jun', h: 92 },
];

function AcademicBars() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-1 h-24 px-2">
        {ACADEMIC_BARS.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={`w-full rounded-t-sm ${i === ACADEMIC_BARS.length - 1 || i === 3 ? 'bg-primary' : 'bg-primary/25'}`}
              style={{ height: `${b.h}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between px-2 text-[9px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-1">
        {ACADEMIC_BARS.map(b => <span key={b.month}>{b.month}</span>)}
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4 border-l-4 border-primary pl-3 leading-none">
      {title}
    </h3>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === 'completed'
    ? 'bg-emerald-100 text-emerald-700'
    : s === 'pending'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-slate-100 text-slate-500';
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function PdfPreview({
  studentName, morrisbyId, schoolName, counsellor,
  yearLevelDisplay, currentStage, stageProgress, events, onBack,
}: PdfPreviewProps) {
  const generatedDate = format(new Date(), 'dd MMM yyyy');
  const currentStageOrder = currentStage ? (STAGE_ORDER[currentStage] ?? -1) : -1;

  // Survey events for the activity log
  const surveyEvents = events.filter(e => e.type === 'survey' && (e.surveyFields?.length ?? 0) > 0);
  const sessionEvents = events.filter(e => e.type === 'session');
  const allLogEvents = [...events].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 8);

  // Counts
  const surveyCount  = events.filter(e => e.type === 'survey').length;
  const sessionCount = sessionEvents.length;
  const absenceCount = events.filter(e => e.type === 'absence').length;
  const attendancePct = absenceCount > 0 ? Math.max(60, 100 - absenceCount * 5) : 96;

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col">

      {/* ── Toolbar (no-print) ───────────────────────────────────── */}
      <div className="no-print shrink-0 sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <button onClick={onBack} className="flex items-center gap-1 hover:text-primary transition-colors group">
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Student Journey
            </button>
            <span>/</span>
            <span className="text-primary font-semibold">PDF Export</span>
          </nav>
          <h1 className="text-base font-black tracking-tight text-slate-900">Student Progress Report</h1>
          <p className="text-[11px] text-slate-400">Comprehensive evaluation for parent/stakeholder review</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all rounded-xl shadow-lg shadow-primary/20"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── A4 page ─────────────────────────────────────────────── */}
      <div className="flex-1 flex justify-center py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="a4-page shadow-2xl rounded-sm bg-white text-slate-800 relative overflow-hidden"
          style={{ width: '210mm', minHeight: '297mm', padding: '20mm', margin: '0 auto' }}
        >

          {/* ── Report header ─────────────────────────────────────── */}
          <div className="flex justify-between items-start border-b-2 border-primary/20 pb-8 mb-8">
            <div className="flex gap-6 items-center">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-xl overflow-hidden border-2 border-slate-100 bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl font-black text-primary">{initials(studentName)}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 leading-tight">{studentName}</h2>
                <p className="text-base text-primary font-semibold mt-0.5">
                  {yearLevelDisplay} &nbsp;·&nbsp; Student ID: {morrisbyId}
                </p>
                <p className="text-slate-500 text-sm mt-0.5">{schoolName}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 text-primary mb-1">
                <div className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-primary rounded-[1px]" />
                  ))}
                </div>
                <span className="font-black tracking-tighter text-sm">EMCI</span>
              </div>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Official Progress Report</p>
              <p className="text-[10px] text-slate-400 mt-1">Generated: {generatedDate}</p>
            </div>
          </div>

          {/* ── Stage timeline ────────────────────────────────────── */}
          <section className="mb-10">
            <SectionHeading title="Stage Timeline" />
            <div className="grid grid-cols-4 gap-2 relative">
              {/* Connector line */}
              <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-slate-100 z-0" />
              {PROGRAMME_STAGES.map((stage, i) => {
                const completed  = i < currentStageOrder || currentStage === 'complete';
                const active     = stage.key === currentStage && currentStage !== 'complete';
                const upcoming   = !completed && !active;
                return (
                  <div key={stage.key} className="relative z-10 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm ${
                      completed ? 'bg-primary text-white' :
                      active    ? 'bg-white border-2 border-primary text-primary' :
                                  'bg-slate-50 border-2 border-slate-200 text-slate-300'
                    }`}>
                      {completed
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <Circle className="w-4 h-4" />
                      }
                    </div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-primary' : 'text-slate-400'}`}>
                      {stage.label}
                    </p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${
                      completed ? 'text-slate-700' : active ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {completed ? 'Completed' : active ? 'Active Stage' : 'Upcoming'}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Academic & Attendance ─────────────────────────────── */}
          <section className="mb-10 grid grid-cols-2 gap-8">
            <div>
              <SectionHeading title="Academic Trends" />
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <AcademicBars />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 italic">
                Programme engagement trend · Counsellor: <span className="text-primary font-bold">{counsellor}</span>
              </p>
            </div>
            <div>
              <SectionHeading title="Attendance" />
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex items-center justify-center" style={{ minHeight: '100px' }}>
                <AttendanceDonut pct={attendancePct} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 italic">
                Absences recorded: <span className="text-primary font-bold">{absenceCount}</span>
                &nbsp;·&nbsp; Sessions attended: <span className="text-primary font-bold">{sessionCount}</span>
              </p>
            </div>
          </section>

          {/* ── Work readiness checklist ──────────────────────────── */}
          <section className="mb-10 bg-slate-50 rounded-xl p-6 border border-slate-100">
            <SectionHeading title="Work Readiness Checklist" />
            <div className="grid grid-cols-3 gap-6">

              {/* Programme milestones */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Programme Milestones</p>
                <ul className="space-y-2">
                  {[
                    { label: 'Referral obtained',   done: (stageProgress ?? 0) >= 1 },
                    { label: 'Consent obtained',    done: (stageProgress ?? 0) >= 2 },
                    { label: 'Guidance session',    done: (stageProgress ?? 0) >= 3 },
                    { label: 'End survey completed',done: currentStage === 'complete' },
                  ].map(item => (
                    <li key={item.label} className={`flex items-center gap-2 text-[11px] ${item.done ? '' : 'text-slate-400'}`}>
                      {item.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      }
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Surveys completed */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Survey Records</p>
                {surveyEvents.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No survey records found.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {surveyEvents.map(ev => (
                      <span key={ev.id} className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-semibold text-slate-600">
                        {ev.title.replace('EMCI ', '').replace(' Survey', '')}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-2">{surveyCount} total survey{surveyCount !== 1 ? 's' : ''}</p>
              </div>

              {/* Programme progress */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Programme Progress</p>
                <div className="space-y-3">
                  {[
                    { label: 'Stages',   value: Math.min(stageProgress, 4), max: 4 },
                    { label: 'Sessions', value: Math.min(sessionCount, 5),  max: 5 },
                    { label: 'Surveys',  value: Math.min(surveyCount, 3),   max: 3 },
                  ].map(bar => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-slate-500">{bar.label}</span>
                        <span className="font-bold text-slate-700">{bar.value}/{bar.max}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${(bar.value / bar.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Activity log ──────────────────────────────────────── */}
          <section className="mb-10">
            <SectionHeading title="Recent Activity Log" />
            <div className="overflow-hidden border border-slate-100 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[9px]">
                  <tr>
                    <th className="px-4 py-2 border-b border-slate-100">Date</th>
                    <th className="px-4 py-2 border-b border-slate-100">Activity</th>
                    <th className="px-4 py-2 border-b border-slate-100">Description</th>
                    <th className="px-4 py-2 border-b border-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allLogEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">No activity records found.</td>
                    </tr>
                  ) : (
                    allLogEvents.map(ev => (
                      <tr key={ev.id}>
                        <td className="px-4 py-2.5 text-slate-400 font-mono whitespace-nowrap">{formatDate(ev.date)}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{ev.title}</td>
                        <td className="px-4 py-2.5 text-slate-500 italic leading-snug">
                          {ev.description?.slice(0, 60)}{(ev.description?.length ?? 0) > 60 ? '…' : ''}
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge status={ev.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Counsellor insights ───────────────────────────────── */}
          <section className="mb-10">
            <SectionHeading title="Counsellor Insights" />
            <div className="p-5 bg-primary/5 rounded-xl border border-primary/10 italic text-slate-700 leading-relaxed text-sm">
              "{studentName} {currentStage === 'complete'
                ? 'has successfully completed the full EMCI programme, progressing through all four stages. A post-programme review is recommended to monitor ongoing career readiness.'
                : currentStage === 'career_guidance'
                ? 'is currently engaged in career guidance sessions. Strong progress has been observed; continued support will help consolidate their post-school pathway.'
                : currentStage === 'consent'
                ? 'has provided consent and is ready to begin career guidance. Early engagement has been positive and counsellor sessions should be scheduled promptly.'
                : 'has been referred to the EMCI programme. Initial engagement steps are underway and next steps will be confirmed following consent.'
              }"
            </div>
            <div className="mt-5 flex justify-between items-end">
              <div className="border-t border-slate-300 pt-2 w-48">
                <p className="text-[11px] font-bold text-slate-700">{counsellor}</p>
                <p className="text-[9px] text-slate-400">EMCI Programme Counsellor</p>
              </div>
              <div className="text-[9px] text-slate-300 uppercase tracking-widest">Official EMCI Document</div>
            </div>
          </section>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="absolute bottom-6 left-[20mm] right-[20mm] flex justify-between text-[8px] text-slate-300 uppercase tracking-widest font-bold">
            <span>EMCI Platform · {new Date().getFullYear()} Progress Report</span>
            <span>Page 1 of 1</span>
            <span>Confidential Information</span>
          </div>

          {/* Side accent */}
          <div className="absolute top-0 right-0 w-1.5 h-full bg-primary/10" />
        </motion.div>
      </div>

      {/* ── Print tip (no-print) ─────────────────────────────────── */}
      <div className="no-print max-w-[210mm] mx-auto pb-10 px-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-blue-700">
          <Info className="w-4 h-4 shrink-0" />
          <p className="text-sm">
            For best results, print with <strong>No Margins</strong> and <strong>Background Graphics</strong> enabled in your browser print settings.
          </p>
        </div>
      </div>
    </div>
  );
}
