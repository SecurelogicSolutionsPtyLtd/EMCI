import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

interface DashboardLetterheadProps {
  eyebrow: string;
  title: string;
  /** Optional badge rendered beside the title (e.g. status chip). */
  titleBadge?: React.ReactNode;
  subtitle?: React.ReactNode;
}

/** Official letterhead panel: primary top rule, eyebrow, title, and reporting meta. */
export function DashboardLetterhead({ eyebrow, title, titleBadge, subtitle }: DashboardLetterheadProps) {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-primary shadow-sm px-6 py-5 flex flex-wrap items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1.5">
          {eyebrow}
        </p>
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{title}</h2>
          {titleBadge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reporting as at</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5 tabular-nums">{today}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-200 rounded px-2 py-1 bg-slate-50">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Authorised access
        </p>
      </div>
    </motion.div>
  );
}
