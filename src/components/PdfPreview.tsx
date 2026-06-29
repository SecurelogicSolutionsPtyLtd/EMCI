import React from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import {
  ChevronLeft, Printer, FileDown, Info, Loader2,
  Flag, TrendingUp, CalendarDays, Target, Star, Users, Briefcase,
  FileText, ClipboardList, Landmark, type LucideIcon,
} from 'lucide-react';
import type { Student } from '../data/studentsData';
import { exportElementToPdf } from '../lib/exportElementToPdf';
import { EMCI_BRAND } from '../lib/programNaming';

// ── Public data shapes ───────────────────────────────────────────────────────

export interface PdfStudentVoiceQuote {
  text:      string;
  source:    string;
  meta:      string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PdfNextAction {
  title:  string;
  detail: string;
}

interface PdfPreviewProps {
  studentName:       string;
  studentId:         string;
  schoolName:        string;
  counsellor:        string;
  /** Display line for year / cohort (same copy as the student profile). */
  yearLevelDisplay:  string;
  studentType:       string;
  status:            Student['status'];
  /** Programme stage display label (e.g. "Career Guidance"). */
  stageLabel:        string;
  trackingScore:     number | null;
  attendancePct:     number;
  absenceCount:      number;
  sessionsCompleted: number;
  workReadiness:     number | null;
  careerInterest:    string | null;
  strength:          string | null;
  counsellorSummary: string | null;
  studentVoice:      PdfStudentVoiceQuote[];
  nextAction:        PdfNextAction | null;
  onBack:            () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

const STATUS_TEXT: Record<Student['status'], string> = {
  Active:   'text-emerald-600',
  Pending:  'text-amber-600',
  Inactive: 'text-slate-500',
};

// ── Stat card (top row) ──────────────────────────────────────────────────────

function StatCard({
  Icon, label, value, suffix, sub,
}: {
  Icon:    LucideIcon;
  label:   string;
  value:   string;
  suffix?: string;
  sub?:    string;
}) {
  return (
    <div className="flex flex-col items-center justify-start text-center px-3 py-5">
      <span className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-slate-500" strokeWidth={2} />
      </span>
      <p className="text-[11px] text-slate-500 mb-1.5">{label}</p>
      <p className="leading-none">
        <span className="text-xl font-bold text-primary">{value}</span>
        {suffix && <span className="text-sm font-medium text-slate-400 ml-1">{suffix}</span>}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Key detail (middle row) ──────────────────────────────────────────────────

function KeyDetail({
  Icon, label, value, suffix, sub,
}: {
  Icon:    LucideIcon;
  label:   string;
  value:   string;
  suffix?: string;
  sub?:    string;
}) {
  return (
    <div className="flex flex-col items-center justify-start text-center px-2">
      <Icon className="w-5 h-5 text-slate-500 mb-2.5" strokeWidth={1.75} />
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className="leading-none">
        <span className="text-base font-bold text-primary">{value}</span>
        {suffix && <span className="text-xs font-medium text-slate-400 ml-0.5">{suffix}</span>}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-4">
      {title}
    </h3>
  );
}

// ── Student voice quote ──────────────────────────────────────────────────────

function QuoteBlock({ quote }: { quote: PdfStudentVoiceQuote }) {
  return (
    <div className="rounded-lg bg-[#f3f5fb] px-4 py-3.5">
      <p className="text-[13px] text-slate-700 italic leading-relaxed">
        <span className="text-primary font-bold not-italic mr-0.5">&ldquo;</span>
        {quote.text}&rdquo;
      </p>
      <p className="text-[11px] mt-2">
        <span className="text-slate-500">{quote.source}</span>
        {quote.meta && (
          <>
            <span className="text-slate-300 mx-1.5">·</span>
            <span className="text-slate-400">{quote.meta}</span>
          </>
        )}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PdfPreview(props: PdfPreviewProps) {
  const {
    studentName, studentId, schoolName, counsellor, yearLevelDisplay,
    studentType, status, stageLabel, trackingScore, attendancePct, absenceCount,
    sessionsCompleted, workReadiness, careerInterest, strength,
    counsellorSummary, studentVoice, nextAction, onBack,
  } = props;

  const generatedDate = format(new Date(), 'dd MMM yyyy');
  const absenceLine = `${absenceCount} absence${absenceCount === 1 ? '' : 's'} recorded`;
  const summaryParagraphs = (counsellorSummary ?? '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  const pageRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    if (!pageRef.current) return;
    setExporting(true);
    try {
      const safeName = studentName.replace(/[^\w-]+/g, '_');
      await exportElementToPdf(pageRef.current, `${safeName}_EMCI_Student_Summary.pdf`);
    } finally {
      setExporting(false);
    }
  }, [studentName]);

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
          <h1 className="text-base font-black tracking-tight text-slate-900">Student Summary</h1>
          <p className="text-[11px] text-slate-400">Official {EMCI_BRAND} summary for parent/stakeholder review</p>
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
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all rounded-xl shadow-lg shadow-primary/20 disabled:opacity-60 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* ── A4 page ─────────────────────────────────────────────── */}
      <div className="flex-1 flex justify-center py-10 px-4">
        <motion.div
          ref={pageRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="a4-page shadow-2xl rounded-sm bg-white text-slate-800 relative overflow-hidden flex flex-col"
          style={{ width: '210mm', height: '297mm', padding: '16mm 18mm', margin: '0 auto' }}
        >

          {/* ── Header ─────────────────────────────────────────────── */}
          <header className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img src="/emci-logo-lockup.png" alt={EMCI_BRAND} className="h-9 w-auto" />
              <div className="border-l border-slate-200 pl-4 leading-snug">
                <p className="text-[11px] font-semibold text-slate-700">Enhanced My Career Insights</p>
                <p className="text-[11px] font-semibold text-primary">(Pilot Program)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full border-2 border-primary/30 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </span>
              <div className="text-right leading-tight">
                <p className="text-sm font-bold text-slate-800">EMCI Student Summary</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Generated: {generatedDate}</p>
              </div>
            </div>
          </header>
          <div className="h-0.5 bg-primary rounded-full mt-4 mb-6" />

          {/* ── Identity + stat cards ──────────────────────────────── */}
          <section className="flex gap-8 mb-5">
            <div className="w-[38%] shrink-0 pt-1">
              <h2 className="text-[26px] font-bold text-slate-900 leading-tight mb-4">{studentName}</h2>
              <div className="space-y-2 text-[13px]">
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">{yearLevelDisplay}</span>
                  <span className="text-slate-300 mx-1.5">•</span>
                  {schoolName}
                </p>
                <p className="text-slate-500">Student ID: <span className="text-slate-700">{studentId}</span></p>
                <p className="text-slate-500">Counsellor: <span className="text-slate-700">{counsellor}</span></p>
                <p className="text-slate-500">
                  Student Type: <span className="text-slate-700">{orDash(studentType)}</span>
                  <span className="text-slate-300 mx-1.5">•</span>
                  Status: <span className={`font-semibold ${STATUS_TEXT[status]}`}>{status}</span>
                </p>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-3 divide-x divide-slate-200">
              <StatCard Icon={Flag} label="Programme Stage" value={orDash(stageLabel)} />
              <StatCard Icon={TrendingUp} label="Tracking Score" value={orDash(trackingScore)} suffix="/ 100" />
              <StatCard Icon={CalendarDays} label="Attendance" value={`${attendancePct}%`} sub={absenceLine} />
            </div>
          </section>

          {/* ── Key details ────────────────────────────────────────── */}
          <section className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-5">
            <SectionLabel title="Key Details" />
            <div className="grid grid-cols-5 divide-x divide-slate-200">
              <KeyDetail Icon={Target} label="Career Interest" value={orDash(careerInterest)} />
              <KeyDetail Icon={Star} label="Strength" value={orDash(strength)} />
              <KeyDetail Icon={Users} label="Sessions Completed" value={orDash(sessionsCompleted)} />
              <KeyDetail Icon={CalendarDays} label="Attendance" value={`${attendancePct}%`} sub={`${absenceCount} absence${absenceCount === 1 ? '' : 's'}`} />
              <KeyDetail Icon={Briefcase} label="Work Readiness" value={orDash(workReadiness)} suffix="/ 100" />
            </div>
          </section>

          {/* ── Counsellor summary + student voice ─────────────────── */}
          <section className="grid grid-cols-2 gap-8 mb-5">
            <div>
              <SectionLabel title="Counsellor Summary" />
              {summaryParagraphs.length > 0 ? (
                <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
                  {summaryParagraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 italic leading-relaxed">
                  An EMCI counsellor summary has not yet been generated for this student.
                </p>
              )}
            </div>
            <div>
              <SectionLabel title="Student Voice" />
              {studentVoice.length > 0 ? (
                <div className="space-y-3">
                  {studentVoice.map((q, i) => <QuoteBlock key={i} quote={q} />)}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 italic leading-relaxed">
                  No student voice has been captured from surveys or session feedback yet.
                </p>
              )}
            </div>
          </section>

          {/* ── Next action ────────────────────────────────────────── */}
          {nextAction && (
            <section className="flex items-center gap-5 rounded-xl bg-primary/5 border border-primary/15 px-5 py-4">
              <div className="flex items-center gap-3 shrink-0">
                <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-white" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Next Action</span>
              </div>
              <div className="border-l border-primary/15 pl-5">
                <p className="text-sm font-bold text-slate-800">{nextAction.title}</p>
                {nextAction.detail && (
                  <p className="text-[12px] text-slate-500 mt-0.5">{nextAction.detail}</p>
                )}
              </div>
            </section>
          )}

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Landmark className="w-4 h-4 text-slate-400" />
            Department of Education
          </div>
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
