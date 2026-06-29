import React from 'react';
import type { Student } from '../data/studentsData';

function FollowUpPill() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-200">
      Follow Up
    </span>
  );
}

function NeedsAttentionPill() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
      Needs Attention
    </span>
  );
}

/** Subtitle under roster student names: absences, session count, optional follow-up pill. */
export function StudentRosterNameMeta({
  student,
  showFollowUp,
  showNeedsAttention = false,
}: {
  student: Student;
  showFollowUp: boolean;
  showNeedsAttention?: boolean;
}) {
  const sessions = student.sessionCount ?? 0;

  return (
    <p className="text-xs text-slate-500 tabular-nums flex flex-wrap items-center gap-x-1 gap-y-1">
      <span>
        {student.absenceCount} absence{student.absenceCount !== 1 ? 's' : ''}
      </span>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <span>
        {sessions} session{sessions !== 1 ? 's' : ''}
      </span>
      {showNeedsAttention && (
        <>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <NeedsAttentionPill />
        </>
      )}
      {showFollowUp && (
        <>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <FollowUpPill />
        </>
      )}
    </p>
  );
}
