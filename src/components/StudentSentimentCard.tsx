import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { useStudentSentiment, type SentimentValue, type SentimentQuote } from '../hooks/useStudentSentiment';
import { ReportCardHeader, ReportSectionHeading, ReportFooter } from './ReportCard';

interface StudentSentimentCardProps {
  student:    Student;
  events:     TimelineEvent[];
  schoolName?: string;
  /** Load cached sentiment only — no AI generation (inactive historical view). */
  loadStoredOnly?: boolean;
  /** Adjust labels when shown under inactive historical data. */
  historical?: boolean;
}

const SENTIMENT_CONFIG: Record<
  Exclude<SentimentValue, 'insufficient_data'>,
  { label: string; bg: string; text: string; border: string; dot: string; Icon: typeof TrendingUp }
> = {
  positive: { label: 'Mostly Positive', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', Icon: TrendingUp   },
  negative: { label: 'Needs Attention', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500',     Icon: TrendingDown },
  mixed:    { label: 'Mixed Signals',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   Icon: Minus        },
};

const QUOTE_STYLE: Record<SentimentQuote['sentiment'], { rule: string; tag: string; tagLabel: string }> = {
  positive: { rule: 'border-emerald-400', tag: 'bg-emerald-50 text-emerald-700 border-emerald-200', tagLabel: 'Positive' },
  negative: { rule: 'border-red-400',     tag: 'bg-red-50 text-red-700 border-red-200',             tagLabel: 'Follow Up'  },
  neutral:  { rule: 'border-slate-300',   tag: 'bg-slate-50 text-slate-500 border-slate-200',       tagLabel: 'Neutral'  },
};

function SentimentBadge({ sentiment }: { sentiment: Exclude<SentimentValue, 'insufficient_data'> }) {
  const cfg = SENTIMENT_CONFIG[sentiment];
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function QuoteCard({ quote, index }: { quote: SentimentQuote; index: number }) {
  const style = QUOTE_STYLE[quote.sentiment];
  const [source, ...rest] = quote.context.split(' — ');
  const field = rest.join(' — ');

  return (
    <div className={`relative rounded-lg border border-slate-200 bg-white border-l-4 ${style.rule} px-4 py-3.5`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Record {String(index + 1).padStart(2, '0')}
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="text-slate-500 normal-case tracking-normal font-semibold">{source}</span>
        </span>
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${style.tag}`}>
          {style.tagLabel}
        </span>
      </div>
      <p className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
      {field && (
        <p className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
          Source field: <span className="text-slate-500">{field}</span>
        </p>
      )}
    </div>
  );
}

export function StudentSentimentCard({
  student,
  events,
  schoolName,
  loadStoredOnly = false,
  historical = false,
}: StudentSentimentCardProps) {
  const { state, displayState, generate } = useStudentSentiment(student, events, schoolName, { loadStoredOnly });

  const hasContent =
    state.status === 'success' &&
    state.sentiment !== 'insufficient_data';
  // Before career guidance the hook never auto-generates, so `state` stays
  // `idle` — surface the empty state rather than an endless analysing spinner.
  const isTooEarly = !loadStoredOnly && displayState === 'too_early' && !hasContent;
  const isInsufficient =
    isTooEarly ||
    (state.status === 'success' && state.sentiment === 'insufficient_data');
  const isPending =
    !isTooEarly && (state.status === 'idle' || state.status === 'loading');

  return (
    <div className="h-full bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">

      <ReportCardHeader
        title="Student Voice & Sentiment"
        subtitle={
          historical
            ? 'Archived survey responses, session feedback & programme notes'
            : 'Recorded survey responses, session feedback & programme notes'
        }
      >
        {!loadStoredOnly && state.status === 'success' && state.sentiment !== 'insufficient_data' && (
          <>
            <SentimentBadge sentiment={state.sentiment} />
            <button
              onClick={generate}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </>
        )}
      </ReportCardHeader>

      <div className="p-6 flex-1">
        {loadStoredOnly && isPending && (
          <div className="flex items-center gap-3 px-4 py-5 rounded-lg bg-slate-50 border border-slate-100">
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            <span className="text-sm text-slate-500">Loading historical voice data…</span>
          </div>
        )}

        {isPending && !loadStoredOnly && (
          <div className="flex items-center gap-3 px-4 py-5 rounded-lg bg-slate-50 border border-slate-100">
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            <span className="text-sm text-slate-500">Analysing student voice and sentiment…</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center text-center px-4 py-6">
            <p className="text-base font-semibold text-slate-900">
              Sentiment analysis unavailable
            </p>
            <p className="mt-1.5 mb-4 text-sm text-slate-600 max-w-sm leading-relaxed">
              {state.message}
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        )}

        {isInsufficient && (
          <div className="flex flex-col items-center text-center px-4 py-6">
            <img
              src="/sentiment-empty-state.png"
              alt=""
              aria-hidden="true"
              className="w-28 h-28 mb-4 select-none pointer-events-none"
            />
            <p className="text-base font-semibold text-slate-900">
              {historical ? 'No historical voice data on record' : 'No student voice data on record'}
            </p>
            <p className="mt-1.5 text-sm text-slate-600 max-w-sm leading-relaxed">
              {historical
                ? 'No archived survey responses or session feedback were stored for this student.'
                : 'Sentiment analysis will appear here once survey responses or session feedback have been recorded for this student.'}
            </p>
          </div>
        )}

        {hasContent && (
          <div className="space-y-6">

            {/* ── Practitioner summary ── */}
            <div className="space-y-3">
              <ReportSectionHeading>Summary of Findings</ReportSectionHeading>
              <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3.5">
                <p className="text-[15px] text-slate-800 leading-relaxed">
                  {state.summary}
                </p>
              </div>
            </div>

            {/* ── Verbatim records ── */}
            {state.quotes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <ReportSectionHeading>In Their Own Words</ReportSectionHeading>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    {state.quotes.length} verbatim record{state.quotes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {state.quotes.map((q, i) => (
                    <QuoteCard key={i} quote={q} index={i} />
                  ))}
                </div>
              </div>
            )}

            <ReportFooter
              left="AI-Generated · For Guidance Purposes Only"
              right="Not an Official Assessment"
            />
          </div>
        )}
      </div>
    </div>
  );
}
