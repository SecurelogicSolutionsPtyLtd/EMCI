import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { InsightDetailItem } from '../lib/studentInsights';

/**
 * Right-side slide-over panel shown when a Quick Insights tile is selected.
 * Official document style: slate header band with primary accent rule,
 * numbered record register, formal source footer.
 */

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface QuickInsightDetailPanelProps {
  open:    boolean;
  label:   string;
  value:   string;
  items:   InsightDetailItem[];
  onClose: () => void;
}

export function QuickInsightDetailPanel({
  open,
  label,
  value,
  items,
  onClose,
}: QuickInsightDetailPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="insight-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-40 cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            key="insight-panel"
            role="dialog"
            aria-label={`${label} records`}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-white border-l border-slate-200 z-50 flex flex-col shadow-xl"
          >
            {/* Header — official report band */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 bg-slate-50/70 border-b border-slate-200">
              <div className="border-l-4 border-primary pl-3 min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 leading-tight truncate">
                  {label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Quick Insight · {value}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close records panel"
                className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Records */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                {items.length} record{items.length === 1 ? '' : 's'} on file
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 leading-relaxed">
                  No records found in the student timeline for this insight.
                </p>
              ) : (
                <ol className="space-y-2.5">
                  {items.map((item, i) => (
                    <li
                      key={`${item.date}-${i}`}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex items-baseline gap-2 min-w-0">
                          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-400">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-medium text-slate-800 leading-snug">
                            {item.title}
                          </span>
                        </p>
                        <span className="shrink-0 text-[11px] tabular-nums text-slate-400 leading-snug pt-0.5">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      {item.note && (
                        <p className="mt-1.5 pl-6 text-xs text-slate-500 leading-relaxed">
                          {item.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Source: Student Activity Timeline
              </p>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                EMCI Record
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
