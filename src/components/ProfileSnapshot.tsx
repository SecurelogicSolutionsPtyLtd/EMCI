import { format, parseISO } from 'date-fns';
import {
  EyeOff, UserX, Mail, User2, CalendarX,
  UserCheck, BookOpen, Tag, School,
} from 'lucide-react';
import { type Student, formatYearLevelLine } from '../data/studentsData';
import { studentPseudonym } from '../lib/studentRedaction';

interface ProfileSnapshotProps {
  student: Student | null;
  schoolName?: string;
  hidePii?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Active:   { label: 'Active Guidance', className: 'bg-emerald-100 text-emerald-700' },
  Inactive: { label: 'Inactive',        className: 'bg-slate-100 text-slate-500' },
  Pending:  { label: 'Pending',         className: 'bg-amber-100 text-amber-700' },
};

function formatDeactivatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return iso; }
}

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'neutral';
}

function DetailRow({ icon: Icon, label, value, variant = 'default' }: DetailRowProps) {
  const bg = {
    default: 'bg-slate-50 border-slate-100',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-red-50 border-red-200',
    neutral: 'bg-slate-50 border-slate-100',
  };
  const iconColor = {
    default: 'text-slate-400',
    success: 'text-emerald-500',
    warning: 'text-red-500',
    neutral: 'text-slate-400',
  };
  const valueColor = {
    default: 'text-slate-800',
    success: 'text-emerald-700',
    warning: 'text-red-700',
    neutral: 'text-slate-500',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${bg[variant]}`}>
      <Icon className={`w-4 h-4 shrink-0 ${iconColor[variant]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 truncate ${valueColor[variant]}`} title={value}>{value}</p>
      </div>
    </div>
  );
}

export function ProfileSnapshot({ student, schoolName, hidePii = false }: ProfileSnapshotProps) {
  const firstName  = student?.firstName  ?? '—';
  const lastName   = student?.lastName   ?? '—';
  const preferred  = student?.preferredName ?? firstName;
  const counsellor = student?.counsellor ?? '—';
  const status     = student?.status     ?? 'Active';
  const avatar     = student?.avatar;
  const absences   = student?.absenceCount ?? 0;

  const statusCfg  = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' };

  const absenceVariant = absences > 5 ? 'warning' : absences > 0 ? 'default' : 'success';
  const absenceValue   = absences === 0
    ? 'None recorded'
    : absences > 5 ? `${absences} recorded — Flag for review` : `${absences} recorded`;

  const hasDeactivationInfo =
    student?.studentDeactivation != null ||
    student?.studentDeactivationLabel ||
    student?.studentDeactivationAt ||
    student?.studentDeactivationYearGroupSnapshot;

  return (
    <div className="flex flex-col bg-white">

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-5 flex items-center gap-4 border-b border-slate-100">
        <div
          className={`size-16 rounded-2xl shrink-0 overflow-hidden border-2 border-slate-100 shadow-sm
            ${avatar ? '' : 'bg-slate-100 flex items-center justify-center'}`}
          style={avatar ? { backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {!avatar && (
            hidePii
              ? <EyeOff className="w-7 h-7 text-slate-400" />
              : <span className="text-2xl font-bold text-slate-400 select-none">{firstName[0]}{lastName[0]}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-900 truncate leading-tight">
            {hidePii && student ? studentPseudonym(student.id) : `${firstName} ${lastName}`}
          </h1>
          {!hidePii && preferred && preferred !== firstName && (
            <p className="text-xs text-slate-400 mt-0.5">Preferred: {preferred}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Detail rows ── */}
      <div className="px-6 py-4 flex flex-col gap-2.5">

        {/* Absences — colour-coded prominence */}
        <DetailRow
          icon={CalendarX}
          label="Absences"
          value={absenceValue}
          variant={absenceVariant}
        />

        {/* School + year level */}
        {(schoolName || (!hidePii && student)) && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-100 bg-slate-50">
            <School className="w-4 h-4 shrink-0 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">School</p>
              <p className="text-sm font-semibold text-slate-800 leading-snug mt-0.5">
                {schoolName ?? '—'}
              </p>
            </div>
            {!hidePii && student && (
              <span className="shrink-0 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                {formatYearLevelLine(student)}
              </span>
            )}
          </div>
        )}

        {/* Career interview */}
        <DetailRow
          icon={UserCheck}
          label="Career Interview"
          value={student?.interviewed ? 'Completed' : 'Not yet conducted'}
          variant={student?.interviewed ? 'success' : 'neutral'}
        />

        {/* Morrisby profile */}
        <DetailRow
          icon={BookOpen}
          label="Morrisby Profile"
          value={student?.hasProfile ? 'Available' : 'Not available'}
          variant={student?.hasProfile ? 'success' : 'neutral'}
        />

        {/* Student type */}
        <DetailRow
          icon={Tag}
          label="Student Type"
          value={student?.studentType ?? '—'}
        />

        {/* Counsellor */}
        {!hidePii && (
          <DetailRow
            icon={User2}
            label="Counsellor"
            value={counsellor}
          />
        )}

        {/* Email */}
        {!hidePii && student?.email && (
          <DetailRow
            icon={Mail}
            label="Email"
            value={student.email}
          />
        )}

      </div>

      {/* ── Deactivation panel ── */}
      {hasDeactivationInfo && (
        <div className="mx-6 mb-5 p-4 rounded-xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <UserX className="w-3.5 h-3.5 text-slate-400" />
            Deactivation
          </div>
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-xs text-slate-500 shrink-0">Reason</dt>
              <dd className="text-xs text-slate-800 font-semibold text-right">{student?.studentDeactivationLabel ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-xs text-slate-500 shrink-0">Recorded</dt>
              <dd className="text-xs text-slate-700 text-right">{formatDeactivatedAt(student?.studentDeactivationAt)}</dd>
            </div>
            {!hidePii && (
              <div className="flex justify-between gap-2">
                <dt className="text-xs text-slate-500 shrink-0">Year group (at exit)</dt>
                <dd className="text-xs text-slate-700 text-right">{student?.studentDeactivationYearGroupSnapshot ?? '—'}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

    </div>
  );
}
