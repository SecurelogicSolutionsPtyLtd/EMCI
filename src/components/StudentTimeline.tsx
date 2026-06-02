import { useState, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { FileText, User, AlignLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TimelineEvent } from '../services/dataverse';
import type { SurveyField } from '../services/surveyFields';

// ── Safe date helpers ─────────────────────────────────────────────────────────

function safeParse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? d : null;
}

function safeFormat(dateStr: string | null | undefined, fmt: string, fallback = '—'): string {
  const d = safeParse(dateStr);
  return d ? format(d, fmt) : fallback;
}

// ── Type badge config ─────────────────────────────────────────────────────────

type EventType = TimelineEvent['type'];

const TYPE_LABEL: Record<EventType, string> = {
  referral: 'Referral',
  consent:  'Consent',
  session:  'Session',
  survey:   'Survey',
  absence:  'Absence',
  note:     'Note',
};

const TYPE_DOT: Record<EventType, string> = {
  referral: 'bg-primary',
  consent:  'bg-emerald-500',
  session:  'bg-primary',
  survey:   'bg-violet-500',
  absence:  'bg-amber-400',
  note:     'bg-slate-400',
};

const TYPE_BADGE: Record<EventType, string> = {
  referral: 'bg-primary/8 text-primary',
  consent:  'bg-emerald-50 text-emerald-700',
  session:  'bg-primary/8 text-primary',
  survey:   'bg-violet-50 text-violet-700',
  absence:  'bg-amber-50 text-amber-700',
  note:     'bg-slate-100 text-slate-600',
};

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: EventType | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Consent',  value: 'consent' },
  { label: 'Sessions', value: 'session' },
  { label: 'Surveys',  value: 'survey' },
  { label: 'Absences', value: 'absence' },
  { label: 'Notes',    value: 'note' },
];

// ── Group events by Month Year ────────────────────────────────────────────────

interface EventGroup {
  label: string;
  events: TimelineEvent[];
}

function groupByMonth(events: TimelineEvent[]): EventGroup[] {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const key = safeFormat(event.date, 'MMMM yyyy', 'Unknown date');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return Array.from(groups.entries()).map(([label, evts]) => ({ label, events: evts }));
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

interface DrawerProps {
  event: TimelineEvent;
  onClose: () => void;
}

function EventDrawer({ event, onClose }: DrawerProps) {
  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/20 z-40 cursor-pointer"
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 32 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[event.type]}`} />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 leading-snug">{event.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {safeFormat(event.date, 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Type + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${TYPE_BADGE[event.type]}`}>
              {TYPE_LABEL[event.type]}
            </span>
            {event.status && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {event.status}
              </span>
            )}
          </div>

          {/* Recorded by */}
          {event.by && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded by</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-3 h-3 text-slate-500" />
                </div>
                <span className="text-sm text-slate-700 font-medium">{event.by}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Survey / session fields */}
          {event.surveyFields && event.surveyFields.length > 0 ? (
            <div className="flex flex-col gap-3 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {event.type === 'session' ? 'Session Details' : 'Survey Responses'}
              </span>
              {(event.surveyFields as SurveyField[]).map((field, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">{field.label}</span>
                  <span className="text-sm text-slate-800 leading-relaxed">{field.value}</span>
                </div>
              ))}
            </div>
          ) : event.relatedSession ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500 leading-relaxed">
                Survey responses not yet recorded. Session context from the related counselling session:
              </p>
              <div className="flex flex-col gap-3 bg-primary/5 rounded-lg p-4 border border-primary/15">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Related Session
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{event.relatedSession.title}</span>
                  <span className="text-xs text-slate-500">
                    {safeFormat(event.relatedSession.date, 'dd MMM yyyy')}
                  </span>
                </div>
                {event.relatedSession.fields.map((field, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">{field.label}</span>
                    <span className="text-sm text-slate-800 leading-relaxed">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            event.notes && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</span>
                <p className="text-sm text-slate-700 leading-relaxed">{event.notes}</p>
              </div>
            )
          )}

          {/* Dates footer */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-auto">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Created</span>
              <span className="font-mono">{safeFormat(event.date, 'dd MMM yyyy')}</span>
            </div>
            {event.modifiedDate && event.modifiedDate !== event.date && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Modified</span>
                <span className="font-mono">{safeFormat(event.modifiedDate, 'dd MMM yyyy')}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface StudentTimelineProps {
  events: TimelineEvent[];
}

export function StudentTimeline({ events }: StudentTimelineProps) {
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [activeEvent, setActiveEvent] = useState<TimelineEvent | null>(null);

  const sorted = useMemo(
    () => [...events]
      .filter(e => e.type !== 'referral')
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [events],
  );

  const filtered = useMemo(
    () => (filter === 'all' ? sorted : sorted.filter(e => e.type === filter)),
    [sorted, filter],
  );

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  const availableTypes = useMemo(
    () => new Set(sorted.map(e => e.type)),
    [sorted],
  );

  const visibleFilters = FILTER_OPTIONS.filter(
    f => f.value === 'all' || availableTypes.has(f.value as EventType),
  );

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            Activity Timeline
          </h3>
          <span className="text-xs text-slate-500">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        {visibleFilters.length > 2 && (
          <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-100">
            {visibleFilters.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filter === opt.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Timeline feed */}
        <div className="px-6 py-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">No events recorded</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(group => (
                <div key={group.label}>
                  {/* Month label */}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    {group.label}
                  </p>

                  {/* Events */}
                  <div className="flex flex-col">
                    {group.events.map((event, idx) => {
                      const isLast = idx === group.events.length - 1;
                      return (
                        <div key={event.id} className="flex items-start gap-4 group">
                          {/* Dot + line */}
                          <div className="flex flex-col items-center shrink-0 pt-1">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125 ${TYPE_DOT[event.type]}`} />
                            {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1.5 mb-0 min-h-[24px]" />}
                          </div>

                          {/* Row content */}
                          <button
                            type="button"
                            onClick={() => setActiveEvent(event)}
                            className={`flex-1 flex items-baseline justify-between gap-3 text-left transition-opacity cursor-pointer ${isLast ? 'pb-0' : 'pb-5'} hover:opacity-75`}
                          >
                            <div className="flex items-baseline gap-2.5 min-w-0">
                              <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${TYPE_BADGE[event.type]} px-1.5 py-0.5 rounded`}>
                                {TYPE_LABEL[event.type]}
                              </span>
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {event.title}
                              </span>
                              {event.by && (
                                <span className="text-xs text-slate-500 truncate hidden sm:block">
                                  · {event.by}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                              {safeFormat(event.date, 'd MMM')}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event detail drawer */}
      <AnimatePresence>
        {activeEvent && (
          <EventDrawer
            event={activeEvent}
            onClose={() => setActiveEvent(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
