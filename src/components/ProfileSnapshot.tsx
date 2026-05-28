import React from 'react';
import { format, parseISO } from 'date-fns';
import { EyeOff, UserX } from 'lucide-react';
import { type Student, formatYearLevelLine } from '../data/studentsData';
import { studentPseudonym } from '../lib/studentRedaction';

interface ProfileSnapshotProps {
  student: Student | null;
  schoolName?: string;
  /** When true, hide structured PII (names, Morrisby, email, counsellor, year). */
  hidePii?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  Active:   'Active Guidance',
  Inactive: 'Inactive',
  Pending:  'Pending',
};

function formatDeactivatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM yyyy, h:mm a');
  } catch {
    return iso;
  }
}

export function ProfileSnapshot({
  student,
  schoolName,
  hidePii = false,
}: ProfileSnapshotProps) {
  const firstName  = student?.firstName    ?? '—';
  const lastName   = student?.lastName     ?? '—';
  const preferred  = student?.preferredName ?? firstName;
  const morrisbyId = student?.morrisbyId   ?? '—';
  const counsellor = student?.counsellor   ?? '—';
  const status     = student?.status       ?? 'Active';
  const avatar     = student?.avatar;

  const hasDeactivationInfo =
    student?.studentDeactivation != null ||
    student?.studentDeactivationLabel ||
    student?.studentDeactivationAt ||
    student?.studentDeactivationYearGroupSnapshot;

  return (
    <div className="flex flex-col h-full bg-white">

      <div className="p-6 flex flex-col gap-6">

        <div className="flex flex-col items-center text-center gap-4">
          <div
            className={`size-24 rounded-2xl border-4 border-white shadow-sm overflow-hidden
              ${avatar ? 'bg-cover bg-center' : 'bg-slate-100 flex items-center justify-center'}`}
            style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
          >
            {!avatar && (
              hidePii
                ? <EyeOff className="w-10 h-10 text-slate-400" />
                : (
                  <span className="text-3xl font-bold text-slate-400 select-none">
                    {firstName[0]}{lastName[0]}
                  </span>
                )
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {hidePii && student ? studentPseudonym(student.id) : `${firstName} ${lastName}`}
            </h1>
            <p className="text-slate-500 text-sm">
              {!hidePii && preferred && preferred !== firstName ? `Preferred: ${preferred} | ` : ''}
              {!hidePii && student ? formatYearLevelLine(student) : ''}
              {schoolName ? `${!hidePii && student ? ' · ' : ''}${schoolName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="space-y-3">
              {!hidePii && (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 uppercase font-semibold tracking-wider">Morrisby ID</span>
                    <span className="font-mono text-slate-700">{morrisbyId}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 uppercase font-semibold tracking-wider">Email</span>
                    <span className="text-slate-700 text-right max-w-[150px] truncate leading-tight" title={student?.email ?? '—'}>
                      {student?.email ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 uppercase font-semibold tracking-wider">Counsellor</span>
                    <span className="text-slate-700 text-right max-w-[130px] truncate leading-tight" title={counsellor}>
                      {counsellor}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 uppercase font-semibold tracking-wider">Absences</span>
                <span className="text-slate-700 tabular-nums font-medium">
                  {student?.absenceCount ?? 0} recorded
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 uppercase font-semibold tracking-wider">Status</span>
                <span className="text-primary font-bold">{STATUS_LABEL[status] ?? status}</span>
              </div>
            </div>
          </div>

          {hasDeactivationInfo && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <UserX className="w-4 h-4 text-slate-400" />
                Student deactivation
              </div>

              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">Reason</dt>
                  <dd className="text-slate-800 font-medium text-right">{student?.studentDeactivationLabel ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">Recorded</dt>
                  <dd className="text-slate-800 text-right">{formatDeactivatedAt(student?.studentDeactivationAt)}</dd>
                </div>
                {!hidePii && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 shrink-0">Year group (at exit)</dt>
                    <dd className="text-slate-800 text-right">{student?.studentDeactivationYearGroupSnapshot ?? '—'}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
