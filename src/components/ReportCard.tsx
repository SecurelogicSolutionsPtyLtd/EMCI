import type { ReactNode } from 'react';

/**
 * Shared primitives for the official document-style cards used on the
 * student journey page (Analysis Summary, Quick Insights, Student Voice
 * & Sentiment). Mirrors the PDF report concept: left-accent rules,
 * uppercase registry headings, and formal disclaimers.
 */

interface ReportCardHeaderProps {
  title:     string;
  subtitle?: string;
  /** Right-aligned actions (badges, refresh buttons). */
  children?: ReactNode;
}

export function ReportCardHeader({ title, subtitle, children }: ReportCardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 bg-slate-50/70 border-b border-slate-200">
      <div className="border-l-4 border-primary pl-3 min-w-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 leading-tight truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 shrink-0">{children}</div>
      )}
    </div>
  );
}

export function ReportSectionHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-l-4 border-primary pl-3 leading-none py-0.5">
      {children}
    </h4>
  );
}

/**
 * Lighter sibling of {@link ReportSectionHeading} for in-card sub-sections —
 * a small primary marker instead of the full accent rule, so dense areas
 * (header card, tiles, chips) nod to the document style without repeating it.
 */
export function ReportEyebrow({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span className="w-1.5 h-1.5 rounded-[1px] bg-primary shrink-0" />
        {children}
      </p>
      {right && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{right}</span>
      )}
    </div>
  );
}

interface ReportFooterProps {
  left:   string;
  right?: string;
}

export function ReportFooter({ left, right }: ReportFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{left}</p>
      {right && (
        <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">{right}</p>
      )}
    </div>
  );
}
