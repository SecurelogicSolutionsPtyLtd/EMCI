import React from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Clock, X, User, Info, MoreVertical, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Student, formatStudentTypeLabel, formatYearLevelLine } from '../data/studentsData';
import type { SurveyField } from '../services/surveyFields';
import { RedactedText } from './ui/RedactedText';
import { INACTIVE_STUDENT_SUMMARY } from '../lib/inactiveStudentCopy';
import { buildRedactedOverview } from '../lib/studentRedaction';

interface ContextPanelProps {
  student: Student | null;
  selectedEvent: any | null;
  onClose: () => void;
  hidePii?: boolean;
}

function ContextRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg border border-slate-100">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function BooleanDot({ value }: { value: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${value ? 'bg-green-500' : 'bg-slate-300'}`} />
      <span className="text-sm font-bold text-slate-900">{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

function buildOverview(student: Student | null): string {
  if (!student) return '—';
  if (student.status === 'Inactive') return INACTIVE_STUDENT_SUMMARY;
  const name = `${student.firstName} ${student.lastName}`.trim();
  const yearPhrase =
    !student.yearLevel && !student.yearLevelLabel?.trim()
      ? 'an unknown year level'
      : formatYearLevelLine(student);
  const stageMap: Record<string, string> = {
    referral:        'has recently been referred into the programme',
    consent:         'has completed the referral and is awaiting consent',
    career_guidance: 'is actively engaged in career guidance sessions',
    complete:        'has completed the full EMCI programme',
  };
  const stageStr = student.currentStage
    ? stageMap[student.currentStage] ?? 'is progressing through the programme'
    : 'has not yet started the programme';

  const suffix = student.interviewed
    ? ' An interview has been conducted.'
    : ' An interview has not yet been conducted.';

  return `${name} is a student in ${yearPhrase} ${stageStr}.${suffix}`;
}

function isBoilerplateReferralConsent(
  text: string,
  student: Student | null,
): boolean {
  if (!student) return false;
  const full = `${student.firstName} ${student.lastName}`.trim();
  return (
    text === `Initial referral received for ${full}.` ||
    text === `Parental consent obtained for ${full}.`
  );
}

export function ContextPanel({ student, selectedEvent, onClose, hidePii = false }: ContextPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <AnimatePresence mode="wait">
        {selectedEvent ? (
          <motion.div
            key="event-details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-5 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Event Details
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title + date */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedEvent.title}</h3>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {format(parseISO(selectedEvent.date), 'MMM d, yyyy — HH:mm')}
              </div>
            </div>

            {/* Status + Recorded By */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  selectedEvent.status === 'Completed' || selectedEvent.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {selectedEvent.status}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recorded By</span>
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-sm font-bold text-slate-900">{selectedEvent.by || '—'}</span>
                </div>
              </div>
            </div>

            {/* Survey responses / session details */}
            {selectedEvent.surveyFields && selectedEvent.surveyFields.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {selectedEvent.type === 'session' ? 'Session Details' : 'Survey Responses'}
                </span>
                <div className="flex flex-col gap-1.5">
                  {(selectedEvent.surveyFields as SurveyField[]).map((field, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        {field.label}
                      </span>
                      <span className="text-sm text-slate-800 font-medium leading-snug">
                        <RedactedText text={field.value} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description (only if it differs from notes) */}
            {selectedEvent.description &&
             selectedEvent.description !== selectedEvent.notes &&
             (hidePii || !isBoilerplateReferralConsent(selectedEvent.description, student)) && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Description</span>
                <p className="text-sm text-slate-700 leading-relaxed border-l-2 border-primary/30 pl-3 py-1">
                  <RedactedText text={selectedEvent.description} />
                </p>
              </div>
            )}

            {/* Notes */}
            {selectedEvent.notes &&
             (hidePii || !isBoilerplateReferralConsent(selectedEvent.notes, student)) && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                  {selectedEvent.type === 'session' ? 'Session Notes' : 'Notes'}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed border-l-2 border-primary/30 pl-3 py-1">
                  <RedactedText text={selectedEvent.notes} />
                </p>
              </div>
            )}

            {/* Linked Interventions */}
            {selectedEvent.linkedInterventions && selectedEvent.linkedInterventions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Linked Interventions</span>
                <ul className="flex flex-col gap-2">
                  {selectedEvent.linkedInterventions.map((intervention: string, idx: number) => (
                    <li key={idx} className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-2 rounded border border-slate-200/50">
                      <RedactedText text={intervention} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Actions */}
            {selectedEvent.recommendedActions && selectedEvent.recommendedActions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Recommended Actions
                </span>
                <ul className="flex flex-col gap-2">
                  {selectedEvent.recommendedActions.map((action: string, idx: number) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                      <span className="leading-tight">
                        <RedactedText text={action} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="default-context"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-6 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Information Context
              </h3>
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Student Overview */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                STUDENT OVERVIEW
              </label>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm leading-relaxed text-slate-700">
                {hidePii ? buildRedactedOverview(student) : buildOverview(student)}
              </div>
            </div>

            {/* Student Details */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                STUDENT DETAILS
              </label>
              <div className="flex flex-col gap-2">
                <ContextRow
                  label="Student Type"
                  value={student ? formatStudentTypeLabel(student.studentType) : '—'}
                />
                {!hidePii && (
                  <ContextRow
                    label="Year Level"
                    value={student ? formatYearLevelLine(student) : '—'}
                  />
                )}
                <div className="flex justify-between items-center p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Student Interviewed
                  </span>
                  <BooleanDot value={student?.interviewed ?? false} />
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Has Profile
                  </span>
                  <BooleanDot value={student?.hasProfile ?? false} />
                </div>
              </div>
            </div>

            {/* Footer hint */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center uppercase tracking-widest">
                Select an event on the timeline for details
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
