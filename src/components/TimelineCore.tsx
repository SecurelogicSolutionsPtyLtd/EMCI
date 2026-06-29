import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Circle, FileText, Compass, Award,
  User, X, AlignLeft, AlertTriangle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { deriveStudentEvents } from '../services/dataverse';
import type { SurveyField } from '../services/surveyFields';
import { RedactedText } from './ui/RedactedText';

interface TimelineCoreProps {
  student: Student | null;
  events?: TimelineEvent[];
}

// Stage 1 covers both stageProgress 1 (referral) and 2 (consent).
// Stage 2 = stageProgress 3 (career_guidance).
// Stage 3 = stageProgress 4 (complete).
const STAGES = [
  { id: 'step-1', number: 1, label: 'Referral & Consent', icon: FileText,  color: 'primary', eventIds: ['step-1', 'step-2'] },
  { id: 'step-3', number: 2, label: 'Career Guidance',    icon: Compass,   color: 'primary', eventIds: ['step-3']           },
  { id: 'step-4', number: 3, label: 'Complete',           icon: Award,     color: 'primary', eventIds: ['step-4']           },
];

const typeBadgeColor: Record<string, string> = {
  referral: 'bg-primary/10 text-primary border-primary/20',
  consent:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  session:  'bg-primary/10 text-primary border-primary/20',
  survey:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  absence:  'bg-amber-50 text-amber-700 border-amber-200',
};

const typeIconBg = 'bg-slate-100 text-slate-500';

export function TimelineCore({ student, events: propEvents }: TimelineCoreProps) {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [modalEvent, setModalEvent]   = useState<any | null>(null);

  const events    = propEvents ?? (student ? deriveStudentEvents(student) : []);
  const eventById = Object.fromEntries(events.map(e => [e.id, e]));

  const stageToIndex: Record<string, number> = {
    referral:        0,
    consent:         0,
    career_guidance: 1,
    complete:        2,
  };
  const currentStageIndex = student?.currentStage
    ? (stageToIndex[student.currentStage] ?? -1)
    : -1;

  const stage1Complete = (student?.stageProgress ?? 0) >= 2;

  const firstByType = {
    referral: events.find(e => e.type === 'referral'),
    consent:  events.find(e => e.type === 'consent'),
    session:  events.find(e => e.type === 'session'),
    survey:   events.find(e => e.type === 'survey'),
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Stage Tracker ───────────────────────────────────────── */}
      <div className="shrink-0 px-8 pt-8 pb-4 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 w-full text-center">Student Journey</h2>
        </div>

        {/* Circular stage nodes with connector lines */}
        <div className="flex items-start w-full mb-2">
          {STAGES.map((stage, i) => {
            const isStage1 = stage.id === 'step-1';
            const isMissingReferral = stage.id === 'step-1' && student?.currentStage === null;
            const hasOtherActivities = events.length > 0;

            const completed = isStage1
              ? stage1Complete
              : i <= currentStageIndex;
            const active = isStage1
              ? currentStageIndex === 0 && !stage1Complete
              : i === currentStageIndex;

            const isLast = i === STAGES.length - 1;
            const Icon   = stage.icon;

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                  className="relative flex flex-col items-center group cursor-pointer flex-1"
                >
                  {/* Connector line (extends right from center of this node) */}
                  {!isLast && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-[2px] transition-colors duration-300
                        ${(completed || (isStage1 && active)) ? 'bg-primary' : 'bg-slate-200'}`}
                    />
                  )}

                  {/* Circle node */}
                  <div
                    className={`size-10 rounded-full flex items-center justify-center z-10 border-4 border-white transition-all duration-200
                      ${isMissingReferral && hasOtherActivities
                        ? 'bg-orange-500 text-white ring-2 ring-orange-200'
                        : isMissingReferral
                          ? 'bg-amber-400 text-white ring-2 ring-amber-200'
                          : completed
                            ? 'bg-primary text-white ring-2 ring-primary/20'
                            : active
                              ? 'bg-primary text-white ring-2 ring-primary/20'
                              : 'bg-white text-slate-300 border-slate-200 ring-2 ring-slate-100'
                      }
                    `}
                  >
                    {isMissingReferral
                      ? <AlertTriangle className="w-5 h-5" />
                      : completed
                        ? <Check className="w-5 h-5" />
                        : <Icon className="w-5 h-5" />
                    }
                  </div>

                  {/* Label */}
                  <p
                    className={`mt-3 text-[11px] font-bold uppercase tracking-tight text-center leading-tight
                      ${isMissingReferral
                        ? (hasOtherActivities ? 'text-orange-600' : 'text-amber-600')
                        : active
                          ? 'text-primary'
                          : completed
                            ? 'text-slate-900'
                            : 'text-slate-400'
                      }`}
                  >
                    {stage.label}
                  </p>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Stage 1 missing referral — urgent banner */}
        {student?.currentStage === null && events.length > 0 && (
          <div className="mt-3 w-2/3 mx-auto flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 leading-relaxed">
              <strong>Stage 1 not completed.</strong> This student has{' '}
              {events.length} activit{events.length === 1 ? 'y' : 'ies'} recorded but
              no referral or consent has been logged — this is a programme requirement.
            </p>
          </div>
        )}

        {/* Stage detail expansion */}
        <AnimatePresence>
          {activeStage && (() => {
            const stage = STAGES.find(s => s.id === activeStage)!;

            if (activeStage === 'step-1') {
              const refEvent     = firstByType.referral;
              const consentEvent = firstByType.consent;
              if (!refEvent && !consentEvent) return null;
              return (
                <motion.div
                  key="stage-detail-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 w-2/3 mx-auto rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col gap-3 overflow-hidden"
                >
                  {refEvent && (
                    <div className="flex items-start gap-3">
                      <stage.icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">{refEvent.title}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Referral</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{format(parseISO(refEvent.date), 'dd MMM yyyy')}</span>
                        {refEvent.notes && (
                          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                            <RedactedText text={refEvent.notes} />
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {consentEvent && (
                    <div className={`flex items-start gap-3 ${refEvent ? 'pt-3 border-t border-primary/10' : ''}`}>
                      <stage.icon className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-emerald-700">{consentEvent.title}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Consent</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{format(parseISO(consentEvent.date), 'dd MMM yyyy')}</span>
                        {consentEvent.notes && (
                          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                            <RedactedText text={consentEvent.notes} />
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {refEvent && !consentEvent && (
                    <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                      <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="text-xs text-slate-400 italic">Consent not yet recorded</span>
                    </div>
                  )}
                </motion.div>
              );
            }

            const stageEventTypeMap: Record<string, keyof typeof firstByType> = {
              'step-3': 'session',
              'step-4': 'survey',
            };
            const event = firstByType[stageEventTypeMap[activeStage]];
            if (!event) return null;
            return (
              <motion.div
                key="stage-detail-other"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 w-2/3 mx-auto rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3 overflow-hidden"
              >
                <stage.icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-bold text-primary">{event.title}</span>
                  <span className="text-xs font-mono text-slate-400">{format(parseISO(event.date), 'dd MMM yyyy')}</span>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    <RedactedText text={event.notes} />
                  </p>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* ── Timeline Feed ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Section header */}
        <div className="flex items-center justify-between sticky top-0 bg-slate-50/95 backdrop-blur py-2 z-10 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Student Journey Timeline
          </h3>
        </div>

        {/* Timeline items */}
        <div className="ml-4">
          {[...events].reverse().map((event, idx) => {
            const isFirst = idx === 0;
            const isLast  = idx === events.length - 1;
            const iconBg  = typeIconBg;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.04 }}
                className={`relative pl-8 group ${isLast ? 'pb-2' : 'pb-6'} border-l-2 border-slate-200`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[11px] top-0 size-5 rounded-full bg-white border-2 transition-transform group-hover:scale-110
                    ${isFirst ? 'border-primary' : 'border-slate-200'}`}
                />

                {/* Card */}
                <div
                  onClick={() => setModalEvent(event)}
                  className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all duration-150
                    ${isFirst
                      ? 'border-slate-200 hover:border-primary/50 hover:shadow-md'
                      : 'border-slate-200 hover:border-primary/40 hover:shadow-md opacity-85 hover:opacity-100'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                          {event.title}
                        </h4>
                        {event.by && (
                          <p className="text-xs text-slate-500 truncate">
                            {event.by}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2 whitespace-nowrap">
                      {format(parseISO(event.date), 'MMM d, h:mm a')}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      <RedactedText text={event.description} />
                    </p>
                  )}

                  {/* Tags */}
                  {(event.type || event.status) && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {event.type && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize
                          ${typeBadgeColor[event.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {event.type}
                        </span>
                      )}
                      {event.status && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded text-[10px] font-bold">
                          {event.status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">No activities recorded</p>
              <p className="text-xs text-slate-400 mt-1">Events will appear here as the student progresses</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modalEvent && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
              onClick={() => setModalEvent(null)}
            />

            <motion.div
              key="modal"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10`}>
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{modalEvent.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{format(parseISO(modalEvent.date), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalEvent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                {/* Status & type badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {modalEvent.status && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {modalEvent.status}
                    </span>
                  )}
                  {modalEvent.type && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${typeBadgeColor[modalEvent.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {modalEvent.type}
                    </span>
                  )}
                </div>

                {/* By */}
                {modalEvent.by && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Recorded By</span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{modalEvent.by}</span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {modalEvent.description && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Description</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      <RedactedText text={modalEvent.description} />
                    </p>
                  </div>
                )}

                {/* Survey / Session fields */}
                {modalEvent.surveyFields && modalEvent.surveyFields.length > 0 ? (
                  <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      {modalEvent.type === 'session' ? 'Session Details' : 'Survey Responses'}
                    </span>
                    {(modalEvent.surveyFields as SurveyField[]).map((field, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</span>
                        <span className="text-sm text-slate-700 leading-relaxed">
                          <RedactedText text={field.value} />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : modalEvent.relatedSession ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Survey responses not yet recorded. Session context from the related counselling session:
                    </p>
                    <div className="flex flex-col gap-3 bg-primary/5 rounded-xl p-4 border border-primary/15">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                          Related Session
                        </span>
                        <span className="text-sm font-semibold text-slate-800">{modalEvent.relatedSession.title}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {format(parseISO(modalEvent.relatedSession.date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {modalEvent.relatedSession.fields.map((field, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</span>
                          <span className="text-sm text-slate-700 leading-relaxed">
                          <RedactedText text={field.value} />
                        </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* No structured fields — show description or empty state */
                  modalEvent.description && modalEvent.description !== 'No survey responses recorded yet.' ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Notes</span>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        <RedactedText text={modalEvent.description} />
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-400">No survey responses on record</p>
                      <p className="text-xs text-slate-300">The student has not yet completed this survey in Dataverse</p>
                    </div>
                  )
                )}

                {/* Dates */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Created</span>
                    <span className="font-mono">{format(parseISO(modalEvent.date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Last Modified</span>
                    <span className="font-mono">{format(parseISO(modalEvent.modifiedDate ?? modalEvent.date), 'dd MMM yyyy')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
