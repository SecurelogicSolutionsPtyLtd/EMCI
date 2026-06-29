import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { EMCI_BRAND } from '../../lib/programNaming';

// ── Shared auth UI ──────────────────────────────────────────────────────────────
// Used by both the sign-in screen (LoginPage) and the invite-acceptance screen
// (AuthConfirm) so the branded layout and form styling stay identical.

export const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-sm shadow-slate-900/[0.04] ' +
  'transition-all duration-300 ease-out focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ' +
  'focus:shadow-md focus:shadow-primary/10 hover:border-slate-300';

export const BTN_PRIMARY =
  'w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm ' +
  'shadow-lg shadow-primary/20 transition-all duration-300 ease-out hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 ' +
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden bg-[#F4F6F9]">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-[#F8FAFC] to-slate-100" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.65, 0.45] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[640px] h-[640px] rounded-full bg-primary/[0.07] blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute -bottom-48 -left-48 w-[560px] h-[560px] rounded-full bg-slate-900/[0.04] blur-3xl"
        />
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] h-[920px] rounded-full border border-slate-200/40"
        />
        <motion.div
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full border border-slate-200/30"
        />
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="relative w-full max-w-sm"
        >
          {/* Card glow */}
          <div className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-white/80 via-slate-200/40 to-slate-300/30 blur-sm" />
          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_2px_8px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.08),0_32px_64px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04]">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/30" />
            <div className="px-8 py-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center mb-7"
              >
                <img
                  src="/emci-logo-lockup.png"
                  alt={EMCI_BRAND}
                  className="h-11 w-auto object-contain drop-shadow-sm"
                  draggable={false}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="relative shrink-0 text-center py-5 text-[10px] text-slate-400 uppercase tracking-widest font-semibold"
      >
        {EMCI_BRAND} · SecureLogic Solutions · {new Date().getFullYear()}
      </motion.div>
    </div>
  );
}

export function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h1 className="text-lg font-black text-slate-900 tracking-tight">{title}</h1>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
    </motion.div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="flex items-start gap-2.5 bg-red-50/90 border border-red-200/80 rounded-xl px-4 py-3 mb-4 shadow-sm shadow-red-900/[0.06]"
    >
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-xs text-red-700 leading-relaxed">{message}</p>
    </motion.div>
  );
}
