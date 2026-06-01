import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { ProfileSnapshot } from './ProfileSnapshot';
import type { Student } from '../data/studentsData';

export interface StudentJourneyModalProps {
  displayStudent: Student | null;
  schoolName?: string;
  hidePii?: boolean;
  onClose: () => void;
}

export function StudentJourneyModal({
  displayStudent,
  schoolName,
  hidePii = false,
  onClose,
}: StudentJourneyModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* ── Backdrop ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 flex items-center justify-center p-6 cursor-pointer"
        onClick={onClose}
      >
        {/* ── Modal ── */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm max-h-[88vh] bg-white rounded-2xl shadow-[0_12px_56px_rgba(0,0,0,0.22)] z-50 flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Student Profile</span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Content ── */}
          <div className="overflow-y-auto">
            <ProfileSnapshot
              student={displayStudent}
              schoolName={schoolName}
              hidePii={hidePii}
            />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
