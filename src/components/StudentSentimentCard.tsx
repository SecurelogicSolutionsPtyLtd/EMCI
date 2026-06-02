import { Loader2, Quote, TrendingUp, TrendingDown, Minus, RefreshCw, MessageSquareQuote } from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { useStudentSentiment, type SentimentValue, type SentimentQuote } from '../hooks/useStudentSentiment';

interface StudentSentimentCardProps {
  student:    Student;
  events:     TimelineEvent[];
  schoolName?: string;
}

const SENTIMENT_CONFIG: Record<
  Exclude<SentimentValue, 'insufficient_data'>,
  { label: string; bg: string; text: string; border: string; Icon: typeof TrendingUp }
> = {
  positive: { label: 'Mostly Positive', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', Icon: TrendingUp   },
  negative: { label: 'Needs Attention', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     Icon: TrendingDown },
  mixed:    { label: 'Mixed Signals',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   Icon: Minus        },
};

const QUOTE_STYLE: Record<SentimentQuote['sentiment'], { card: string; icon: string }> = {
  positive: { card: 'border-emerald-300 bg-emerald-50/40', icon: 'text-emerald-400' },
  negative: { card: 'border-red-300 bg-red-50/40',         icon: 'text-red-400'     },
  neutral:  { card: 'border-slate-200 bg-slate-50/40',     icon: 'text-slate-300'   },
};

function SentimentBadge({ sentiment }: { sentiment: Exclude<SentimentValue, 'insufficient_data'> }) {
  const cfg = SENTIMENT_CONFIG[sentiment];
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function QuoteCard({ quote }: { quote: SentimentQuote }) {
  const style = QUOTE_STYLE[quote.sentiment];
  const [source, ...rest] = quote.context.split(' — ');
  const field = rest.join(' — ');

  return (
    <div className={`flex gap-3 p-3.5 rounded-xl border-l-4 ${style.card}`}>
      <Quote className={`w-4 h-4 mt-0.5 shrink-0 ${style.icon}`} />
      <div className="min-w-0">
        <p className="text-sm text-slate-700 italic leading-relaxed">"{quote.text}"</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            {source}
          </span>
          {field && (
            <>
              <span className="text-[11px] text-slate-300">·</span>
              <span className="text-[11px] text-slate-400">{field}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentSentimentCard({ student, events, schoolName }: StudentSentimentCardProps) {
  const { state, generate } = useStudentSentiment(student, events, schoolName);

  // Silently suppress until the request has resolved one way or another.
  if (state.status === 'idle' || state.status === 'error') return null;

  const hasContent =
    state.status === 'success' && state.sentiment !== 'insufficient_data';
  const isInsufficient =
    state.status === 'success' && state.sentiment === 'insufficient_data';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquareQuote className="w-4 h-4 text-primary" />
          Student Voice &amp; Sentiment
        </h3>
        {hasContent && (
          <div className="flex items-center gap-3">
            <SentimentBadge sentiment={state.sentiment} />
            <button
              onClick={generate}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        )}
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center gap-3 px-4 py-5 rounded-xl bg-slate-50 border border-slate-100">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-slate-500">Analysing student voice and sentiment…</span>
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
            No student voice data yet
          </p>
          <p className="mt-1.5 text-sm text-slate-600 max-w-sm leading-relaxed">
            Sentiment analysis will appear here once survey responses or session
            feedback have been recorded for this student.
          </p>
        </div>
      )}

      {hasContent && (
        <div className="space-y-4">
          <p className="text-[15px] text-slate-700 leading-relaxed">
            {state.summary}
          </p>

          {state.quotes.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                In their own words
              </p>
              {state.quotes.map((q, i) => (
                <QuoteCard key={i} quote={q} />
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400 uppercase tracking-wide pt-1">
            AI-generated · For guidance purposes only
          </p>
        </div>
      )}
    </div>
  );
}
